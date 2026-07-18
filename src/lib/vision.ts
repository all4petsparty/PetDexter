import type { Species } from "@/lib/store";

/**
 * Main-thread-only helpers: cheap canvas/video frame grabbing. The actual
 * AI inference (classification, background removal, DINOv2 feature
 * extraction) runs inside a Web Worker — see vision.worker.ts and
 * visionWorkerClient.ts — because a single WASM inference call blocks the
 * calling JS thread for seconds at a time, and a blocked main thread also
 * stops processing touch/click/keyboard events entirely (that's true
 * regardless of `await`/"background" framing — one long synchronous task
 * blocks everything else queued on that thread).
 */

export const SIGNATURE_DIM = 384; // DINOv2-small CLS token

export interface ClassifyResult {
  ok: boolean;
  reason?: "no_animal" | "screen_detected" | "too_still";
  species: Species;
  breed: string | null;
  confidence: number;
}

export type ProgressCallback = (pct: number) => void;

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

/** Liveness heuristic: two frames ~650ms apart must differ (live scene). */
export async function checkLiveness(video: HTMLVideoElement): Promise<boolean> {
  const sample = () => {
    const c = document.createElement("canvas");
    c.width = 32; c.height = 32;
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
  return diff / 1024 >= 0.8;
}

/** Cosine similarity (vectors are already L2-normalized). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
