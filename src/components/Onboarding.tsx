"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { preloadModels, onModelProgress } from "@/lib/visionWorkerClient";
import { grantStarterSnacksIfNeeded } from "@/lib/economy";

/** 4-slide carousel per the wireframe spec §5. */
const SLIDES = [
  {
    title: "Meet real pets",
    emoji: "🐾",
    body: "PetDexter helps you meet, remember and reconnect with real pets — parks, streets, cafés, wherever you go.",
    points: ["Verify a real dog, cat, rabbit, or bird you meet", "Each meeting becomes a card in your PetDex", "Cards are never lost or destroyed through play"],
  },
  {
    title: "Remember names and places",
    emoji: "📝",
    body: "Learn a pet's real name and where you met them — that's the whole point.",
    points: ["Enter their name if you learn it, or leave it for later", "Every meeting logs the date and place", "Meeting the same pet again is a reunion, not a duplicate"],
  },
  {
    title: "Connect now or later",
    emoji: "🤝",
    body: "Exchange a Pet Family calling card on the spot, or let PetDexter find the parent for you later.",
    points: ["Scan a QR code to connect instantly, for free", "Or save the encounter and get matched later", "You control what's shared and with whom"],
  },
  {
    title: "Play quests and help adoption pets",
    emoji: "🏆",
    body: "Complete quests, climb verified leaderboards, and give adoptable pets more visibility.",
    points: ["Location and event quests reward real exploration", "No pet is ever more \"valuable\" than another", "Support animal welfare organizations along the way"],
  },
];

/** First-run explainer carousel. */
export default function Onboarding() {
  const setHasOnboarded = useAppStore((s) => s.setHasOnboarded);
  const [i, setI] = useState(0);
  const [aiProgress, setAiProgress] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  function finish() {
    grantStarterSnacksIfNeeded();
    setHasOnboarded(true);
  }

  // The carousel doubles as the AI download screen — models arrive while
  // the player reads, so the first meeting starts instantly
  useEffect(() => {
    onModelProgress(setAiProgress);
    preloadModels();
    return () => onModelProgress(null);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-ink/70 p-5 backdrop-blur-sm">
      <div className="animate-pop-in w-full max-w-sm rounded-card border-4 border-sunny bg-cream shadow-2xl">
        {/* progress dots */}
        <div className="flex items-center justify-center gap-2 pt-5">
          {SLIDES.map((_, d) => (
            <span
              key={d}
              className={`h-2 rounded-full transition-all ${d === i ? "w-8 bg-tangerine" : "w-2 bg-ink/15"}`}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="text-6xl">{slide.emoji}</span>
          <h2 className="text-2xl font-extrabold">{slide.title}</h2>
          <p className="font-semibold text-ink/70">{slide.body}</p>
          <ul className="flex w-full flex-col gap-2 text-left">
            {slide.points.map((p) => (
              <li key={p} className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-ink/80">
                <span className="mt-0.5 text-tangerine">●</span> {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 pb-1">
          <div className="mb-1 flex justify-between text-[10px] font-extrabold text-ink/40">
            <span>🧠 Preparing on-device AI…</span>
            <span>{Math.min(aiProgress, 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-grass transition-all" style={{ width: `${Math.min(aiProgress, 100)}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-5 pt-3">
          <button
            type="button"
            onClick={finish}
            className="font-bold text-ink/40"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI(i - 1)}
                className="tappable flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-extrabold shadow-md"
              >
                ‹
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? finish() : setI(i + 1))}
              className="tappable rounded-full bg-tangerine px-6 py-3 font-extrabold text-white shadow-md"
            >
              {last ? "Let's meet pets! 🐾" : "Next ›"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
