"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore, type Rarity, type Species } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import { battleStats, tribesFor, abilityFor } from "@/lib/cardFactory";

const RARITY_GRADIENT: Record<Rarity, string> = {
  common: "from-ink/20 to-ink/10",
  uncommon: "from-grass to-grass-deep",
  rare: "from-sky to-sky-deep",
  epic: "from-bubblegum to-tangerine",
  legendary: "from-tangerine to-tangerine-deep",
  mythic: "from-sunny via-tangerine to-bubblegum",
};

const RARITY_CHIP: Record<Rarity, string> = {
  common: "bg-ink/10 text-ink/70",
  uncommon: "bg-grass/25 text-grass-deep",
  rare: "bg-sky/25 text-sky-deep",
  epic: "bg-bubblegum/25 text-bubblegum",
  legendary: "bg-tangerine/25 text-tangerine-deep",
  mythic: "bg-sunny text-tangerine-deep",
};

const TREAT: Record<Species, string> = {
  dog: "🦴", cat: "🐟", rabbit: "🥕", bird: "🌻", other: "🍪",
};

function Sparkles({ count = 10 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: 8 + Math.random() * 84,
        top: 4 + Math.random() * 88,
        delay: Math.random() * 1.4,
        size: 12 + Math.random() * 14,
        char: Math.random() < 0.5 ? "✦" : "★",
      })),
    [count]
  );
  return (
    <>
      {stars.map((s, i) => (
        <span
          key={i}
          className="pointer-events-none absolute animate-twinkle text-sunny drop-shadow"
          style={{ left: `${s.left}%`, top: `${s.top}%`, fontSize: s.size, animationDelay: `${s.delay}s` }}
        >
          {s.char}
        </span>
      ))}
    </>
  );
}

/**
 * Capture celebration driven by the streaming CaptureFlow: the minigame
 * opens the instant classification passes; the sticker cutout and the
 * new-vs-revisit verdict arrive live while the player plays.
 */
