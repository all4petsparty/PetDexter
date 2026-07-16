"use client";

import { useEffect, useState } from "react";
import Portal from "@/components/Portal";

export interface AdSponsor {
  brand: string;
  tagline: string;
  emoji: string;
}

const AD_SECONDS = 6;

/**
 * Full-screen rewarded-ad placement — a real ad unit (AdMob/Ad Manager web
 * rewarded API) drops into the marked slot later. Unlike a dismissible
 * modal, this takes over the whole screen and always finishes on its own
 * after AD_SECONDS: there's no skip/close, matching a rewarded-ad contract.
 * Callers decide what "done" means (auto-grant, or reveal a claim button)
 * via onFinish — this component only owns the countdown and the takeover.
 */
export default function FullScreenAd({
  onFinish,
  sponsor,
}: {
  onFinish: () => void;
  sponsor?: AdSponsor;
}) {
  const [secondsLeft, setSecondsLeft] = useState(AD_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onFinish();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const progress = ((AD_SECONDS - secondsLeft) / AD_SECONDS) * 100;

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] flex flex-col bg-ink text-white">
        <div
          className="flex items-center gap-3 px-4"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-sunny transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-6 text-right text-sm font-extrabold tabular-nums">{secondsLeft}s</span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="text-xs font-extrabold uppercase tracking-widest text-white/40">
            {sponsor ? `Sponsored by ${sponsor.brand}` : "Sponsored break"}
          </span>
          {/* AdMob / Ad Manager rewarded video unit renders here */}
          <span className="animate-pulse text-7xl">{sponsor?.emoji ?? "🎬"}</span>
          <p className="font-bold text-white/70">{sponsor ? sponsor.tagline : "Your ad is playing…"}</p>
        </div>
      </div>
    </Portal>
  );
}
