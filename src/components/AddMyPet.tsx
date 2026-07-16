"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppStore, type Species, type PetCard } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import { syncOwnedPetToSupabase } from "@/lib/connections";

const SPECIES_OPTIONS: Species[] = ["dog", "cat", "rabbit", "bird", "other"];

/**
 * "Add My Pet" (spec §4, §5 "Add My Pet" starting path) — registers a pet
 * the user actually owns, distinct from a pet met out in the world. Owned
 * pets skip the capture/match pipeline entirely: no snack cost, no
 * encounter log, just an identity the user controls directly.
 */
export default function AddMyPet({ onClose }: { onClose: () => void }) {
  const addCard = useAppStore((s) => s.addCard);
  const collection = useAppStore((s) => s.collection);
  const authUser = useAppStore((s) => s.authUser);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const card: PetCard = {
      id: crypto.randomUUID(),
      serialNumber: collection.reduce((m, c) => Math.max(m, c.serialNumber), 0) + 1,
      customName: trimmed,
      nameConfirmed: true,
      species,
      breed: breed.trim() || null,
      traits: [],
      imageUrl: photo ?? "/icons/icon-192.png",
      lat: null,
      lng: null,
      venueName: null,
      owned: true,
      encounters: [],
      hatched: true,
      backdrop: Math.floor(Math.random() * 4),
      createdAt: new Date().toISOString(),
    };
    addCard(card);
    syncOwnedPetToSupabase(card); // no-ops offline/guest; makes the pet shareable via QR once signed in
    onClose();
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-ink/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-pop-in max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-card bg-white p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
        <h2 className="mb-1 text-2xl font-extrabold">Add My Pet 🏠</h2>
        <p className="mb-1 text-sm text-ink/50">Register a pet you own — no snack needed, no matching, just their profile.</p>
        {!authUser && (
          <p className="mb-4 text-xs font-bold text-tangerine-deep">Sign in to make this pet shareable via your Pet Family QR code.</p>
        )}
        {authUser && <div className="mb-4" />}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="tappable mx-auto mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-4 border-dashed border-sunny bg-cream text-4xl"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Selected" className="h-full w-full object-cover" />
          ) : (
            <span>📷</span>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-ink/40">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Their name"
            className="w-full rounded-full border-2 border-sunny bg-cream px-4 py-3 font-bold outline-none focus:border-tangerine"
          />
        </label>

        <div className="mb-3">
          <span className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-ink/40">Species</span>
          <div className="flex flex-wrap gap-2">
            {SPECIES_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpecies(s)}
                className={`tappable rounded-full px-3 py-2 text-sm font-bold ${
                  species === s ? "bg-tangerine text-white" : "bg-cream text-ink/60"
                }`}
              >
                {SPECIES_EMOJI[s]} {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <label className="mb-5 block">
          <span className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-ink/40">Breed (optional)</span>
          <input
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="e.g. Pembroke Corgi"
            className="w-full rounded-full border-2 border-sunny bg-cream px-4 py-3 font-bold outline-none focus:border-tangerine"
          />
        </label>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="tappable flex-1 rounded-full bg-cream px-4 py-3 font-extrabold text-ink shadow-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={handleSave}
            className="tappable flex-1 rounded-full bg-grass px-4 py-3 font-extrabold text-white shadow-md disabled:opacity-40"
          >
            Save Pet 🐾
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
