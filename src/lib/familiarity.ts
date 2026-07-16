import type { PetCard } from "@/lib/store";

/**
 * Familiarity progression (spec §13) — personal to each user, computed from
 * real encounter history. It never modifies a pet's canonical identity and
 * creates no ranking between pets.
 */
export interface FamiliarityInfo {
  level: number;
  label: string;
  unlock: string;
}

const LEVELS: Omit<FamiliarityInfo, "level">[] = [
  { label: "Discovered", unlock: "Basic card, place and date" },
  { label: "New Acquaintance", unlock: "Name recorded" },
  { label: "Familiar Face", unlock: "Traits and reunion badge" },
  { label: "Pet Pal", unlock: "Shared memory" },
  { label: "Adventure Friend", unlock: "Animated frame" },
  { label: "Beloved Familiar", unlock: "Special memory card" },
];

/** Determine the current Familiarity level (0–5) for a met pet. */
export function familiarityFor(card: Pick<PetCard, "nameConfirmed" | "encounters">): FamiliarityInfo {
  const encounters = card.encounters;
  const distinctDays = new Set(encounters.map((e) => e.date.slice(0, 10))).size;
  const distinctPlaces = new Set(encounters.filter((e) => e.venueName).map((e) => e.venueName)).size;
  const spanDays = encounters.length >= 2
    ? (new Date(encounters[encounters.length - 1].date).getTime() - new Date(encounters[0].date).getTime()) / 86_400_000
    : 0;

  let level = 0;
  if (encounters.length >= 1) level = 0;
  if (card.nameConfirmed) level = Math.max(level, 1);
  if (distinctDays >= 2) level = Math.max(level, 2);
  if (encounters.length >= 3) level = Math.max(level, 3);
  if (distinctPlaces >= 3) level = Math.max(level, 4);
  if (encounters.length >= 5 && spanDays >= 30) level = Math.max(level, 5);

  return { level, ...LEVELS[level] };
}
