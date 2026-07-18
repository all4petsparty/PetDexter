// @ts-nocheck
/**
 * Runs the heavy Transformers.js pipelines (species classification,
 * background removal, DINOv2 feature extraction) off the main thread.
 *
 * Why this file exists: a single WASM inference call blocks its calling
 * JS thread for several seconds. When that call ran on the main thread,
 * the whole page froze for the duration — no touches, taps, or keystrokes
 * processed at all, "background" `await`ed call or not, because one long
 * synchronous task blocks everything else queued on that thread. Moving
 * the pipelines here means the main thread (and the camera preview, and
 * the name-entry UI right after a capture) stays responsive no matter how
 * long a model takes to run.
 *
 * Uses OffscreenCanvas/createImageBitmap instead of document/Image since
 * neither exists in a worker. Type-checking is disabled for this file
 * (worker global scope conflicts with the project's "dom" lib) — it's
 * still fully compiled/bundled by webpack like any other module.
 */

import { pipeline } from "@huggingface/transformers";

const SPECIES_RANGES = [
  ["bird", [[7, 24], [80, 100], [127, 146]]],
  ["dog", [[151, 268]]],
  ["cat", [[281, 285]]],
  ["rabbit", [[330, 332]]],
];

const SPOOF_WORDS = [
  "monitor", "screen", "television", "laptop", "desktop computer",
  "notebook", "cellular", "ipod", "projector", "web site", "hand-held computer",
];

let classifierPromise = null;
let extractorPromise = null;
let segmenterPromise = null;

const fileProgress = new Map();
function trackProgress(p) {
  if (p?.status === "progress" && p.file) {
    fileProgress.set(p.file, p.progress ?? 0);
    const vals = [...fileProgress.values()];
    const pct = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    postMessage({ type: "progress", pct });
  }
}

function getClassifier() {
  classifierPromise ??= pipeline("image-classification", "Xenova/vit-base-patch16-224", {
    dtype: "q8", progress_callback: trackProgress,
  });
  return classifierPromise;
}
function getExtractor() {
  extractorPromise ??= pipeline("image-feature-extraction", "Xenova/dinov2-small", {
    dtype: "q8", progress_callback: trackProgress,
  });
  return extractorPromise;
}
function getSegmenter() {
  // RMBG-1.4 ships a bogus model_type; it's really an ISNet.
  segmenterPromise ??= pipeline("background-removal", "briaai/RMBG-1.4", {
    dtype: "q8", progress_callback: trackProgress, config: { model_type: "isnet" },
  });
  return segmenterPromise;
}

