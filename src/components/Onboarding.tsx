"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { MAX_CANS } from "@/lib/economy";

const SLIDES = [
  {
    title: "Spot real pets",
    emoji: "🐾",
    body: "PetCatch is a real-world pet spotting game. Verify dogs, cats, rabbits, and birds you meet and turn sightings into collectible cards.",
    points: ["Find pets in the real world — parks, streets, cafés", "Each verified sighting becomes a sticker card", "Rarer breeds mint rarer cards"],
  },
  {
    title: "Use the camera",
    emoji: "📸",
    body: "Tap the orange paw button to log a real pet.",
    points: ["Frame the pet clearly — head and body", "Only live animals count, not photos on a screen", "Scanning the same pet again levels it up instead"],
  },
  {
    title: "Feed to catch",
    emoji: "🦴",
    body: "When the scan verifies your new friend, seal the catch with a treat.",
    points: ["Drag the treat onto the pet", "Land it to mint the card", "Every species has a favorite snack"],
  },
  {
    title: "Snack cans matter",
    emoji: "🥫",
    body: `Each scan uses one snack can, so choose your tries wisely.`,
    points: [`You carry up to ${MAX_CANS} cans`, "Cans recharge automatically over time", "Watch a rewarded ad for a bonus can"],
  },
  {
    title: "Explore & compete",
    emoji: "🗺️",
    body: "The community map shows sightings other players logged near you.",
    points: ["Check in at partner venues to stamp your cards", "Climb species and breed leaderboards", "Defend your pets in Steal Wars ⚔️"],
  },
];

/** First-run explainer carousel (CatchCat-style, All4Pets palette). */
export default function Onboarding() {
  const setHasOnboarded = useAppStore((s) => s.setHasOnboarded);
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

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

        <div className="flex items-center justify-between gap-3 p-5 pt-0">
          <button
            type="button"
            onClick={() => setHasOnboarded(true)}
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
              onClick={() => (last ? setHasOnboarded(true) : setI(i + 1))}
              className="tappable rounded-full bg-tangerine px-6 py-3 font-extrabold text-white shadow-md"
            >
              {last ? "Let's catch! 🐾" : "Next ›"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
