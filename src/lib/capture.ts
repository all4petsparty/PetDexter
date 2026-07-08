import { useAppStore, type PetCard, type Species } from "@/lib/store";
import { cosineSimilarity } from "@/lib/vision";
import { rollRarity, xpForDiscovery, XP_FOR_REVISIT } from "@/lib/cardFactory";
import { COINS_NEW_DISCOVERY, COINS_REVISIT, TREATS_NEW_DISCOVERY, todayKey } from "@/lib/economy";

/** Coins, treats, and streak bookkeeping for any successful catch. */
function awardCatchEconomy(isNew: boolean) {
  const store = useAppStore.getState();
  store.addCoins(isNew ? COINS_NEW_DISCOVERY : COINS_REVISIT);
  if (isNew) store.addTreats(TREATS_NEW_DISCOVERY);
  store.registerCatch(todayKey());
}

/**
 * Re-identification threshold for DINOv2 cutout embeddings. Benchmarks:
 * same dog across views scores 0.79–0.94, different species near 0 —
 * so 0.80 recognizes revisits reliably with a wide safety margin.
 */
const SIMILARITY_THRESHOLD = 0.8;
const MAX_SIGNATURES_PER_CARD = 3;
/** A new view this dissimilar from stored ones is worth remembering. */
const NEW_VIEW_MAX_SIM = 0.93;

export type CaptureOutcome =
  | { outcome: "new_discovery"; card: PetCard; xp: number }
  | { outcome: "revisit"; cardId: string; level: number; candy: number; xp: number };

export interface CapturePayload {
  dataUrl: string;
  signature: number[];
  species: Species;
  breed: string | null;
  customName: string;
  stats: PetCard["stats"];
  cutoutUrl?: string | null;
}

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Submit a scan. Preferred path: Supabase Storage upload + `capture_pet` RPC
 * (pgvector uniqueness, community rarity, venue stamp). Fallback path (no
 * env vars / no session): identical uniqueness logic run locally against the
 * persisted collection, so the game is fully playable in demo mode.
 */
export async function submitCapture(payload: CapturePayload): Promise<CaptureOutcome> {
  const store = useAppStore.getState();

  if (hasSupabaseEnv()) {
    try {
      return await submitToSupabase(payload);
    } catch {
      // fall through to local mode (e.g. signed out) — never lose a catch
    }
  }
  return submitLocally(payload, store);
}

async function submitToSupabase(payload: CapturePayload): Promise<CaptureOutcome> {
  const { getSupabase } = await import("@/lib/supabase");
  const supabase = getSupabase();
  const store = useAppStore.getState();

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("No session");

  // Upload the photo to the owner's folder in the pet-photos bucket
  const blob = await (await fetch(payload.dataUrl)).blob();
  const path = `${userId}/${Date.now()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("pet-photos")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (uploadError) throw uploadError;
  const imageUrl = supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;

  const { data, error } = await supabase.rpc("capture_pet", {
    p_signature: payload.signature,
    p_species: payload.species,
    p_breed: payload.breed,
    p_custom_name: payload.customName,
    p_image_url: imageUrl,
    p_lat: store.position?.lat ?? null,
    p_lng: store.position?.lng ?? null,
    p_venue_id: store.checkedInVenue?.id ?? null,
    p_stats: payload.stats,
    p_threshold: SIMILARITY_THRESHOLD,
  });
  if (error) throw error;

  if (data.outcome === "revisit") {
    store.updateCard(data.card_id, { level: data.level, candy: data.candy });
    store.addXp(XP_FOR_REVISIT);
    awardCatchEconomy(false);
    return {
      outcome: "revisit",
      cardId: data.card_id,
      level: data.level,
      candy: data.candy,
      xp: XP_FOR_REVISIT,
    };
  }

  const card: PetCard = {
    id: data.card_id,
    serialNumber: data.serial_number,
    customName: payload.customName,
    species: payload.species,
    breed: payload.breed,
    rarity: data.rarity,
    imageUrl,
    lat: store.position?.lat ?? null,
    lng: store.position?.lng ?? null,
    venueName: store.checkedInVenue?.name ?? null,
    level: 1,
    candy: 1, // welcome treat
    stats: payload.stats,
    signature: payload.signature,
    cutoutUrl: payload.cutoutUrl ?? null,
    createdAt: new Date().toISOString(),
  };
  store.addCard(card);
  const xp = xpForDiscovery(card.rarity);
  store.addXp(xp);
  awardCatchEconomy(true);
  return { outcome: "new_discovery", card, xp };
}

function submitLocally(
  payload: CapturePayload,
  store: ReturnType<typeof useAppStore.getState>
): CaptureOutcome {
  // Species-gated re-identification: best cosine over ALL stored viewing
  // angles of each same-species card (multi-signature matching)
  let bestId: string | null = null;
  let bestSim = 0;
  for (const card of store.collection) {
    if (card.species !== payload.species) continue;
    const views = [card.signature, ...(card.signatures ?? [])].filter(
      (s): s is number[] => Boolean(s) && s!.length === payload.signature.length
    );
    for (const view of views) {
      const sim = cosineSimilarity(payload.signature, view);
      if (sim > bestSim) {
        bestSim = sim;
        bestId = card.id;
      }
    }
  }

  if (bestId && bestSim >= SIMILARITY_THRESHOLD) {
    const existing = store.collection.find((c) => c.id === bestId)!;
    const level = existing.level + 1;
    const candy = existing.candy + 3;
    // Remember this viewing angle if it adds new information
    const views = existing.signatures ?? [];
    const signatures =
      bestSim < NEW_VIEW_MAX_SIM && views.length < MAX_SIGNATURES_PER_CARD
        ? [...views, payload.signature]
        : views;
    store.updateCard(bestId, { level, candy, signatures });
    store.addXp(XP_FOR_REVISIT);
    awardCatchEconomy(false);
    return { outcome: "revisit", cardId: bestId, level, candy, xp: XP_FOR_REVISIT };
  }

  const nextSerial = store.collection.reduce((max, c) => Math.max(max, c.serialNumber), 0) + 1;
  const card: PetCard = {
    id: crypto.randomUUID(),
    serialNumber: nextSerial,
    customName: payload.customName,
    species: payload.species,
    breed: payload.breed,
    rarity: rollRarity(),
    imageUrl: payload.dataUrl,
    lat: store.position?.lat ?? null,
    lng: store.position?.lng ?? null,
    venueName: store.checkedInVenue?.name ?? null,
    level: 1,
    candy: 1, // welcome treat
    stats: payload.stats,
    signature: payload.signature,
    cutoutUrl: payload.cutoutUrl ?? null,
    createdAt: new Date().toISOString(),
  };
  store.addCard(card);
  const xp = xpForDiscovery(card.rarity);
  store.addXp(xp);
  awardCatchEconomy(true);
  return { outcome: "new_discovery", card, xp };
}
