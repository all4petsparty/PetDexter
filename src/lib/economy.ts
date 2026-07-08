import { useAppStore, type Rarity } from "@/lib/store";

/**
 * Game economy (CatchCat-inspired, All4Pets flavor).
 * Snack cans are scan energy: each scan costs one, they recharge over time,
 * and a rewarded ad grants a bonus can. Coins and treats are soft currencies
 * earned from catches and achievements.
 */

export const MAX_CANS = 4;
export const CAN_REFILL_MS = 3 * 60 * 60 * 1000; // one can every 3 hours

export const COINS_NEW_DISCOVERY = 10;
export const COINS_REVISIT = 3;
export const TREATS_NEW_DISCOVERY = 2;
export const AD_DAILY_COINS = 25;

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Current can count after applying time-based refills (also persists the advance). */
export function currentCans(): { count: number; nextRefillMs: number | null } {
  const store = useAppStore.getState();
  const { count, lastRefillAt } = store.cans;
  if (count >= MAX_CANS) return { count, nextRefillMs: null };
  const elapsed = Date.now() - lastRefillAt;
  const refills = Math.min(Math.floor(elapsed / CAN_REFILL_MS), MAX_CANS - count);
  const newCount = count + refills;
  const newLast = newCount >= MAX_CANS ? Date.now() : lastRefillAt + refills * CAN_REFILL_MS;
  if (refills > 0) store.setCans({ count: newCount, lastRefillAt: newLast });
  return {
    count: newCount,
    nextRefillMs: newCount >= MAX_CANS ? null : CAN_REFILL_MS - (Date.now() - newLast),
  };
}

/** Spend one can for a scan. Returns false when the stash is empty. */
export function spendCan(): boolean {
  const { count } = currentCans();
  if (count <= 0) return false;
  const store = useAppStore.getState();
  store.setCans({
    count: count - 1,
    // start the refill clock when leaving a full stash
    lastRefillAt: count >= MAX_CANS ? Date.now() : store.cans.lastRefillAt,
  });
  return true;
}

/** Grant a bonus can (rewarded ad / achievement). Can exceed the recharge cap. */
export function grantCans(n: number) {
  const store = useAppStore.getState();
  const { count } = currentCans();
  store.setCans({ count: count + n, lastRefillAt: store.cans.lastRefillAt });
}

export function formatDuration(ms: number): string {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

// ---------------------------------------------------------------------------
// Achievements (CatchCat-style milestones, PetCatch rewards)
// ---------------------------------------------------------------------------

export interface Achievement {
  id: string;
  title: string;
  blurb: string;
  goal: number;
  reward: { coins?: number; treats?: number; cans?: number };
  rewardLabel: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-sighting", title: "First Sighting!", blurb: "Catch your very first pet. The journal begins.", goal: 1, reward: { coins: 50 }, rewardLabel: "50 coins" },
  { id: "curious-stray", title: "Curious Stray", blurb: "Collect 5 pets. They are already plotting.", goal: 5, reward: { coins: 75 }, rewardLabel: "75 coins" },
  { id: "starter-pack", title: "Starter Pack", blurb: "Collect 10 pets. You are officially a regular.", goal: 10, reward: { cans: 3 }, rewardLabel: "3 cans" },
  { id: "park-stroll", title: "Park Stroll", blurb: "Collect 25 pets. The park knows your name.", goal: 25, reward: { coins: 150, treats: 10 }, rewardLabel: "150 coins + 10 treats" },
  { id: "herding-pets", title: "Herding Pets", blurb: "Collect 50 pets. Good luck organizing them.", goal: 50, reward: { coins: 300, treats: 25 }, rewardLabel: "300 coins + 25 treats" },
];

export function achievementProgress(id: string): number {
  const { collection } = useAppStore.getState();
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  return a ? Math.min(collection.length, a.goal) : 0;
}

/** Claim a reached achievement; applies rewards once. */
export function claimAchievement(a: Achievement): boolean {
  const store = useAppStore.getState();
  if (store.claimedAchievements.includes(a.id)) return false;
  if (store.collection.length < a.goal) return false;
  store.claimAchievement(a.id);
  if (a.reward.coins) store.addCoins(a.reward.coins);
  if (a.reward.treats) store.addTreats(a.reward.treats);
  if (a.reward.cans) grantCans(a.reward.cans);
  return true;
}

/** Rarest catch in the collection (for the Field Journal). */
const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
export function rarestCatch(): { name: string; rarity: Rarity } | null {
  const { collection } = useAppStore.getState();
  if (!collection.length) return null;
  const best = collection.reduce((a, b) =>
    RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) ? b : a
  );
  return { name: best.customName, rarity: best.rarity };
}
