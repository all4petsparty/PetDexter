"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import Portal from "@/components/Portal";
import { myConnectPayload } from "@/lib/connections";

/**
 * Pet Family Calling Card (spec §15) — shows a QR code another PetDexter
 * user can scan to connect with this account and import the pets marked
 * shareable (currently: every My Pet, all set to "public" visibility on
 * creation — a per-pet share toggle is a fast-follow).
 */
export default function PetFamilyCard({ onClose }: { onClose: () => void }) {
  const authUser = useAppStore((s) => s.authUser);
  const collection = useAppStore((s) => s.collection);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const myPets = collection.filter((c) => c.owned);
  const synced = myPets.filter((c) => c.remoteId);
  const payload = myConnectPayload();

  useEffect(() => {
    if (!payload || !canvasRef.current) return;
    import("qrcode")
      .then((QRCode) => QRCode.toCanvas(canvasRef.current!, payload, { width: 240, margin: 1, color: { dark: "#2d2a32", light: "#fffaf0" } }))
      .catch(() => setError("Couldn't render the QR code."));
  }, [payload]);

  return (
    <Portal>
      <div className="fixed inset-0 z-[75] flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm" onClick={onClose}>
        <div
          className="animate-pop-in flex w-full max-w-sm flex-col items-center gap-4 rounded-card bg-white p-6 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-extrabold">Pet Family Card 🪪</h2>

          {!authUser ? (
            <p className="text-sm font-semibold text-ink/60">Sign in to get a scannable Pet Family QR code.</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink/60">
                {authUser.name ?? authUser.email?.split("@")[0] ?? "Pet Trainer"}'s calling card — anyone who scans this connects with you for free.
              </p>
              <div className="rounded-2xl border-4 border-sunny bg-cream p-3">
                {error ? <p className="p-8 text-sm font-bold text-tangerine-deep">{error}</p> : <canvas ref={canvasRef} />}
              </div>
              <p className="text-xs font-bold text-ink/50">
                Sharing {synced.length} of {myPets.length} My {myPets.length === 1 ? "Pet" : "Pets"}
                {myPets.length > synced.length && " — the rest are still syncing"}
              </p>
              {myPets.length === 0 && (
                <p className="rounded-2xl bg-tangerine/10 px-4 py-3 text-xs font-bold text-tangerine-deep">
                  Add a My Pet first so you have something to share!
                </p>
              )}
            </>
          )}

          <button type="button" onClick={onClose} className="tappable mt-1 w-full rounded-full bg-grass px-6 py-3 font-extrabold text-white shadow-md">
            Done
          </button>
        </div>
      </div>
    </Portal>
  );
}
