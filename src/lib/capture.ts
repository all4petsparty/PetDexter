import { useAppStore, type PetCard, type Species } from "@/lib/store";
import { cosineSimilarity } from "@/lib/vision";
import { rollRarity, xpForDiscovery, XP_FOR_REVISIT } from "@/lib/cardFactory";

const SIMILARITY_THRESHOLD = 0.95;

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
  return { outcome: "new_discovery", card, xp };
}

function submitLocally(
  payload: CapturePayload,
  store: ReturnType<typeof useAppStore.getState>
): CaptureOutcome {
  // Same cosine-similarity uniqueness rule as match_pet_signature(), run on-device
  let bestId: string | null = null;
  let bestSim = 0;
  for (const card of store.collection) {
    if (!card.signature) continue;
    const sim = cosineSimilarity(payload.signature, card.signature);
    if (sim > bestSim) {
      bestSim = sim;
      bestId = card.id;
    }
  }

  if (bestId && bestSim >= SIMILARITY_THRESHOLD) {
    const existing = store.collection.find((c) => c.id === bestId)!;
    const level = existing.level + 1;
    const candy = existing.candy + 3;
    store.updateCard(bestId, { level, candy });
    store.addXp(XP_FOR_REVISIT);
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
  return { outcome: "new_discovery", card, xp };
}
