"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";

const REJECT_TEXT: Record<string, string> = {
  screen_detected: "That looks like a screen — PetDexter only counts real-life friends! 📺",
  no_animal: "No pet found in the shot — aim for a dog, cat, rabbit, or bird! 🔍",
  too_still: "Too still — find a live, wiggly friend! 🖼️",
  error: "The treat rolled away — try another toss! 😵",
};

function Sparkles({ count = 10 }: { count?: number }) {
  const stars = useMemo(
    () => Array.from({ length: count }, () => ({
      left: 8 + Math.random() * 84, top: 4 + Math.random() * 88,
      delay: Math.random() * 1.4, size: 12 + Math.random() * 14,
      char: Math.random() < 0.5 ? "✦" : "★",
    })),
    [count]
  );
  return (
    <>
      {stars.map((s, i) => (
        <span key={i} className="pointer-events-none absolute animate-twinkle text-sunny drop-shadow"
          style={{ left: `${s.left}%`, top: `${s.top}%`, fontSize: s.size, animationDelay: `${s.delay}s` }}>
          {s.char}
        </span>
      ))}
    </>
  );
}

/**
 * Fast capture reveal: ~2s brew → collector card with the photo and name.
 * The outcome line is shown only once background processing resolves the
 * REAL result (new meeting vs. reunion vs. already-met-today) — never
 * guessed upfront. Once a meeting resolves as genuinely new, the name
 * prompt (spec §9) appears right here so learning the pet's real name is
 * part of the capture moment, not a follow-up chore in the PetDex.
 */
export default function CardReveal() {
  const flow = useAppStore((s) => s.captureFlow);
  const setCaptureFlow = useAppStore((s) => s.setCaptureFlow);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const updateCard = useAppStore((s) => s.updateCard);
  const [nameDraft, setNameDraft] = useState("");
  const [namePrompted, setNamePrompted] = useState(false);
  const cardId = flow?.card?.id;
  // Reset the name-prompt state for each new capture (component stays mounted between captures)
  useEffect(() => {
    setNameDraft("");
    setNamePrompted(false);
  }, [cardId]);
  if (!flow) return null;

  const dismiss = () => setCaptureFlow(null);

  if (flow.status === "brewing") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-ink/85 p-6 backdrop-blur-md">
        <div className="relative flex h-56 w-56 items-center justify-center">
          <Sparkles count={14} />
          <span className="animate-bob text-8xl">🍲</span>
          <span className="absolute -top-2 animate-wiggle text-4xl">✨</span>
        </div>
        <p className="animate-pulse text-xl font-extrabold text-white">Meeting your new friend…</p>
      </div>
    );
  }

  if (flow.status === "rejected") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm">
        <div className="animate-pop-in flex w-full max-w-sm flex-col items-center gap-3 rounded-card bg-white p-8 text-center shadow-2xl">
          <span className="text-6xl">😿</span>
          <p className="text-lg font-extrabold">{REJECT_TEXT[flow.reason ?? "error"]}</p>
          <button type="button" onClick={dismiss}
            className="tappable rounded-full bg-grass px-8 py-3 font-extrabold text-white shadow-md">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const card = flow.card!;
  const r = flow.resolution;
  const showNamePrompt = r?.kind === "new" && !card.nameConfirmed && !namePrompted;

  function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed) updateCard(card.id, { customName: trimmed, nameConfirmed: true });
    setNamePrompted(true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/80 p-5 backdrop-blur-md">
      <div className="animate-pop-in w-full max-w-sm">
        {/* collector card: photo in frame, name below */}
        <div className="rounded-card bg-gradient-to-br from-sunny via-tangerine to-sunny-deep p-2 shadow-2xl">
          <div className="overflow-hidden rounded-[1.4rem] bg-cream">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.imageUrl} alt={card.customName} className="aspect-square w-full object-cover" />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-2xl shadow">
                {SPECIES_EMOJI[card.species]}
              </span>
              <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-bold text-white">
                #{String(card.serialNumber).padStart(6, "0")}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-4 text-center">
              {showNamePrompt ? (
                <div className="flex flex-col gap-2">
                  <p className="font-extrabold">What's this pet's name?</p>
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    placeholder="Enter their name…"
                    className="w-full rounded-full border-2 border-sunny bg-white px-4 py-2 text-center font-bold outline-none focus:border-tangerine"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setNamePrompted(true)}
                      className="tappable flex-1 rounded-full bg-white px-3 py-2 text-sm font-extrabold text-ink/60 shadow-sm">
                      I don't know
                    </button>
                    <button type="button" onClick={saveName}
                      className="tappable flex-1 rounded-full bg-grass px-3 py-2 text-sm font-extrabold text-white shadow-sm">
                      Save name
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-script text-4xl font-bold">{card.customName}</h2>
                  {card.breed && <p className="-mt-1 text-sm font-bold text-ink/50">{card.breed}</p>}
                  {!card.nameConfirmed && (
                    <p className="text-xs font-bold text-ink/40">Suggested nickname — add their real name from the PetDex!</p>
                  )}
                </>
              )}

              {!r && (
                <span className="mx-auto animate-pulse rounded-full bg-sunny/60 px-4 py-1 text-sm font-extrabold text-ink">
                  Saving your encounter…
                </span>
              )}
              {r?.kind === "new" && (
                <span className="mx-auto rounded-full bg-sunny px-4 py-1 text-sm font-extrabold text-ink">
                  ✨ New pet met! Paw Points +{r.points}
                </span>
              )}
              {r?.kind === "reunion" && (
                <span className="mx-auto rounded-full bg-sky/40 px-4 py-1 text-sm font-extrabold text-ink">
                  🤝 Reunion! Met {r.encounterCount}× · Paw Points +{r.points}
                </span>
              )}
              {r?.kind === "same_day" && (
                <span className="mx-auto rounded-full bg-ink/10 px-4 py-1 text-center text-sm font-extrabold text-ink/60">
                  👋 You already met this pet today!
                </span>
              )}
              {r?.kind === "error" && (
                <span className="mx-auto rounded-full bg-ink/10 px-4 py-1 text-sm font-extrabold text-ink/60">
                  Saved! (couldn't confirm the match, but your card is safe)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={dismiss}
            className="tappable flex-1 rounded-full bg-white px-4 py-3 font-extrabold text-ink shadow-md">
            Keep Meeting 📸
          </button>
          <button type="button" onClick={() => { dismiss(); setActiveView("petdex"); }}
            className="tappable flex-1 rounded-full bg-grass px-4 py-3 font-extrabold text-white shadow-md">
            See PetDex 📖
          </button>
        </div>
      </div>
    </div>
  );
}
