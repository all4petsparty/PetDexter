"use client";

import { useAppStore, type Species } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import { levelFromXp } from "@/lib/cardFactory";

const SPECIES_ORDER: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const SPECIES_COLOR: Record<Species, string> = {
  dog: "bg-tangerine",
  cat: "bg-sky",
  rabbit: "bg-bubblegum",
  bird: "bg-grass",
  other: "bg-sunny",
};

/** Profile & stats dashboard — categorical breakdown rendered as pure CSS bars. */
export default function ProfileView() {
  const collection = useAppStore((s) => s.collection);
  const userXp = useAppStore((s) => s.userXp);
  const total = collection.length;
  const { level, intoLevel, perLevel } = levelFromXp(userXp);

  const counts = SPECIES_ORDER.map((species) => ({
    species,
    count: collection.filter((c) => c.species === species).length,
  }));

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sunny text-4xl shadow-md">
          🧑‍🚀
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-ink">Pet Trainer</h1>
          <p className="text-ink/60">{total} unique pets caught</p>
          {/* Trainer XP bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-full bg-sunny px-2 py-0.5 text-xs font-extrabold text-ink">
              Lv.{level}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sunny to-tangerine transition-all"
                style={{ width: `${Math.round((intoLevel / perLevel) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-ink/50">
              {intoLevel}/{perLevel} XP
            </span>
          </div>
        </div>
      </header>

      <section className="rounded-card bg-white p-5 shadow-md">
        <h2 className="mb-3 text-lg font-extrabold">Collection Breakdown</h2>
        {total === 0 ? (
          <p className="text-ink/60">Catch pets to see your stats bloom! 🌱</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {counts
              .filter((c) => c.count > 0)
              .map(({ species, count }) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <li key={species} className="flex items-center gap-2">
                    <span className="w-8 text-xl">{SPECIES_EMOJI[species]}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded-full bg-cream">
                      <div
                        className={`h-full rounded-full ${SPECIES_COLOR[species]} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-bold">{pct}%</span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-3 gap-3">
        {[
          { label: "Mythics", value: collection.filter((c) => c.rarity === "mythic").length, bg: "bg-sunny" },
          { label: "Venues", value: new Set(collection.map((c) => c.venueName).filter(Boolean)).size, bg: "bg-sky" },
          { label: "Candy", value: collection.reduce((sum, c) => sum + c.candy, 0), bg: "bg-bubblegum" },
        ].map(({ label, value, bg }) => (
          <div key={label} className={`rounded-card ${bg} p-4 text-center shadow-md`}>
            <div className="text-2xl font-extrabold text-white drop-shadow-sm">{value}</div>
            <div className="text-xs font-bold text-white/90">{label}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
