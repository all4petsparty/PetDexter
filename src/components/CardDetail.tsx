"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppStore, type PetCard } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import { familiarityFor } from "@/lib/familiarity";

const TRAIT_OPTIONS = [
  "Playful", "Shy", "Cuddly", "Zoomy", "Sleepy", "Chatty", "Gentle", "Curious", "Food-motivated",
];

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

/**
 * Full-detail card — fills the screen, scrolls if the card is tall.
 * Phase 1 state: photo, name, breed, traits, Familiarity (spec §13,
 * computed from real encounter history), and a short meeting timeline. No
 * stats, power, rarity, feeding, or evolution — those systems were removed
 * because the wireframe spec treats every real pet as having no randomized
 * "worth."
 */
export default function CardDetail({ card: cardProp, onClose }: { card: PetCard; onClose: () => void }) {
  // Read the live card from the store so name/trait edits reflect immediately
  const card = useAppStore((s) => s.collection.find((c) => c.id === cardProp.id)) ?? cardProp;
  const updateCard = useAppStore((s) => s.updateCard);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(card.customName);

  const processing = card.hatched === false;
  const bd = card.backdrop ?? (card.id.charCodeAt(0) + card.id.charCodeAt(3)) % 4;
  const firstMet = new Date(card.createdAt).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
  const familiarity = familiarityFor(card);
  const recentEncounters = [...card.encounters].reverse().slice(0, 5);

  function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed) updateCard(card.id, { customName: trimmed, nameConfirmed: true });
    setEditingName(false);
  }

  function toggleTrait(trait: string) {
    const has = card.traits.includes(trait);
    const next = has ? card.traits.filter((t) => t !== trait) : [...card.traits, trait].slice(0, 3);
    updateCard(card.id, { traits: next });
  }

  // Portal to <body>: the active view <section> keeps a `transform` from the
  // pop-in animation, which would otherwise trap this fixed overlay inside it.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-ink/90 backdrop-blur-md" onClick={onClose}>
      {/* always-reachable close button (safe-area aware) */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg font-extrabold text-ink shadow-lg"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        ✕
      </button>

      {/* min-h-dvh centers a short card and lets a tall one scroll from the top */}
      <div className="flex min-h-dvh items-center justify-center px-4 py-6">
        <div className="animate-pop-in w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
          <div className={`rounded-card bg-gradient-to-br p-2 shadow-2xl ${processing ? "from-sunny to-sunny-deep" : "from-ink/20 to-ink/5"}`}>
            <div className="overflow-hidden rounded-[1.4rem] bg-white">
              {/* Art area — height-capped so the whole card fits one screen */}
              <div className={`relative flex h-[36vh] max-h-80 min-h-52 items-end justify-center overflow-hidden ${processing ? "bg-sunny/25" : `hatch-bg-${bd}`}`}>
                <Sparkles count={processing ? 0 : 12} />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-2xl shadow">
                  {SPECIES_EMOJI[card.species]}
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-bold text-white">
                  #{String(card.serialNumber).padStart(6, "0")}
                </span>
                {!card.owned && card.encounters.length > 1 && (
                  <span className="absolute right-3 top-11 rounded-full bg-sky px-3 py-1 text-xs font-extrabold text-white shadow">
                    Met {card.encounters.length}×
                  </span>
                )}
                {card.owned && (
                  <span className="absolute left-3 bottom-3 rounded-full bg-bubblegum px-3 py-1 text-xs font-extrabold text-white shadow">
                    🏠 My Pet
                  </span>
                )}
                {card.connectedFrom && (
                  <span className="absolute left-3 bottom-3 rounded-full bg-sky px-3 py-1 text-xs font-extrabold text-white shadow">
                    🔗 {card.connectedFrom}'s pet
                  </span>
                )}
                {processing ? (
                  <div className="flex h-full w-full animate-pulse flex-col items-center justify-center gap-2">
                    <span className="animate-bob text-7xl">🐾</span>
                    <span className="text-sm font-extrabold text-ink/50">Still saving your photo…</span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={card.cutoutUrl ?? card.imageUrl}
                    alt={card.customName}
                    className={card.cutoutUrl ? "sticker max-h-[92%] max-w-[88%] object-contain" : "h-full w-full object-cover"}
                  />
                )}
                {card.venueName && (
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-sunny px-3 py-1 text-[11px] font-extrabold text-ink shadow">
                    🏷️ Met at {card.venueName}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col gap-3 p-4">
                <div className="text-center">
                  {editingName ? (
                    <div className="flex items-center justify-center gap-2">
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveName()}
                        className="font-script w-40 rounded-xl border-2 border-sunny bg-cream px-2 py-1 text-center text-2xl font-bold outline-none"
                      />
                      <button type="button" onClick={saveName} className="tappable rounded-full bg-grass px-3 py-1.5 text-xs font-extrabold text-white shadow-sm">
                        Save
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setNameDraft(card.customName); setEditingName(true); }} className="group">
                      <h2 className="font-script text-4xl font-bold leading-tight">{card.customName} ✏️</h2>
                    </button>
                  )}
                  <div className="mt-1 flex items-center justify-center gap-2">
                    {card.breed && <span className="text-sm font-bold text-ink/50">{card.breed}</span>}
                  </div>
                  {!card.nameConfirmed && (
                    <p className="mt-1 text-[11px] font-bold text-tangerine-deep">Suggested nickname — tap the name to enter their real one!</p>
                  )}
                </div>

                {/* Familiarity (spec §13) — not shown for My Pets, which the user already knows fully */}
                {!card.owned && (
                  <div className="rounded-2xl bg-cream px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-tangerine-deep">
                        🤝 {familiarity.label}
                      </span>
                      <span className="text-[10px] font-extrabold text-ink/40">Lv.{familiarity.level}/5</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-tangerine transition-all" style={{ width: `${(familiarity.level / 5) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-ink/50">Unlocks: {familiarity.unlock}</p>
                  </div>
                )}

                {/* Traits */}
                <div>
                  <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-ink/40">Traits (up to 3)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TRAIT_OPTIONS.map((t) => {
                      const active = card.traits.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleTrait(t)}
                          className={`tappable rounded-full px-2.5 py-1 text-xs font-bold ${
                            active ? "bg-grass text-white" : "bg-cream text-ink/50"
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="flex-1 rounded-2xl bg-cream px-3 py-2 text-center">
                    <span className="block text-[10px] font-extrabold text-ink/40">FIRST MET</span>
                    <span className="text-sm font-extrabold text-ink">{firstMet}</span>
                  </span>
                  <span className="flex-1 rounded-2xl bg-cream px-3 py-2 text-center">
                    <span className="block text-[10px] font-extrabold text-ink/40">ENCOUNTERS</span>
                    <span className="text-xl font-extrabold text-sky-deep">{card.encounters.length}</span>
                  </span>
                </div>

                {/* Meeting timeline (spec §12 "Places" / "Timeline") */}
                {recentEncounters.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-ink/40">Timeline</p>
                    <div className="flex flex-col gap-1.5">
                      {recentEncounters.map((e, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-cream px-3 py-1.5 text-xs font-semibold text-ink/70">
                          <span>{new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                          <span className="truncate text-ink/50">{e.venueName ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
    </div>,
    document.body
  );
}
