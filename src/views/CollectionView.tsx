"use client";

import { useAppStore, type Rarity } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";

const RARITY_FRAME: Record<Rarity, string> = {
  common: "from-ink/30 to-ink/10",
  uncommon: "from-grass to-grass-deep",
  rare: "from-sky to-sky-deep",
  epic: "from-bubblegum to-tangerine",
  legendary: "from-tangerine to-tangerine-deep",
  mythic: "from-sunny via-tangerine to-bubblegum",
};

const RARITY_TEXT: Record<Rarity, string> = {
  common: "text-ink/50", uncommon: "text-grass-deep", rare: "text-sky-deep",
  epic: "text-bubblegum", legendary: "text-tangerine-deep", mythic: "text-tangerine-deep",
};

/** The PetDex — a binder of mini collector cards, each framed by its rarity. */
export default function CollectionView() {
  const collection = useAppStore((s) => s.collection);

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-3xl font-extrabold text-ink">My PetDex 📖</h1>
        <p className="text-ink/60">
          {collection.length} unique {collection.length === 1 ? "friend" : "friends"} discovered
        </p>
      </header>

      {collection.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-white p-10 text-center shadow-md">
          <span className="text-6xl">🐾</span>
          <p className="text-xl font-bold">No pets caught yet!</p>
          <p className="text-ink/60">Throw a treat at your first furry friend below.</p>
        </div>
      ) : (
        <div className="dotted-paper grid grid-cols-2 gap-x-3 gap-y-5 rounded-card p-4 shadow-md">
          {collection.map((card, i) => {
            const hatching = card.hatched === false;
            // older cards get a stable backdrop derived from their id
            const bd = card.backdrop ?? (card.id.charCodeAt(0) + card.id.charCodeAt(3)) % 4;
            return (
              <button
                key={card.id}
                type="button"
                className={`tappable w-full rounded-2xl bg-gradient-to-br p-1.5 shadow-lg ${
                  hatching ? "from-sunny to-sunny-deep" : RARITY_FRAME[card.rarity]
                }`}
                style={{ transform: `rotate(${i % 2 === 0 ? -1.2 : 1.2}deg)` }}
              >
                <span className="block overflow-hidden rounded-xl bg-white">
                  <span
                    className={`relative flex h-32 w-full items-end justify-center overflow-hidden ${
                      hatching ? "bg-sunny/25" : `hatch-bg-${bd}`
                    }`}
                  >
                    {hatching ? (
                      <span className="flex h-full w-full animate-pulse flex-col items-center justify-center gap-1">
                        <span className="animate-bob text-5xl">🥚</span>
                        <span className="text-[10px] font-extrabold text-ink/50">Hatching…</span>
                      </span>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={card.cutoutUrl ?? card.imageUrl}
                        alt={card.customName}
                        className={
                          card.cutoutUrl
                            ? "sticker max-h-28 max-w-[90%] object-contain"
                            : "h-32 w-full object-cover"
                        }
                      />
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-white/85 px-1.5 text-sm shadow">
                      {SPECIES_EMOJI[card.species]}
                    </span>
                    {card.level > 1 && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-sky px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
                        Lv.{card.level}
                      </span>
                    )}
                  </span>
                  <span className="block px-2 pb-2 pt-1 text-center">
                    <span className="font-script block truncate text-2xl font-bold leading-tight text-ink">
                      {card.customName}
                    </span>
                    <span className="flex items-center justify-between text-[9px] font-extrabold">
                      <span className={`uppercase tracking-wide ${hatching ? "text-ink/40" : RARITY_TEXT[card.rarity]}`}>
                        {hatching ? "🥚 hatching" : `★ ${card.rarity}`}
                      </span>
                      <span className="text-ink/35">#{String(card.serialNumber).padStart(6, "0")}</span>
                    </span>
                    {card.venueName && (
                      <span className="block truncate text-[9px] font-bold text-tangerine-deep">
                        🏷️ {card.venueName}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
