import { useAppStore, type PetCard, type Species, type Encounter } from "@/lib/store";
import { cosineSimilarity } from "@/lib/vision";
import { segmentPet, embedSignature } from "@/lib/visionWorkerClient";
import { suggestNickname, POINTS_NEW_ENCOUNTER, POINTS_REUNION } from "@/lib/cardFactory";
import { todayKey } from "@/lib/economy";
import { syncMetPetToSupabase } from "@/lib/connections";

/**
 * Re-identification threshold for DINOv2 cutout embeddings. Benchmarks:
 * same dog across views scores 0.79–0.94, different species near 0 —
 * so 0.80 recognizes reunions reliably with a wide safety margin.
 */
const SIMILARITY_THRESHOLD = 0.8;
const MAX_SIGNATURES_PER_CARD = 3;
/** A new view this dissimilar from stored ones is worth remembering. */
const NEW_VIEW_MAX_SIM = 0.93;

/** Patch the reveal overlay's resolution ONLY if it's still showing this exact capture. */
function reportResolution(cardId: string, resolution: NonNullable<import("@/lib/store").CaptureFlow["resolution"]>) {
  const store = useAppStore.getState();
  if (store.captureFlow?.card?.id === cardId) store.patchCaptureFlow({ resolution });
}

/**
 * Mint the instant card shown right after the treat lands, with its first
 * Encounter already logged. No reward is granted yet — that's decided once
 * the real outcome (new / reunion / same-day duplicate) is known, in
 * finalizeCapture(). The name shown here is a placeholder suggestion until
 * the user confirms a real one via the name prompt in CardReveal (spec §9).
 */
export function startCapture(photoUrl: string, species: Species, breed: string | null): PetCard {
  const store = useAppStore.getState();
  const encounter: Encounter = {
    date: new Date().toISOString(),
    lat: store.position?.lat ?? null,
    lng: store.position?.lng ?? null,
    venueName: store.checkedInVenue?.name ?? null,
  };
  const card: PetCard = {
    id: crypto.randomUUID(),
    serialNumber: store.collection.reduce((m, c) => Math.max(m, c.serialNumber), 0) + 1,
    customName: suggestNickname(species),
    nameConfirmed: false,
    species,
    breed,
    traits: [],
    imageUrl: photoUrl,
    lat: encounter.lat,
    lng: encounter.lng,
    venueName: encounter.venueName,
    owned: false,
    encounters: [encounter],
    hatched: false,
    backdrop: Math.floor(Math.random() * 4),
    createdAt: encounter.date,
  };
  store.addCard(card);
  return card;
}

/**
 * Background processing: cutout → signature → match → reward → reveal.
 * Mirrors the spec's capture/identification table (§8):
 *  - No match: genuinely new pet, full discovery reward.
 *  - Match, last met a previous day: Reunion — small reward, encounter logged.
 *  - Match, already met today: recognized but no additional unique count
 *    or reward ("You already met this pet today").
 *
 * Server-side canonical matching (captureEncounter / matchPet RPCs) is
 * later Phase 1 work once the identity/encounter schema is executed on the
 * backend — for now this runs entirely on-device against the local PetDex.
 */
export async function finalizeCapture(card: PetCard): Promise<void> {
  const store = useAppStore.getState();
  try {
    const cutoutUrl = await segmentPet(card.imageUrl);
    const signature = await embedSignature(cutoutUrl ?? card.imageUrl);
    await resolveMatchAndReward(card, signature, cutoutUrl);
  } catch (err) {
    console.warn("[petdexter] background processing failed, card keeps its photo:", err);
    store.updateCard(card.id, { hatched: true });
    reportResolution(card.id, { kind: "error" });
  }
}

/**
 * Match + reward logic, decoupled from the on-device AI calls above so it
 * can run (and be tested) with an already-computed signature.
 */
export async function resolveMatchAndReward(
  card: PetCard,
  signature: number[],
  cutoutUrl: string | null
): Promise<void> {
  const store = useAppStore.getState();
  const patch = (resolution: NonNullable<import("@/lib/store").CaptureFlow["resolution"]>) =>
    reportResolution(card.id, resolution);

  // Species-gated match against every stored viewing angle of every other card
  let bestId: string | null = null;
  let bestSim = 0;
  for (const c of store.collection) {
    if (c.id === card.id || c.species !== card.species) continue;
    for (const view of [c.signature, ...(c.signatures ?? [])]) {
      if (!view || view.length !== signature.length) continue;
      const sim = cosineSimilarity(signature, view);
      if (sim > bestSim) { bestSim = sim; bestId = c.id; }
    }
  }

  if (bestId && bestSim >= SIMILARITY_THRESHOLD) {
    const existing = store.collection.find((c) => c.id === bestId)!;
    const thisEncounter = card.encounters[0];
    store.removeCard(card.id); // this scan's placeholder — the real pet already exists

    const today = todayKey();
    const lastMetDay = (existing.encounters.at(-1)?.date ?? existing.createdAt).slice(0, 10);

    if (lastMetDay === today) {
      // Already met today — recognized, but never counts as another unique meeting.
      store.registerCatch(today);
      patch({ kind: "same_day" });
      return;
    }

    const views = existing.signatures ?? [];
    const encounters = [...existing.encounters, thisEncounter];
    store.updateCard(bestId, {
      encounters,
      signatures: bestSim < NEW_VIEW_MAX_SIM && views.length < MAX_SIGNATURES_PER_CARD
        ? [...views, signature] : views,
    });
    store.addPawPoints(POINTS_REUNION);
    store.registerCatch(today);
    patch({ kind: "reunion", points: POINTS_REUNION, encounterCount: encounters.length });
    // re-fetch: `store` is a stale pre-update snapshot, its .collection won't reflect updateCard() above
    const updated = useAppStore.getState().collection.find((c) => c.id === bestId);
    if (updated) syncMetPetToSupabase(updated); // background — never blocks the reveal
    return;
  }

  // Genuinely new pet
  store.updateCard(card.id, { cutoutUrl, signature, hatched: true });
  store.addPawPoints(POINTS_NEW_ENCOUNTER);
  store.registerCatch(todayKey());
  patch({ kind: "new", points: POINTS_NEW_ENCOUNTER });
  // re-fetch: `store` is a stale pre-update snapshot, its .collection won't reflect updateCard() above
  const updated = useAppStore.getState().collection.find((c) => c.id === card.id);
  if (updated) syncMetPetToSupabase(updated); // background — never blocks the reveal
}