function titleCase(label) {
  return label.split(",")[0].split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Stage 1 (fast): species/breed classification + screen anti-spoofing. */
async function classify(dataUrl) {
  const classifier = await getClassifier();
  const preds = await classifier(dataUrl, { top_k: 10 });

  const id2label = classifier.model.config.id2label ?? {};
  const labelToId = new Map(Object.entries(id2label).map(([id, l]) => [l, Number(id)]));

  const speciesScores = new Map();
  let spoofScore = 0;
  for (const { label, score } of preds) {
    if (SPOOF_WORDS.some((w) => label.toLowerCase().includes(w))) {
      spoofScore += score;
      continue;
    }
    const idx = labelToId.get(label);
    if (idx === undefined) continue;
    for (const [species, ranges] of SPECIES_RANGES) {
      if (ranges.some(([lo, hi]) => idx >= lo && idx <= hi)) {
        const cur = speciesScores.get(species) ?? { score: 0, best: label, bestScore: 0 };
        cur.score += score;
        if (score > cur.bestScore) { cur.best = label; cur.bestScore = score; }
        speciesScores.set(species, cur);
      }
    }
  }

  let species = "other";
  let breed = null;
  let confidence = 0;
  for (const [s, v] of speciesScores) {
    if (v.score > confidence) { confidence = v.score; species = s; breed = titleCase(v.best); }
  }

  if (spoofScore > 0.3 && spoofScore > confidence)
    return { ok: false, reason: "screen_detected", species, breed, confidence };
  if (confidence < 0.10)
    return { ok: false, reason: "no_animal", species, breed, confidence };
  return { ok: true, species, breed, confidence };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function canvasToDataUrl(canvas, type, quality) {
  const blob = await canvas.convertToBlob({ type, quality });
  return blobToDataUrl(blob);
}

function trimTransparent(canvas) {
  const ctx = canvas.getContext("2d");
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return canvas;
  const pad = 6;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
  const out = new OffscreenCanvas(maxX - minX + 1, maxY - minY + 1);
  out.getContext("2d").drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** Stage 2: cut the pet out of the photo (transparent sticker). */
async function segment(dataUrl) {
  try {
    const segmenter = await getSegmenter();
    const output = await segmenter(dataUrl);
    const raw = Array.isArray(output) ? output[0] : output;
    if (!raw) return null;

    const canvas = new OffscreenCanvas(raw.width, raw.height);
    const ctx = canvas.getContext("2d");
    if (typeof raw.toCanvas === "function") {
      ctx.drawImage(raw.toCanvas(), 0, 0);
    } else {
      // respect the source channel count — a stride mismatch here smears
      // the whole image into diagonal streaks
      const ch = raw.channels ?? 4;
      const pixels = ctx.createImageData(raw.width, raw.height);
      const n = raw.width * raw.height;
      for (let i = 0; i < n; i++) {
        pixels.data[i * 4] = raw.data[i * ch];
        pixels.data[i * 4 + 1] = raw.data[i * ch + (ch > 1 ? 1 : 0)];
        pixels.data[i * 4 + 2] = raw.data[i * ch + (ch > 2 ? 2 : 0)];
        pixels.data[i * 4 + 3] = ch === 4 ? raw.data[i * 4 + 3] : 255;
      }
      ctx.putImageData(pixels, 0, 0);
    }

    // Sanity check: a healthy matte has real foreground AND background.
    // Degenerate output (all-opaque, all-clear) → keep the original photo.
    const probe = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = 0;
    const total = canvas.width * canvas.height;
    for (let i = 3; i < probe.length; i += 4) if (probe[i] > 32) opaque++;
    const ratio = opaque / total;
    if (ratio < 0.02 || ratio > 0.98) return null;

    const trimmed = trimTransparent(canvas);
    const webp = await canvasToDataUrl(trimmed, "image/webp", 0.82);
    return webp.startsWith("data:image/webp") ? webp : await canvasToDataUrl(trimmed, "image/png");
  } catch {
    return null;
  }
}

async function flattenOnGray(dataUrl) {
  const res = await fetch(dataUrl);
  const bitmap = await createImageBitmap(await res.blob());
  const c = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bitmap, 0, 0);
  return canvasToDataUrl(c, "image/jpeg", 0.9);
}

/**
 * Stage 3: 384-d L2-normalized DINOv2 signature. Feed it the CUTOUT so the
 * background can't pollute the identity (falls back to the full frame).
 */
async function embed(imageDataUrl) {
  const extractor = await getExtractor();
  const input = imageDataUrl.startsWith("data:image/webp") || imageDataUrl.startsWith("data:image/png")
    ? await flattenOnGray(imageDataUrl)
    : imageDataUrl;
  const output = await extractor(input);
  const dim = output.dims[2];
  const cls = Array.from(output.data.slice(0, dim));
  const norm = Math.hypot(...cls) || 1;
  return cls.map((v) => v / norm);
}

self.onmessage = async (e) => {
  const { id, type, dataUrl } = e.data ?? {};
  try {
    if (type === "preload") {
      await Promise.allSettled([getClassifier(), getSegmenter(), getExtractor()]);
      postMessage({ id, ok: true });
    } else if (type === "classify") {
      const result = await classify(dataUrl);
      postMessage({ id, ok: true, result });
    } else if (type === "segment") {
      const cutoutUrl = await segment(dataUrl);
      postMessage({ id, ok: true, cutoutUrl });
    } else if (type === "embed") {
      const signature = await embed(dataUrl);
      postMessage({ id, ok: true, signature });
    }
  } catch (err) {
    postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
