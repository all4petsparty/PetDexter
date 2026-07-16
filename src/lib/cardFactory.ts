import type { Species } from "@/lib/store";

/**
 * Card-generation helpers: suggested nicknames and the Explorer Level curve.
 * No random rarity or combat stats — per the wireframe spec, a card's
 * appearance is never a randomized judgment of the animal's worth.
 */

const ADJECTIVES = [
  "Fluffy", "Chonky", "Zoomy", "Sassy", "Wiggly", "Sneaky", "Bouncy",
  "Snuggle", "Pudgy", "Turbo", "Noodle", "Waffle", "Mochi", "Biscuit",
];

const TITLES = ["Sir", "Lady", "Captain", "Princess", "Baron", "Professor", "DJ"];

const SUFFIXES: Record<Species, string[]> = {
  dog: ["Barks-a-Lot", "Woofer", "Zoomies", "Snoot", "Borker", "Tailwag"],
  cat: ["fur", "whiskers", "Meowington", "Purrbox", "Toebeans", "Loaf"],
  rabbit: ["hops", "Binky", "Cottontail", "Thumper", "Flopears"],
  bird: ["beak", "Chirps", "Featherton", "Tweetster", "Wingding"],
  other: ["paws", "Floof", "Nibbles", "Scooter", "Wiggles"],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * A placeholder nickname shown while a pet has no confirmed real name yet
 * (spec §9: "I don't know" still lets discovery continue). Never overwrites
 * a name the user actually entered.
 */
export function suggestNickname(species: Species): string {
  const suffix = pick(SUFFIXES[species]);
  return Math.random() < 0.4
    ? `${pick(TITLES)} ${suffix}`
    : /^[a-z]/.test(suffix)
      ? `${pick(ADJECTIVES)}${suffix}`
      : `${pick(ADJECTIVES)} ${suffix}`;
}

/** Paw Points awarded for meeting a genuinely new pet. */
export const POINTS_NEW_ENCOUNTER = 50;

/** Paw Points awarded for a reunion with a pet already in the PetDex. */
export const POINTS_REUNION = 10;

/** Explorer Level curve: 250 Paw Points per level. */
export function explorerLevelFromPoints(points: number): { level: number; intoLevel: number; perLevel: number } {
  const perLevel = 250;
  return { level: Math.floor(points / perLevel) + 1, intoLevel: points % perLevel, perLevel };
}
