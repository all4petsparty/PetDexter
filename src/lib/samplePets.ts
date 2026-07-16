import { useAppStore, type PetCard, type Encounter } from "@/lib/store";

/**
 * A curated, fictional PetDex for visualizing the collection UI. Uses the
 * pre-rendered transparent cutouts in /public/demo/cutouts so cards show
 * proper stickers on their backdrops. Loaded on demand from Settings;
 * replaces the current local collection.
 */
type Sample = Omit<PetCard, "id" | "createdAt" | "encounters"> & { encounterCount: number };

const SAMPLES: Sample[] = [
  {
    serialNumber: 8, customName: "Reginald", nameConfirmed: true, species: "dog", breed: "Pembroke Corgi",
    traits: ["Playful", "Cuddly"], imageUrl: "/demo/dog.jpg", cutoutUrl: "/demo/cutouts/dog.png",
    lat: 14.5995, lng: 120.9842, venueName: null, owned: false, encounterCount: 2, hatched: true, backdrop: 0,
  },
  {
    serialNumber: 7, customName: "Duchess Mittens", nameConfirmed: true, species: "cat", breed: "Tabby",
    traits: ["Curious", "Chatty"], imageUrl: "/demo/cat.jpg", cutoutUrl: "/demo/cutouts/cat.png",
    lat: 14.55, lng: 121.02, venueName: "Pet Summit Philippines", owned: false, encounterCount: 4, hatched: true, backdrop: 2,
  },
  {
    serialNumber: 6, customName: "Captain Featherbeard", nameConfirmed: true, species: "bird", breed: "Scarlet Macaw",
    traits: ["Zoomy"], imageUrl: "/demo/bird.jpg", cutoutUrl: "/demo/cutouts/bird.png",
    lat: 14.61, lng: 120.99, venueName: null, owned: false, encounterCount: 1, hatched: true, backdrop: 3,
  },
  {
    serialNumber: 5, customName: "Hops", nameConfirmed: true, species: "rabbit", breed: "Cottontail",
    traits: ["Gentle", "Shy"], imageUrl: "/demo/rabbit.jpg", cutoutUrl: "/demo/cutouts/rabbit.png",
    lat: 14.59, lng: 121.01, venueName: null, owned: false, encounterCount: 3, hatched: true, backdrop: 1,
  },
  {
    serialNumber: 4, customName: "Zoomie", nameConfirmed: true, species: "dog", breed: "Corgi",
    traits: ["Zoomy", "Playful"], imageUrl: "/demo/dog2.jpg", cutoutUrl: "/demo/cutouts/dog2.png",
    lat: 14.58, lng: 121.0, venueName: null, owned: false, encounterCount: 1, hatched: true, backdrop: 3,
  },
  {
    serialNumber: 3, customName: "Biscuit", nameConfirmed: true, species: "cat", breed: "Tabby",
    traits: ["Sleepy"], imageUrl: "/demo/cat.jpg", cutoutUrl: "/demo/cutouts/cat.png",
    lat: 14.6, lng: 120.98, venueName: null, owned: false, encounterCount: 1, hatched: true, backdrop: 1,
  },
  {
    // a My Pet — owned, no encounter log
    serialNumber: 2, customName: "Mochi", nameConfirmed: true, species: "dog", breed: "Pembroke Corgi",
    traits: ["Food-motivated"], imageUrl: "/demo/dog.jpg", cutoutUrl: "/demo/cutouts/dog.png",
    lat: null, lng: null, venueName: null, owned: true, encounterCount: 0, hatched: true, backdrop: 3,
  },
  {
    // still processing — showcases the saving state
    serialNumber: 1, customName: "Sir Hops-a-Lot", nameConfirmed: false, species: "rabbit", breed: null,
    traits: [], imageUrl: "/demo/rabbit.jpg", cutoutUrl: null,
    lat: 14.6, lng: 121.0, venueName: null, owned: false, encounterCount: 1, hatched: false, backdrop: 0,
  },
];

/** Replace the local PetDex with the fictional showcase set. */
export function loadSamplePetDex() {
  const now = Date.now();
  const cards: PetCard[] = SAMPLES.map((s, i) => {
    const { encounterCount, ...rest } = s;
    const createdAt = new Date(now - i * 86_400_000).toISOString(); // spread over recent days
    const encounters: Encounter[] = Array.from({ length: encounterCount }, (_, j) => ({
      date: new Date(now - i * 86_400_000 - j * 5 * 86_400_000).toISOString(),
      lat: s.lat, lng: s.lng, venueName: s.venueName,
    }));
    return { ...rest, id: `sample-${s.serialNumber}`, createdAt, encounters };
  });
  useAppStore.getState().setCollection(cards);
}
