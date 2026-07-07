"use client";

import { useState } from "react";
import { useAppStore, type BattleChampion, type Rarity } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import { drawMyChampion, drawRivalChampion, resolveBattle } from "@/lib/battle";

const XP_FOR_WIN = 50;

const RARITY_CHIP: Record<Rarity, string> = {
  common: "bg-ink/10 text-ink/70",
  uncommon: "bg-grass/25 text-grass-deep",
  rare: "bg-sky/25 text-sky-deep",
  epic: "bg-bubblegum/25 text-bubblegum",
  legendary: "bg-tangerine/25 text-tangerine-deep",
  mythic: "bg-sunny text-tangerine-deep",
};

function ChampionCard({
  champion,
  owner,
  highlight,
  faded,
}: {
  champion: BattleChampion;
  owner: string;
  highlight: boolean;
  faded: boolean;
}) {
  return (
    <div
      className={`animate-pop-in flex w-36 flex-col items-center gap-1.5 rounded-card border-4 bg-white p-3 shadow-xl transition-all ${
        highlight ? "border-sunny scale-105" : faded ? "border-ink/10 opacity-50 grayscale" : "border-white"
      }`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-ink/40">{owner}</span>
      <span className="flex h-20 w-20 items-center justify-center">
        {champion.cutoutUrl || champion.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={champion.cutoutUrl ?? champion.imageUrl!}
            alt={champion.name}
            className={champion.cutoutUrl ? "sticker max-h-20 max-w-20 object-contain" : "h-20 w-20 rounded-2xl object-cover"}
          />
        ) : (
          <span className="text-6xl">{SPECIES_EMOJI[champion.species]}</span>
        )}
      </span>
      <span className="font-script text-xl font-bold leading-none">{champion.name}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${RARITY_CHIP[champion.rarity]}`}>
        {champion.rarity}
      </span>
      <span className="rounded-2xl bg-cream px-4 py-1">
        <span className="text-[9px] font-extrabold text-ink/40">POWER </span>
        <span className="text-lg font-extrabold text-sky-deep">{champion.power}</span>
      </span>
    </div>
  );
}

/**
 * ⚔️ Steal War — two players scanned the same pet at the same venue.
 * Each draws a random champion from their PetDex; higher power keeps the
 * pet, the loser's copy leaves their collection. (Demo rival for now; the
 * server-side battle in migration 0002 takes over once sign-in ships.)
 */
export default function BattleArena() {
  const battle = useAppStore((s) => s.activeBattle);
  const setActiveBattle = useAppStore((s) => s.setActiveBattle);
  const removeCard = useAppStore((s) => s.removeCard);
  const addXp = useAppStore((s) => s.addXp);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const [stage, setStage] = useState<"challenge" | "clash" | "result">("challenge");
  const [mine, setMine] = useState<BattleChampion | null>(null);
  const [rival, setRival] = useState<BattleChampion | null>(null);
  const [winner, setWinner] = useState<"me" | "rival" | null>(null);

  if (!battle) return null;
  const { contested, rivalName, venueName } = battle;

  const close = () => {
    setActiveBattle(null);
    setStage("challenge");
    setMine(null);
    setRival(null);
    setWinner(null);
  };

  function handleDraw() {
    const my = drawMyChampion(contested);
    const theirs = drawRivalChampion();
    const result = resolveBattle(my, theirs);
    setMine(my);
    setRival(theirs);
    setStage("clash");
    setTimeout(() => {
      setWinner(result);
      // apply the stakes exactly once, when the result lands
      if (result === "me") addXp(XP_FOR_WIN);
      else removeCard(contested.id);
      setStage("result");
    }, 1600);
  }

  const contestedImg = contested.cutoutUrl ?? contested.imageUrl;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-5 overflow-y-auto bg-ink/85 p-5 backdrop-blur-md">
      {/* Contested pet header */}
      <div className="flex flex-col items-center gap-1">
        <p className="animate-pop-in text-2xl font-extrabold text-white drop-shadow">⚔️ Steal War!</p>
        <p className="max-w-xs text-center text-sm font-bold text-white/75">
          <span className="text-sunny">{rivalName}</span> also caught{" "}
          <span className="font-script text-lg text-white">{contested.customName}</span> at {venueName}!
        </p>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={contestedImg}
        alt={contested.customName}
        className={`${contested.cutoutUrl ? "sticker" : "rounded-card"} max-h-36 max-w-36 object-contain ${
          stage === "result" && winner === "rival" ? "opacity-40 grayscale" : "animate-bob"
        }`}
      />

      {stage === "challenge" && (
        <div className="flex flex-col items-center gap-3">
          <p className="max-w-xs text-center text-xs font-semibold text-white/70">
            Both trainers draw a <b>random</b> champion from their PetDex. Highest POWER keeps{" "}
            {contested.customName} — the loser&apos;s scan is gone for good!
          </p>
          <button
            type="button"
            onClick={handleDraw}
            className="tappable rounded-full bg-tangerine px-8 py-4 text-lg font-extrabold text-white shadow-xl"
          >
            Draw Champions 🎴
          </button>
        </div>
      )}

      {(stage === "clash" || stage === "result") && mine && rival && (
        <div className="flex items-center gap-3">
          <ChampionCard
            champion={mine}
            owner="You"
            highlight={winner === "me"}
            faded={winner === "rival"}
          />
          <span className={`text-3xl font-extrabold text-white ${stage === "clash" ? "animate-wiggle" : ""}`}>
            VS
          </span>
          <ChampionCard
            champion={rival}
            owner={rivalName}
            highlight={winner === "rival"}
            faded={winner === "me"}
          />
        </div>
      )}

      {stage === "result" && winner && (
        <div className="animate-pop-in flex flex-col items-center gap-3">
          {winner === "me" ? (
            <>
              <p className="text-center text-xl font-extrabold text-white">
                You defended {contested.customName}! 🏆
              </p>
              <span className="rounded-full bg-sunny px-4 py-1.5 font-extrabold text-ink">
                XP +{XP_FOR_WIN}
              </span>
            </>
          ) : (
            <p className="max-w-xs text-center text-xl font-extrabold text-white">
              {rivalName} stole {contested.customName}! 💔
              <span className="mt-1 block text-sm font-bold text-white/60">
                It has left your PetDex… track it down again!
              </span>
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={close}
              className="tappable rounded-full bg-white px-6 py-3 font-extrabold text-ink shadow-md"
            >
              {winner === "me" ? "Victory! 🎉" : "I'll be back…"}
            </button>
            {winner === "me" && (
              <button
                type="button"
                onClick={() => {
                  close();
                  setActiveView("collection");
                }}
                className="tappable rounded-full bg-grass px-6 py-3 font-extrabold text-white shadow-md"
              >
                See PetDex 📖
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
