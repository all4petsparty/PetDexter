import { useAppStore, type PetCard, type Encounter } from "@/lib/store";

/**
 * Pet Family QR connection (spec §7, §15). Two halves:
 *  - syncOwnedPetToSupabase: pushes a locally-added "My Pet" up to
 *    pet_profiles/pet_images so it exists somewhere another account can
 *    read it. Silently no-ops when signed out or offline — local-only
 *    users can still use My Pets, they just aren't shareable yet.
 *  - connectWithOwner: the scan-side call. Hits the
 *    request_pet_family_connection RPC (migration 0007) with the
 *    scanned owner's user id, gets back their display name and every
 *    pet they've made shareable, and imports those pets locally.
 */

const QR_PREFIX = "petdexter:connect:";

/** The payload encoded in the current user's Pet Family QR code. */
export function myConnectPayload(): string | null {
  const uid = useAppStore.getState().authUser?.id;
  return uid ? `${QR_PREFIX}${uid}` : null;
}

/** Extract the owner id from a scanned/typed QR payload, or null if not ours. */
export function parseConnectPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(QR_PREFIX)) return null;
  const id = trimmed.slice(QR_PREFIX.length);
  // crude UUID sanity check
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

/** Upload a data: URL to the pet-photos bucket and return its public URL. */
async function ensureUploaded(imageUrl: string, userId: string): Promise<string> {
  if (!imageUrl.startsWith("data:")) return imageUrl;
  const { getSupabase } = await import("@/lib/supabase");
  const supabase = getSupabase();
  const blob = await (await fetch(imageUrl)).blob();
  const path = `${userId}/mypet_${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("pet-photos").upload(path, blob, { contentType: blob.type || "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;
}

/**
 * Push a My Pet up to pet_profiles so it can be shared via QR. Uses the
 * card's own local id as the remote row id, so re-saves upsert cleanly.
 * No-ops (does not throw) if the user is signed out or Supabase isn't
 * configured — My Pets still work locally either way.
 */
export async function syncOwnedPetToSupabase(card: PetCard): Promise<void> {
  const authUser = useAppStore.getState().authUser;
  if (!authUser) return;
  try {
    const { getSupabase } = await import("@/lib/supabase");
    const supabase = getSupabase();
    const { error: upsertErr } = await supabase.from("pet_profiles").upsert({
      id: card.id,
      owner_user_id: authUser.id,
      canonical_name: card.customName,
      species: card.species,
      breed: card.breed,
      traits: card.traits,
      visibility: "public",
      status: "owned",
    });
    if (upsertErr) throw upsertErr;

    if (card.imageUrl && !card.imageUrl.startsWith("/")) {
      const url = await ensureUploaded(card.imageUrl, authUser.id);
      await supabase.from("pet_images").insert({ pet_id: card.id, image_url: url, verified: true });
    }
    useAppStore.getState().updateCard(card.id, { remoteId: card.id });
  } catch (err) {
    console.warn("[petdexter] couldn't sync My Pet to Supabase (it still works locally):", err);
  }
}

/**
 * Push a newly-met pet (or a reunion's new encounter) up to Supabase so it
 * appears on the community Discover map and leaderboards. No-ops silently
 * when signed out — local-only/guest users keep the full local PetDex
 * experience, just without community visibility. Note: this does NOT yet
 * implement server-side canonical matching across different users meeting
 * the same real pet (that's still deferred Phase 1 work) — each signed-in
 * user's discovery becomes its own pet_profiles row for now.
 */
export async function syncMetPetToSupabase(card: PetCard): Promise<void> {
  const authUser = useAppStore.getState().authUser;
  if (!authUser) return;
  try {
    const { getSupabase } = await import("@/lib/supabase");
    const supabase = getSupabase();
    const remoteId = card.remoteId ?? crypto.randomUUID();

    if (!card.remoteId) {
      const { error: insertErr } = await supabase.from("pet_profiles").insert({
        id: remoteId,
        owner_user_id: authUser.id,
        canonical_name: card.customName,
        species: card.species,
        breed: card.breed,
        traits: card.traits,
        visibility: "public",
        status: "unclaimed",
      });
      if (insertErr) throw insertErr;

      const photo = card.cutoutUrl ?? card.imageUrl;
      if (photo && !photo.startsWith("/")) {
        const url = await ensureUploaded(photo, authUser.id);
        await supabase.from("pet_images").insert({ pet_id: remoteId, image_url: url, verified: true });
      }
      useAppStore.getState().updateCard(card.id, { remoteId });
    }

    const latest = card.encounters.at(-1);
    if (latest) {
      await supabase.from("encounters").insert({
        user_id: authUser.id,
        pet_id: remoteId,
        occurred_at: latest.date,
        lat: latest.lat,
        lng: latest.lng,
        status: card.encounters.length > 1 ? "revisit" : "new",
      });
    }
  } catch (err) {
    console.warn("[petdexter] couldn't sync met pet to Supabase (it still works locally):", err);
  }
}

export interface ConnectResult {
  ownerName: string;
  imported: number;
  skipped: number;
}

/**
 * Scan-side of the exchange: call the connection RPC with the owner's id
 * and import every pet they've shared into the local PetDex (Pets Met,
 * tagged with who they came from).
 */
export async function connectWithOwner(ownerId: string): Promise<ConnectResult> {
  const { getSupabase } = await import("@/lib/supabase");
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("request_pet_family_connection", { p_owner_id: ownerId });
  if (error) throw new Error(error.message);

  const ownerName: string = data?.owner_name ?? "a pet parent";
  const pets: Array<{ id: string; name: string; species: PetCard["species"]; breed: string | null; traits: string[]; image_url: string | null }> =
    data?.pets ?? [];

  const store = useAppStore.getState();
  let imported = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const p of pets) {
    if (store.collection.some((c) => c.remoteId === p.id)) { skipped++; continue; } // already connected
    const encounter: Encounter = { date: now, lat: null, lng: null, venueName: null };
    const card: PetCard = {
      id: crypto.randomUUID(),
      serialNumber: store.collection.reduce((m, c) => Math.max(m, c.serialNumber), 0) + 1,
      customName: p.name,
      nameConfirmed: true,
      species: p.species,
      breed: p.breed,
      traits: p.traits ?? [],
      imageUrl: p.image_url ?? "/icons/icon-192.png",
      lat: null, lng: null, venueName: null,
      owned: false,
      encounters: [encounter],
      connectedFrom: ownerName,
      remoteId: p.id,
      hatched: true,
      backdrop: Math.floor(Math.random() * 4),
      createdAt: now,
    };
    store.addCard(card);
    imported++;
  }

  return { ownerName, imported, skipped };
}
