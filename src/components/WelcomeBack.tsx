"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  ACHIEVEMENTS, currentCans, claimAchievement, grantCans,
  buyCanWithCoins, CAN_COIN_COST, MAX_CANS,
} from "@/lib/economy";
import Portal from "@/components/Portal";
import RewardedAd from "@/components/RewardedAd";

/** Cans at or below this count trigger the restock nudge. */
const LOW_CANS = 1;
const SESSION_KEY = "pc_welcomed_session";

/**
 * "Welcome back" nudge shown once per app open (fresh session): surfaces the
 * next unfinished mission and, when snack cans or coins are low, prompts a
 * restock via rewarded video or coins. Renders after the entry gates.
 */
export default function WelcomeBack() {
  const collection = useAppStore((s) => s.collection);
  const coins = useAppStore((s) => s.coins);
  const claimed = useAppStore((s) => s.claimedAchievements);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const authUser = useAppStore((s) => s.authUser);
  const guestImportDoneFor = useAppStore((s) => s.guestImportDoneFor);

  const [open, setOpen] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [claimNote, setClaimNote] = useState<string | null>(null);

  // Decide once, shortly after the app becomes interactive
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    // don't collide with the first-sign-in guest-import prompt
    const importPending =
      authUser && collection.length > 0 && guestImportDoneFor !== authUser.id;
    if (importPending) return;

    const t = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setOpen(true);
    }, 700);
    return () => clearTimeout(t);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const { count: cans, nextRefillMs } = currentCans();
  const lowCans = cans <= LOW_CANS;
  const canAfford = coins >= CAN_COIN_COST;

  // next unfinished mission = first unclaimed achievement
  const mission = ACHIEVEMENTS.find((a) => !claimed.includes(a.id));
  const missionReached = mission ? collection.length >= mission.goal : false;
  const missionProgress = mission ? Math.min(collection.length, mission.goal) : 0;

  const close = () => setOpen(false);

  function goCatch() {
    close();
    setActiveView("capture");
  }

  function handleClaim() {
    if (!mission) return;
    if (claimAchievement(mission)) {
      setClaimNote(`Claimed ${mission.rewardLabel}! 🎁`);
      setTimeout(close, 1200);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm" onClick={close}>
        <div
          className="animate-pop-in flex w-full max-w-sm flex-col gap-4 rounded-card bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <span className="text-5xl">🐾</span>
            <h2 className="mt-1 text-2xl font-extrabold">Welcome back, trainer!</h2>
          </div>

          {/* Low-cans / low-coins restock nudge (priority) */}
          {lowCans && (
            <div className="flex flex-col gap-3 rounded-2xl bg-tangerine/15 p-4">
              <p className="text-sm font-bold text-ink/80">
                🥫 You&apos;re running low on snack cans (<b>{cans}/{MAX_CANS}</b>)!{" "}
                {canAfford
                  ? "Restock with a quick video or spend some coins."
                  : "Watch a short video to restock and keep catching."}
                {nextRefillMs != null && !canAfford && cans === 0 && " Free cans also refill over time."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAd(true)}
                  className="tappable flex-1 rounded-full bg-tangerine px-4 py-3 text-sm font-extrabold text-white shadow-md"
                >
                  🎬 Watch video
                </button>
                {canAfford && (
                  <button
                    type="button"
                    onClick={() => { if (buyCanWithCoins()) setClaimNote("+1 can! 🥫"); }}
                    className="tappable flex-1 rounded-full bg-sunny px-4 py-3 text-sm font-extrabold text-ink shadow-md"
                  >
                    Buy 1 · {CAN_COIN_COST}🪙
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Next mission */}
          {mission ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-cream p-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-tangerine-deep">
                {missionReached ? "Mission complete!" : "Your next mission"}
              </p>
              <p className="font-extrabold">
                {missionReached ? `${mission.title} 🏆` : `Ready to: ${mission.blurb}`}
              </p>
              <div className="flex items-center gap-2">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${missionReached ? "bg-grass" : "bg-sunny-deep"}`}
                    style={{ width: `${(missionProgress / mission.goal) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-ink/50">{missionProgress}/{mission.goal}</span>
              </div>
              <button
                type="button"
                onClick={missionReached ? handleClaim : goCatch}
                className="tappable mt-1 rounded-full bg-grass px-4 py-3 font-extrabold text-white shadow-md"
              >
                {missionReached ? `Claim ${mission.rewardLabel} 🎁` : "Start catching 📸"}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-grass/15 p-4 text-center font-bold text-grass-deep">
              🌟 All missions complete — you&apos;re a legend! Go catch more friends.
            </div>
          )}

          {claimNote && (
            <p className="animate-pop-in rounded-2xl bg-sunny/40 px-4 py-2 text-center text-sm font-bold">{claimNote}</p>
          )}

          <button type="button" onClick={close} className="text-sm font-bold text-ink/40">
            Maybe later
          </button>
        </div>
      </div>

      {showAd && (
        <RewardedAd
          rewardLabel="1 snack can"
          onComplete={() => { grantCans(1); setClaimNote("+1 can! 🥫"); }}
          onClose={() => setShowAd(false)}
        />
      )}
    </Portal>
  );
}
