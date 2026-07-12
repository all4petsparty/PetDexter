"use client";

import { useMemo } from "react";
import { type PetCard, type Rarity } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import { battleStats, tribesFor, abilityFor } from "@/lib/cardFactory";

const RARITY_FRAME: Record<Rarity, string> = {
  common: "from-ink/30 to-ink/10",
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

const STAT_META = [
  { key: "chonkiness", label: "🍩 Chonkiness", bar: "bg-tangerine" },
  { key: "friendliness", label: "💛 Friendliness", bar: "bg-sunny-deep" },
  { key: "energy", label: "⚡ Energy", bar: "bg-sky-deep" },
] as const;

function Sparkles({ count = 10 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: 6 + Math.random() * 88,
        top: 4 + Math.random() * 90,
        delay: Math.random() * 1.4,
        size: 10 + Math.random() * 14,
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

/** Full-detail collector card view for a single pet. */
export default function CardDetail({ card, onClose }: { card: PetCard; onClose: () => void }) {
  const hatching = card.hatched === false;
  const bd = card.backdrop ?? (card.id.charCodeAt(0) + card.id.charCodeAt(3)) % 4;
  const { cost, power } = battleStats(card);
  const tribes = tribesFor(card.stats);
  const ability = abilityFor(card.stats);
  const caught = new Date(card.createdAt).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-ink/80 p-5 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="animate-pop-in w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className={`rounded-card bg-gradient-to-br p-2 shadow-2xl ${hatching ? "from-sunny to-sunny-deep" : RARITY_FRAME[card.rarity]}`}>
          <div className="overflow-hidden rounded-[1.4rem] bg-white">
            {/* Art area */}
            <div className={`relative flex aspect-square items-end justify-center overflow-hidden ${hatching ? "bg-sunny/25" : `hatch-bg-${bd}`}`}>
              <Sparkles count={hatching ? 0 : 12} />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-2xl shadow">
                {SPECIES_EMOJI[card.species]}
              </span>
              <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-bold text-white">
                #{String(card.serialNumber).padStart(6, "0")}
              </span>
              {card.level > 1 && (
                <span className="absolute right-3 top-11 rounded-full bg-sky px-3 py-1 text-xs font-extrabold text-white shadow">
                  Lv.{card.level}
                </span>
              )}
              {hatching ? (
                <div className="flex h-full w-full animate-pulse flex-col items-center justify-center gap-2">
                  <span className="animate-bob text-7xl">🥚</span>
                  <span className="text-sm font-extrabold text-ink/50">Still hatching…</span>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={card.cutoutUrl ?? card.imageUrl}
                  alt={card.customName}
                  className={card.cutoutUrl ? "sticker max-h-[86%] max-w-[88%] object-contain" : "h-full w-full object-cover"}
                />
              )}
              {card.venueName && (
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-sunny px-3 py-1 text-[11px] font-extrabold text-ink shadow">
                  🏷️ Captured at {card.venueName}
                </span>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col gap-3 p-5">
              <div className="text-center">
                <h2 className="font-script text-4xl font-bold leading-tight">{card.customName}</h2>
                <div className="mt-1 flex items-center justify-center gap-2">
                  {card.breed && <span className="text-sm font-bold text-ink/50">{card.breed}</span>}
                  <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold uppercase ${hatching ? "bg-ink/10 text-ink/40" : RARITY_CHIP[card.rarity]}`}>
                    {hatching ? "hatching" : card.rarity}
                  </span>
                </div>
              </div>

              {/* Personality stats */}
              <div className="flex flex-col gap-2">
                {STAT_META.map(({ key, label, bar }) => (
                  <div key={key} className="flex items-center gap-2 text-sm font-bold">
                    <span className="w-32 shrink-0">{label}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-cream">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${card.stats[key]}%` }} />
                    </div>
                    <span className="w-7 text-right text-xs text-ink/50">{card.stats[key]}</span>
                  </div>
                ))}
              </div>

              {/* Battle panel */}
              <div className="flex gap-2">
                <span className="flex-1 rounded-2xl bg-cream px-3 py-2 text-center">
                  <span className="block text-[10px] font-extrabold text-ink/40">COST</span>
                  <span className="text-xl font-extrabold text-tangerine-deep">{cost}</span>
                </span>
                <span className="flex-1 rounded-2xl bg-cream px-3 py-2 text-center">
                  <span className="block text-[10px] font-extrabold text-ink/40">POWER</span>
                  <span className="text-xl font-extrabold text-sky-deep">{power}</span>
                </span>
                <span className="flex-1 rounded-2xl bg-cream px-3 py-2 text-center">
                  <span className="block text-[10px] font-extrabold text-ink/40">🍬 CANDY</span>
                  <span className="text-xl font-extrabold text-bubblegum">{card.candy}</span>
                </span>
              </div>

              {/* Tribes + ability */}
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

              <p className="text-center text-[11px] font-bold text-ink/35">Caught {caught}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="tappable mx-auto mt-4 block rounded-full bg-white px-8 py-3 font-extrabold text-ink shadow-md"
        >
          Close ✕
        </button>
      </div>
    </div>
  );
}
