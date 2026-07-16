"use client";

import { useEffect, useRef, useState } from "react";
import Portal from "@/components/Portal";
import { connectWithOwner, parseConnectPayload, type ConnectResult } from "@/lib/connections";

/**
 * "Scan PetDex QR" (spec §7) — reads another user's Pet Family QR code via
 * the camera (jsqr, frame-by-frame) with a manual-entry fallback for when
 * the camera isn't available or the code was shared as text. Free: no
 * Discovery Snack is spent, matching the spec's QR-exchange row.
 */
export default function ScanConnect({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConnectResult | null>(null);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let raf: number;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) videoRef.current.srcObject = stream;
        const jsQR = (await import("jsqr")).default;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        const tick = () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(frame.data, frame.width, frame.height);
            if (code) { handleScanned(code.data); return; }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setCameraError("Camera unavailable — enter the code manually below.");
      }
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleScanned(raw: string) {
    const ownerId = parseConnectPayload(raw);
    if (!ownerId) return; // not a PetDexter code — keep scanning
    await runConnect(ownerId);
  }

  async function runConnect(ownerId: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await connectWithOwner(ownerId);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't connect — try again.");
    }
    setBusy(false);
  }

  function submitManual() {
    const ownerId = parseConnectPayload(manualCode);
    if (!ownerId) { setError("That doesn't look like a PetDexter connect code."); return; }
    runConnect(ownerId);
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[75] flex items-center justify-center bg-ink/80 p-5 backdrop-blur-sm" onClick={onClose}>
        <div
          className="animate-pop-in flex w-full max-w-sm flex-col gap-4 rounded-card bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-center text-2xl font-extrabold">Scan PetDex QR 🔗</h2>

          {result ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-5xl">🤝</span>
              <p className="text-lg font-extrabold">Connected with {result.ownerName}!</p>
              <p className="text-sm font-semibold text-ink/60">
                {result.imported > 0
                  ? `${result.imported} ${result.imported === 1 ? "pet" : "pets"} added to your PetDex.`
                  : "No new pets to add right now."}
                {result.skipped > 0 && ` (${result.skipped} already connected.)`}
              </p>
            </div>
          ) : (
            <>
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-ink">
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm font-bold text-white">
                    {cameraError}
                  </div>
                )}
                <div className="pointer-events-none absolute inset-8 rounded-2xl border-4 border-dashed border-sunny/80" />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-ink/40">Or enter a code</span>
                <div className="flex gap-2">
                  <input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="petdexter:connect:…"
                    className="flex-1 rounded-full border-2 border-sunny bg-cream px-4 py-2 text-sm font-bold outline-none focus:border-tangerine"
                  />
                  <button type="button" disabled={busy} onClick={submitManual}
                    className="tappable rounded-full bg-tangerine px-4 py-2 text-sm font-extrabold text-white shadow-sm disabled:opacity-40">
                    Connect
                  </button>
                </div>
              </div>

              {error && <p className="text-center text-sm font-bold text-tangerine-deep">{error}</p>}
              {busy && <p className="text-center text-sm font-bold text-ink/50">Connecting…</p>}
            </>
          )}

          <button type="button" onClick={onClose} className="tappable rounded-full bg-cream px-6 py-3 font-extrabold text-ink shadow-sm">
            {result ? "Done" : "Cancel"}
          </button>
        </div>
      </div>
    </Portal>
  );
}