export default function CardReveal() {
  const flow = useAppStore((s) => s.captureFlow);
  const setCaptureFlow = useAppStore((s) => s.setCaptureFlow);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const collection = useAppStore((s) => s.collection);

  const [stage, setStage] = useState<"catch" | "verifying" | "found" | "card">("catch");
  const [caught, setCaught] = useState(false);

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);

  const outcome = flow?.outcome ?? null;

  // If the player finished the catch before the verdict, advance when it lands
  useEffect(() => {
    if (stage === "verifying" && outcome) setStage("found");
  }, [stage, outcome]);

  if (!flow) return null;

  const dismiss = () => {
    setCaptureFlow(null);
    setStage("catch");
    setCaught(false);
    setDrag(null);
  };

  if (flow.failed) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm">
        <div className="animate-pop-in flex w-full max-w-sm flex-col items-center gap-3 rounded-card bg-white p-8 text-center shadow-2xl">
          <span className="text-6xl">😿</span>
          <p className="text-xl font-extrabold">It slipped away!</p>
          <p className="text-sm text-ink/60">Something went wrong finishing the scan — try again.</p>
          <button type="button" onClick={dismiss} className="tappable rounded-full bg-grass px-8 py-3 font-extrabold text-white shadow-md">
            Okay
          </button>
        </div>
      </div>
    );
  }

  const sticker = flow.cutoutUrl;
  const heroSrc = sticker ?? flow.photoUrl;
  const treat = TREAT[flow.species];

  function onTreatPointerDown(e: React.PointerEvent) {
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch { /* synthetic pointers can't be captured */ }
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    setDrag({ dx: 0, dy: 0 });
  }
  function onTreatPointerMove(e: React.PointerEvent) {
    if (!dragOrigin.current) return;
    setDrag({ dx: e.clientX - dragOrigin.current.x, dy: e.clientY - dragOrigin.current.y });
  }
  function onTreatPointerUp(e: React.PointerEvent) {
    if (!dragOrigin.current) return;
    const zone = dropZoneRef.current?.getBoundingClientRect();
    const hit =
      zone &&
      e.clientX >= zone.left && e.clientX <= zone.right &&
      e.clientY >= zone.top && e.clientY <= zone.bottom;
    dragOrigin.current = null;
    setDrag(null);
    if (hit) {
      setCaught(true);
      setTimeout(() => setStage(outcome ? "found" : "verifying"), 650);
    }
  }

  // Stage 1 — the catch minigame (opens ~1-2s after the shutter)
  if (stage === "catch") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between overflow-hidden bg-ink/85 p-6 backdrop-blur-md">
        <p className="mt-6 animate-pop-in text-center text-xl font-extrabold text-white drop-shadow">
          {caught ? "Gotcha! 🎉" : `A wild ${flow.species} appeared!`}
        </p>
        <div ref={dropZoneRef} className="relative flex h-72 w-72 items-center justify-center">
          <Sparkles />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSrc}
            alt={flow.species}
            className={`max-h-64 max-w-64 object-contain ${sticker ? "sticker" : "rounded-card"} ${
              caught ? "animate-wiggle" : "animate-bob"
            }`}
          />
          {caught && <span className="absolute animate-pop-in text-6xl">💖</span>}
        </div>
        <div className="mb-8 flex flex-col items-center gap-3">
          <p className="text-sm font-bold text-white/80">
            {caught ? "It likes you!" : `Drag the ${treat} to your new friend to catch it!`}
          </p>
          <button
            type="button"
            aria-label="Treat — drag onto the pet"
            onPointerDown={onTreatPointerDown}
            onPointerMove={onTreatPointerMove}
            onPointerUp={onTreatPointerUp}
            className={`flex h-20 w-20 touch-none items-center justify-center rounded-full border-4 border-sunny bg-white text-4xl shadow-xl ${
              drag ? "" : "transition-transform"
            } ${caught ? "opacity-0" : ""}`}
            style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.15)` } : undefined}
          >
            {treat}
          </button>
        </div>
      </div>
    );
  }

  // Stage 1.5 — player beat the AI: brief verifying beat
  if (stage === "verifying" || !outcome) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-ink/85 p-6 backdrop-blur-md">
        <div className="relative flex h-56 w-56 items-center justify-center">
          <Sparkles count={12} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroSrc} alt={flow.species} className={`max-h-52 max-w-52 animate-bob object-contain ${sticker ? "sticker" : "rounded-card"}`} />
        </div>
        <p className="animate-pulse text-lg font-extrabold text-white">Checking your PetDex… 🔍</p>
      </div>
    );
  }

  // Revisit — reward toast
  if (outcome.outcome === "revisit") {
    const card = collection.find((c) => c.id === outcome.cardId);
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-6 backdrop-blur-sm">
        <div className="animate-pop-in relative flex w-full max-w-sm flex-col items-center gap-3 overflow-hidden rounded-card bg-white p-8 text-center shadow-2xl">
          <Sparkles count={6} />
          <span className="animate-wiggle text-6xl">🍬</span>
          <h2 className="text-2xl font-extrabold">You&apos;ve met before!</h2>
          <p className="text-ink/60">
            {card ? `${card.customName} remembers you!` : "This pet remembers you!"} Leveled up to{" "}
            <b>Lv. {outcome.level}</b>
          </p>
          <div className="flex gap-2">
            <span className="rounded-full bg-sunny px-3 py-1 text-sm font-extrabold text-ink">XP +{outcome.xp}</span>
            <span className="rounded-full bg-bubblegum/30 px-3 py-1 text-sm font-extrabold text-bubblegum">🍬 +3</span>
          </div>
          <button type="button" onClick={dismiss} className="tappable mt-2 rounded-full bg-grass px-8 py-3 font-extrabold text-white shadow-md">
            Sweet!
          </button>
        </div>
      </div>
    );
  }

  // New discovery
  const { card, xp } = outcome;
  const cardSticker = card.cutoutUrl ?? sticker;
  const speciesName = card.species.toUpperCase();
  const { cost, power } = battleStats(card);
  const tribes = tribesFor(card.stats);
  const ability = abilityFor(card.stats);

  if (stage === "found") {
    return (
      <button
        type="button"
        onClick={() => setStage("card")}
        className="fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center gap-6 overflow-hidden bg-ink/85 p-6 backdrop-blur-md"
      >
        <div className="relative flex h-60 w-60 items-center justify-center">
          <Sparkles count={14} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardSticker ?? card.imageUrl} alt={card.species} className={`max-h-56 max-w-56 animate-bob object-contain ${cardSticker ? "sticker" : "rounded-card"}`} />
        </div>
        <div className="animate-pop-in w-full max-w-xs rounded-card border-4 border-grass bg-cream p-5 text-center shadow-2xl">
          <p className="text-sm font-extrabold tracking-widest text-grass-deep">★ {speciesName} FOUND ★</p>
          <h2 className="font-script mt-1 text-4xl font-bold text-ink">{card.customName}</h2>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="rounded-full bg-sunny px-3 py-1 text-sm font-extrabold text-ink">XP +{xp}</span>
            <span className="rounded-full bg-bubblegum/30 px-3 py-1 text-sm font-extrabold text-bubblegum">🍬 +{card.candy || 1}</span>
          </div>
          <p className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-bold text-ink/50">
            #{String(card.serialNumber).padStart(6, "0")}
          </p>
        </div>
        <p className="animate-pulse text-sm font-bold text-white/70">Tap anywhere to continue</p>
      </button>
    );
  }

  // Full trading card
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/70 p-5 backdrop-blur-sm">
      <div className="animate-pop-in w-full max-w-sm">
        <div className={`rounded-card bg-gradient-to-br p-2 shadow-2xl ${RARITY_GRADIENT[card.rarity]}`}>
          <div className="overflow-hidden rounded-[1.4rem] bg-white">
            <div className="card-meadow relative flex aspect-square items-end justify-center overflow-hidden">
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-2xl shadow">
                {SPECIES_EMOJI[card.species]}
              </span>
              <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-bold text-white">
                #{String(card.serialNumber).padStart(6, "0")}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardSticker ?? card.imageUrl}
                alt={card.customName}
                className={`max-h-[82%] max-w-[86%] object-contain ${cardSticker ? "sticker" : "rounded-t-card object-cover"}`}
              />
              <span className="font-script absolute bottom-2 left-1/2 -translate-x-1/2 rounded-2xl bg-white/85 px-4 py-0.5 text-3xl font-bold text-ink shadow">
                {card.customName}
              </span>
              {card.venueName && (
                <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-sunny px-3 py-1 text-[10px] font-extrabold text-ink shadow">
                  🏷️ Captured at {card.venueName}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2.5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold tracking-widest text-ink/40">BATTLE</span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold uppercase ${RARITY_CHIP[card.rarity]}`}>
                  {card.rarity}
                </span>
              </div>
              {card.breed && <p className="-mt-1 text-sm font-bold text-ink/50">{card.breed}</p>}
              <div className="flex gap-2">
                <span className="flex-1 rounded-2xl bg-cream px-3 py-2 text-center">
                  <span className="block text-[10px] font-extrabold text-ink/40">COST</span>
                  <span className="text-xl font-extrabold text-tangerine-deep">{cost}</span>
                </span>
                <span className="flex-1 rounded-2xl bg-cream px-3 py-2 text-center">
                  <span className="block text-[10px] font-extrabold text-ink/40">POWER</span>
                  <span className="text-xl font-extrabold text-sky-deep">{power}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold text-ink/40">TRIBES</span>
                {tribes.map((t) => (
                  <span key={t} className="rounded-full bg-grass/20 px-2.5 py-0.5 text-xs font-bold text-grass-deep">{t}</span>
                ))}
              </div>
              <div className="rounded-2xl bg-cream p-3">
                <span className="rounded-full bg-sunny px-2.5 py-0.5 text-xs font-extrabold text-ink">{ability.keyword}</span>
                <p className="mt-1.5 text-xs font-semibold leading-snug text-ink/70">{ability.text}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={dismiss} className="tappable flex-1 rounded-full bg-white px-4 py-3 font-extrabold text-ink shadow-md">
            Keep Catching 📸
          </button>
          <button
            type="button"
            onClick={() => { dismiss(); setActiveView("collection"); }}
            className="tappable flex-1 rounded-full bg-grass px-4 py-3 font-extrabold text-white shadow-md"
          >
            See PetDex 📖
          </button>
        </div>
      </div>
    </div>
  );
}
