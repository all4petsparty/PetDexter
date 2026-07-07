"use client";

import { useEffect, useState } from "react";

type TabKey = "global" | "cats" | "dogs" | "breeds";

const TABS: { key: TabKey; label: string }[] = [
  { key: "global", label: "🌏 Global" },
  { key: "cats", label: "🐱 Top Cat Catchers" },
  { key: "dogs", label: "🐶 Top Dog Trackers" },
  { key: "breeds", label: "🏅 Breed Masters" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

interface Row {
  username: string;
  detail: string | null;
  score: number;
}

/**
 * Leaderboards — each tab reads its Supabase view:
 * leaderboard_global / leaderboard_species / leaderboard_breed.
 */
export default function LeaderboardsView() {
  const [active, setActive] = useState<TabKey>("global");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "offline">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus("loading");
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        if (!cancelled) setStatus("offline");
        return;
      }
      try {
        const { getSupabase } = await import("@/lib/supabase");
        const supabase = getSupabase();
        let data: Row[] = [];

        if (active === "global") {
          const res = await supabase
            .from("leaderboard_global")
            .select("username, region, unique_pets")
            .limit(25);
          if (res.error) throw res.error;
          data = res.data.map((r) => ({
            username: r.username,
            detail: r.region,
            score: r.unique_pets,
          }));
        } else if (active === "cats" || active === "dogs") {
          const res = await supabase
            .from("leaderboard_species")
            .select("username, species, catches")
            .eq("species", active === "cats" ? "cat" : "dog")
            .limit(25);
          if (res.error) throw res.error;
          data = res.data.map((r) => ({ username: r.username, detail: null, score: r.catches }));
        } else {
          const res = await supabase
            .from("leaderboard_breed")
            .select("username, breed, documented")
            .limit(25);
          if (res.error) throw res.error;
          data = res.data.map((r) => ({
            username: r.username,
            detail: r.breed,
            score: r.documented,
          }));
        }

        if (!cancelled) {
          setRows(data);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("offline");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-3xl font-extrabold text-ink">Leaderboards 🏆</h1>
        <p className="text-ink/60">Who&apos;s the top pet catcher in town?</p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`tappable whitespace-nowrap rounded-full px-4 py-2 font-bold ${
              active === tab.key ? "bg-sunny text-ink shadow-md" : "bg-white text-ink/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status === "offline" && (
        <div className="flex flex-col items-center gap-3 rounded-card bg-white p-10 text-center shadow-md">
          <span className="text-6xl">🥇</span>
          <p className="text-xl font-bold">Rankings are waiting!</p>
          <p className="text-ink/60">
            Connect Supabase (see README) and the community boards light up here.
          </p>
        </div>
      )}

      {status === "loading" && (
        <div className="rounded-card bg-white p-10 text-center font-bold text-ink/40 shadow-md">
          Fetching champions… 🏃
        </div>
      )}

      {status === "ready" && rows && (
        <ol className="flex flex-col gap-2">
          {rows.length === 0 && (
            <li className="rounded-card bg-white p-8 text-center font-bold text-ink/50 shadow-md">
              No catches yet — be the first on the board! 🐾
            </li>
          )}
          {rows.map((row, i) => (
            <li
              key={`${row.username}-${i}`}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-md"
            >
              <span className="w-8 text-center text-xl font-extrabold">
                {MEDALS[i] ?? i + 1}
              </span>
              <div className="flex-1">
                <div className="font-extrabold">{row.username}</div>
                {row.detail && <div className="text-xs text-ink/50">{row.detail}</div>}
              </div>
              <span className="rounded-full bg-sunny px-3 py-1 font-extrabold text-ink">
                {row.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
