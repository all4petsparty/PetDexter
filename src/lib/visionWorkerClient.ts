"use client";

import type { ClassifyResult, ProgressCallback } from "@/lib/vision";

/**
 * Main-thread client for vision.worker.ts. Every heavy Transformers.js call
 * (classification, background removal, DINOv2 embedding) is routed through
 * here so it runs on the worker thread and can never block this one — see
 * vision.worker.ts for why that matters.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: unknown) => void }>();

let progressListener: ProgressCallback | null = null;
export function onModelProgress(cb: ProgressCallback | null) {
  progressListener = cb;
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./vision.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      const { id, ok, type, pct, ...rest } = e.data ?? {};
      if (type === "progress") {
        progressListener?.(pct);
        return;
      }
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (ok) p.resolve(rest);
      else p.reject(new Error(rest.error ?? "vision worker error"));
    };
  }
  return worker;
}

function call<T>(type: string, dataUrl?: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, type, dataUrl });
  });
}

/** Kick off all model downloads in the worker (called from onboarding + capture tab). */
export function preloadModels() {
  call("preload").catch(() => {});
}

/** Stage 1 (fast): species/breed classification + screen anti-spoofing. */
export async function classifyFrame(dataUrl: string): Promise<ClassifyResult> {
  const { result } = await call<{ result: ClassifyResult }>("classify", dataUrl);
  return result;
}

/** Stage 2: cut the pet out of the photo (transparent sticker). */
export async function segmentPet(dataUrl: string): Promise<string | null> {
  try {
    const { cutoutUrl } = await call<{ cutoutUrl: string | null }>("segment", dataUrl);
    return cutoutUrl;
  } catch (err) {
    console.warn("[petdexter] cutout failed, falling back to full photo:", err);
    return null;
  }
}

/** Stage 3: 384-d L2-normalized DINOv2 signature (see vision.worker.ts). */
export async function embedSignature(dataUrl: string): Promise<number[]> {
  const { signature } = await call<{ signature: number[] }>("embed", dataUrl);
  return signature;
}
