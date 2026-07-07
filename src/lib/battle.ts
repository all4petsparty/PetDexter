import { useAppStore, type BattleChampion, type PetCard } from "@/lib/store";
import { battleStats, randomStats, rollRarity, sillyName } from "@/lib/cardFactory";
import type { Rarity, Species } from "@/lib/store";

/**
 * Steal War engine.
 *
 * Real multiplayer path: `capture_pet` (migration 0002) detects when another
 * user scanned the same pet at the same venue and creates a `battles` row;
 * each player calls the `draw_champion` RPC and the server resolves the war
 * and deletes the loser's copy. That path activates once sign-in ships.
 *
 * Demo path (below): a simulated rival with generated cards runs the exact
 * same rules locally, so the interaction is fully playable today.
 */

export const RIVAL_NAMES = [
  "Trainer Maya", "Rival Rex", "Catmaster Kai", "Professor Paws",
  "Barkley the Bold", "Whisker Wanda", "Zoomies Zed",
];

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Start a demo Steal War over one of the player's own cards. */
export function startDemoBattle(contested: PetCard) {
  const store = useAppStore.getState();
  store.setActiveBattle({
    contested,
    rivalName: pick(RIVAL_NAMES),
    venueName: store.checkedInVenue?.name ?? "Pet Summit Philippines",
  });
}

/** Draw the player's random champion (excluding the contested pet if possible). */
export function drawMyChampion(contested: PetCard): BattleChampion {
  const { collection } = useAppStore.getState();
  const pool = collection.filter((c) => c.id !== contested.id);
  const card = pool.length ? pick(pool) : contested;
  return {
    name: card.customName,
    species: card.species,
    rarity: card.rarity,
    power: battleStats(card).power,
    imageUrl: card.imageUrl,
    cutoutUrl: card.cutoutUrl,
  };
}

/** Generate the rival's random champion (same stat rules as real cards). */
export function drawRivalChampion(): BattleChampion {
  const species = pick<Species>(["dog", "cat", "rabbit", "bird"]);
  const rarity = rollRarity();
  const stats = randomStats();
  return {
    name: sillyName(species),
    species,
    rarity,
    power: battleStats({ rarity, stats }).power,
    imageUrl: null, // rival cards render as a species emblem
  };
}

/**
 * Same resolution order as the server's draw_champion():
 * power → champion rarity → coin flip.
 */
export function resolveBattle(mine: BattleChampion, rival: BattleChampion): "me" | "rival" {
  if (mine.power !== rival.power) return mine.power > rival.power ? "me" : "rival";
  const myRarity = RARITY_ORDER.indexOf(mine.rarity);
  const rivalRarity = RARITY_ORDER.indexOf(rival.rarity);
  if (myRarity !== rivalRarity) return myRarity > rivalRarity ? "me" : "rival";
  return Math.random() < 0.5 ? "me" : "rival";
}
