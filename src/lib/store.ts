import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** The five bottom-nav views. */
export type ViewKey = "map" | "collection" | "capture" | "leaderboards" | "profile";

export type Species = "dog" | "cat" | "rabbit" | "bird" | "other";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export interface PetCard {
  id: string;
  serialNumber: number;
  customName: string;
  species: Species;
  breed: string | null;
  rarity: Rarity;
  imageUrl: string;
  lat: number | null;
  lng: number | null;
  venueName: string | null;
  level: number;
  candy: number;
  stats: { chonkiness: number; friendliness: number; energy: number };
  /** 768-d L2-normalized embedding — kept locally for offline uniqueness checks */
  signature?: number[];
  /** Transparent sticker cutout (on-device background removal) */
  cutoutUrl?: string | null;
  createdAt: string;
}

export interface CheckedInVenue {
  id: string;
  name: string;
  distanceM: number;
}

export type CaptureOutcomeState =
  | { outcome: "new_discovery"; card: PetCard; xp: number }
  | { outcome: "revisit"; cardId: string; level: number; candy: number; xp: number }
  | null;

/** A champion drawn for a Steal War (own card or the rival's snapshot). */
export interface BattleChampion {
  name: string;
  species: Species;
  rarity: Rarity;
  power: number;
  imageUrl: string | null;
  cutoutUrl?: string | null;
}

/** An active Steal War over a contested pet. */
export interface BattleState {
  /** The pet both players scanned — at stake for the loser. */
  contested: PetCard;
  rivalName: string;
  venueName: string;
}

interface AppState {
  // Navigation
  activeView: ViewKey;
  setActiveView: (view: ViewKey) => void;

  // Geolocation
  position: { lat: number; lng: number } | null;
  setPosition: (position: { lat: number; lng: number } | null) => void;

  // B2B venue check-in — stamps subsequent captures with the venue name
  checkedInVenue: CheckedInVenue | null;
  setCheckedInVenue: (venue: CheckedInVenue | null) => void;

  // The user's PetDex (persisted to localStorage for offline/demo play)
  collection: PetCard[];
  setCollection: (cards: PetCard[]) => void;
  addCard: (card: PetCard) => void;
  updateCard: (id: string, patch: Partial<PetCard>) => void;
  removeCard: (id: string) => void;

  // ⚔️ Steal War in progress (overlay when set)
  activeBattle: BattleState | null;
  setActiveBattle: (battle: BattleState | null) => void;

  // Trainer XP (persisted) — earned on discoveries and revisits
  userXp: number;
  addXp: (amount: number) => void;

  // Result of the latest capture, shown as a celebration overlay
  lastCaptureOutcome: CaptureOutcomeState;
  setLastCaptureOutcome: (outcome: CaptureOutcomeState) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeView: "map",
      setActiveView: (view) => set({ activeView: view }),

      position: null,
      setPosition: (position) => set({ position }),

      checkedInVenue: null,
      setCheckedInVenue: (checkedInVenue) => set({ checkedInVenue }),

      collection: [],
      setCollection: (collection) => set({ collection }),
      addCard: (card) => set((s) => ({ collection: [card, ...s.collection] })),
      updateCard: (id, patch) =>
        set((s) => ({
          collection: s.collection.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCard: (id) =>
        set((s) => ({ collection: s.collection.filter((c) => c.id !== id) })),

      activeBattle: null,
      setActiveBattle: (activeBattle) => set({ activeBattle }),

      userXp: 0,
      addXp: (amount) => set((s) => ({ userXp: s.userXp + amount })),

      lastCaptureOutcome: null,
      setLastCaptureOutcome: (lastCaptureOutcome) => set({ lastCaptureOutcome }),
    }),
    {
      name: "petcatch-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ collection: s.collection, userXp: s.userXp }),
      // Rehydrated manually in AppShell after mount to avoid SSR mismatch
      skipHydration: true,
    }
  )
);
