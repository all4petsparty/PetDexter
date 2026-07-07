# PetCatch 🐾

A mobile-first PWA pet collection game: scan real-world pets with on-device AI, mint playful digital trading cards, and check in at pet-friendly venues.

**Stack (100% free tiers):** Next.js PWA on Vercel · Supabase (Postgres + pgvector + Auth + Storage) · MapLibre GL + MapTiler · Transformers.js on-device vision.

## Getting started

```bash
npm install
npm run dev
```

## Supabase setup

1. Create a free project at supabase.com.
2. Run the migration: `supabase/migrations/0001_petcatch_init.sql` (SQL editor, or `supabase db push` with the CLI).
3. Copy `.env.example` → `.env.local` and fill in your project URL + anon key.

The migration installs pgvector and creates:

| Object | Purpose |
| --- | --- |
| `profiles`, `venues`, `pet_cards` | Core tables (RLS enabled) |
| `match_pet_signature()` | Cosine-similarity uniqueness check (HNSW index, 0.95 threshold) |
| `capture_pet()` | Single RPC: revisit (level-up + candy) vs. new discovery (mints card, computes rarity) |
| `check_in()` | Haversine venue check-in within each venue's radius (default 50 m) |
| `compute_rarity()` | Breed frequency → Common…Mythic tier |
| `leaderboard_global/species/breed`, `map_discoveries` | Read views for ranks + community map |
| `pet-photos` bucket | Public-read, owner-scoped uploads |

**Embedding dimension is 768** (ViT-base CLS token via Transformers.js). If you change the client model, change `vector(768)` in the migration to match.

## Build progress

- [x] Step 1 — PWA scaffold, manifest, service worker, bottom-nav state layout (Zustand)
- [x] Step 2 — Supabase migration: pgvector schema + matching/check-in/capture RPCs
- [x] Step 3 — Transformers.js capture pipeline (classification, anti-spoofing, embeddings)
- [x] Step 4 — MapLibre discovery map, card-generation engine, live leaderboards

## Demo mode

Without Supabase env vars the game still fully works: captures run the same
cosine-similarity uniqueness check locally, cards persist to localStorage,
and the map uses free MapLibre demo tiles (world-level detail only). Add a
`NEXT_PUBLIC_MAPTILER_KEY` for street-level maps and Supabase keys for the
community layer (shared map pins, leaderboards, venue check-ins).
