import type { Species } from "@/lib/store";

/**
 * On-device AI pipeline (Transformers.js) — zero backend compute.
 *  - image-classification (ViT, ImageNet-1k): species + breed best-guess,
 *    plus screen/monitor detection for anti-spoofing
 *  - image-feature-extraction (ViT in21k): 768-d CLS embedding, the pet's
 *    unique signature matched with pgvector cosine similarity server-side
 */

// ImageNet-1k class-index ranges per species (index-based beats string matching)
const SPECIES_RANGES: [Species, [number, number][]][] = [
  ["bird", [[7, 24], [80, 100], [127, 146]]],
  ["dog", [[151, 268]]],
  ["cat", [[281, 285]]],
  ["rabbit", [[330, 332]]],
];

// Labels that indicate the camera is pointed at a device, not a live animal
const SPOOF_WORDS = [
  "monitor", "screen", "television", "laptop", "desktop computer",
  "notebook", "cellular", "ipod", "projector", "web site", "hand-held computer",
];

export interface ScanResult {
  ok: boolean;
  reason?: "no_animal" | "screen_detected" | "too_still";
  species: Species;
  breed: string | null;
  confidence: number;
  signature: number[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let classifierPromise: Promise<any> | null = null;
let extractorPromise: Promise<any> | null = null;
let segmenterPromise: Promise<any> | null = null;

async function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("image-classification", "Xenova/vit-base-patch16-224", { dtype: "q8" })
    );
  }
  return classifierPromise;
}

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("image-feature-extraction", "Xenova/vit-base-patch16-224-in21k", { dtype: "q8" })
    );
  }
  return extractorPromise;
}

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("background-removal", "briaai/RMBG-1.4", {
        dtype: "q8",
        // RMBG-1.4's config.json declares a bogus model_type; it's an ISNet
        // architecture, which Transformers.js supports natively
        config: { model_type: "isnet" } as any,
      })
    );
  }
  return segmenterPromise;
}

/** Kick off model downloads early (called when the Capture tab opens). */
export function preloadModels() {
  getClassifier().catch(() => {});
  getExtractor().catch(() => {});
  getSegmenter().catch(() => {});
}

/**
 * Cut the pet out of its photo (on-device background removal, RMBG-1.4).
 * Returns a transparent WebP/PNG data URL — the "sticker" used on cards
 * and in the collection book. Returns null if segmentation fails.
 */
export async function segmentPet(dataUrl: string): Promise<string | null> {
  try {
    const segmenter = await getSegmenter();
    const output = await segmenter(dataUrl);
    // background-removal returns RawImage(s) with the alpha matte applied
    const raw = Array.isArray(output) ? output[0] : output;
    if (!raw) return null;

    const canvas = document.createElement("canvas");
    canvas.width = raw.width;
    canvas.height = raw.height;
    const ctx = canvas.getContext("2d")!;
    if (typeof raw.toCanvas === "function") {
      ctx.drawImage(raw.toCanvas(), 0, 0);
    } else {
      const pixels = ctx.createImageData(raw.width, raw.height);
      pixels.data.set(raw.data);
      ctx.putImageData(pixels, 0, 0);
    }

    // Trim transparent borders so the sticker hugs the pet
    const trimmed = trimTransparent(canvas);
    // WebP keeps alpha and is ~4x smaller than PNG in localStorage
    const webp = trimmed.toDataURL("image/webp", 0.82);
    return webp.startsWith("data:image/webp") ? webp : trimmed.toDataURL("image/png");
  } catch (err) {
    console.warn("[petcatch] cutout failed, card falls back to full photo:", err);
    return null;
  }
}

function trimTransparent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
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
  if (maxX <= minX || maxY <= minY) return canvas; // fully transparent — keep as is
  const pad = 6;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")!.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** Load an image URL into a downscaled JPEG data URL (demo scans). */
export async function imageToDataUrl(src: string, maxSide = 512): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function grabFrame(video: HTMLVideoElement, maxSide = 512): string {
  const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * Liveness heuristic: sample two frames ~650 ms apart, compare downsampled
 * grayscale. A live scene (breathing animal + handheld phone) always has some
 * motion; near-zero diff suggests a paused screen or printed photo on a stand.
 */
export async function checkLiveness(video: HTMLVideoElement): Promise<boolean> {
  const sample = () => {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    c.getContext("2d")!.drawImage(video, 0, 0, 32, 32);
    const { data } = c.getContext("2d")!.getImageData(0, 0, 32, 32);
    const gray = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }
    return gray;
  };

  const a = sample();
  await new Promise((r) => setTimeout(r, 650));
  const b = sample();

  let diff = 0;
  for (let i = 0; i < 1024; i++) diff += Math.abs(a[i] - b[i]);
  return diff / 1024 >= 0.8; // mean per-pixel delta threshold (0–255 scale)
}

function titleCase(label: string): string {
  return label
    .split(",")[0]
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Classify species/breed + extract the 768-d signature, all in-browser. */
export async function analyzeFrame(dataUrl: string): Promise<ScanResult> {
  const [classifier, extractor] = await Promise.all([getClassifier(), getExtractor()]);

  const preds: { label: string; score: number }[] = await classifier(dataUrl, { top_k: 10 });

  // Reverse-map labels to ImageNet indices for robust species bucketing
  const id2label: Record<string, string> = classifier.model.config.id2label ?? {};
  const labelToId = new Map(Object.entries(id2label).map(([id, l]) => [l, Number(id)]));

  const speciesScores = new Map<Species, { score: number; best: string; bestScore: number }>();
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
        if (score > cur.bestScore) {
          cur.best = label;
          cur.bestScore = score;
        }
        speciesScores.set(species, cur);
      }
    }
  }

  let species: Species = "other";
  let breed: string | null = null;
  let confidence = 0;
  for (const [s, v] of speciesScores) {
    if (v.score > confidence) {
      confidence = v.score;
      species = s;
      breed = titleCase(v.best);
    }
  }

  const fail = (reason: ScanResult["reason"]): ScanResult => ({
    ok: false, reason, species, breed, confidence, signature: [],
  });

  if (spoofScore > 0.3 && spoofScore > confidence) return fail("screen_detected");
  if (confidence < 0.15) return fail("no_animal");

  // 768-d CLS embedding, L2-normalized so cosine similarity is well-behaved
  const output = await extractor(dataUrl);
  const cls = Array.from(output.data.slice(0, 768) as Float32Array);
  const norm = Math.hypot(...cls) || 1;
  const signature = cls.map((v) => v / norm);

  return { ok: true, species, breed, confidence, signature };
}

/** Cosine similarity for the local (offline/demo) uniqueness fallback. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are already L2-normalized
}
