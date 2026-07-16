# PetDexter V2 — Implementation Plan

**Purpose of this document:** A complete, self-contained implementation plan for pivoting the existing PetDexter codebase to the new specification in `PetDexter_Complete_Wireframe_and_Game_Mechanics.md` ("the spec"). It is written for an implementing agent that has NOT seen the prior design conversations. Read the spec first, then this plan, then the referenced source files.

**The pivot in one sentence:** PetDexter changes from a Pokémon-style collect/boost/battle game (random rarity, stat feeding, candy, ascension, destructive Steal Wars) into a real-world social pet **memory and identity** platform: one canonical Pet record, many per-user Encounter records, name learning, delayed pet-parent matching, QR connections, pet-to-pet relationships, non-destructive games, quests, places, events, and adoption support.

---

## 0. Current codebase orientation

Stack: Next.js 15 App Router PWA · Zustand (persisted, `skipHydration`) · Supabase (Postgres + pgvector + Auth + Storage, migrations `supabase/migrations/0001–0005`) · Transformers.js on-device AI (ViT classifier, RMBG-1.4 cutout, DINOv2-small 384-d embeddings, all WASM-forced) · MapLibre GL + MapTiler · Tailwind custom festival palette · Vercel hosting (production: petdexter.vercel.app) · GitHub: all4petsparty/petcatch.

Key files as of today:

| Area | Files |
|---|---|
| Shell & nav | `src/components/AppShell.tsx`, `BottomNav.tsx`, `Welcome.tsx`, `Onboarding.tsx`, `WelcomeBack.tsx`, `GuestImport.tsx`, `Portal.tsx` |
| Capture | `src/views/CaptureView.tsx`, `src/lib/capture.ts`, `src/lib/vision.ts`, `src/components/CardReveal.tsx` |
| Collection | `src/views/CollectionView.tsx`, `src/components/CardDetail.tsx` |
| Economy/game | `src/lib/economy.ts`, `src/lib/food.ts`, `src/lib/evolution.ts`, `src/lib/cardFactory.ts`, `src/components/BoostStore.tsx`, `RewardedAd.tsx` |
| Battles | `src/lib/battle.ts`, `src/components/BattleArena.tsx` |
| Map/boards/profile | `src/views/MapView.tsx`, `LeaderboardsView.tsx`, `ProfileView.tsx`, `SettingsSheet.tsx` |
| State | `src/lib/store.ts` (Zustand; `PetCard` is the single card type) |
| Backend | `supabase/migrations/0001_petcatch_init.sql` … `0005_revisit_cooldown.sql`; RPCs `capture_pet`, `match_pet_signature`, `check_in`, `draw_champion`, `delete_account` |
| Auth | `src/lib/auth.ts` (Google popup for installed PWA, email magic link, guest mode) |

A prose description of every current mechanic is in `PetDexter_Game_Design_Summary.txt` — read it for behavioral context.

---

## 1. Keep / Modify / Remove decision table (concrete, file-level)

This expands the spec's §38 table into actionable items.

### KEEP (retain, mostly as-is)
| Capability | Files | Notes |
|---|---|---|
| Camera capture + animal/anti-spoof validation | `CaptureView.tsx`, `vision.ts` (`classifyFrame`, WASM pipelines, spoof word list, liveness) | The throw-the-treat gesture is optional flavor; keep the "instant save, background processing" architecture — it maps perfectly onto the spec's "SAVE ENCOUNTER NOW, match later" (§8). |
| DINOv2 embeddings + multi-angle recognition | `vision.ts` (`embedSignature`, `cosineSimilarity`), multi-signature storage pattern in `capture.ts` | Repurpose from "revisit dedupe for rewards" into the canonical-pet `matchPet()` service (§31, §35). Threshold 0.80, up to 3+ stored angles per pet — carry these values over. |
| Cutout/segmentation for card art | `vision.ts` (`segmentPet`), 4 mystical backdrops (`hatch-bg-0..3`) | Card art stays; it is presentation, not game value. |
| PWA auth flow | `auth.ts`, `Welcome.tsx`, `AppShell.tsx` gate sequencing | Google popup for standalone mode, magic link, guest mode — all still required (§5). |
| Full-screen modal portal pattern | `Portal.tsx`, `createPortal` usage in `CardDetail.tsx` | CSS-transform containing-block bug fix; every new full-screen overlay must use it. |
| Map foundation | `MapView.tsx` (MapLibre, clustering, check_in RPC) | Expand into canonical Places + Events (§21–22). |
| Rewarded media plumbing | `RewardedAd.tsx` (incl. sponsor branding prop) | Reconnect to branded discovery items (§26). |
| Guest import | `importGuest.ts`, `GuestImport.tsx` | Rework targets (encounters, not cards) but keep the one-time-import UX. |

### MODIFY
| Capability | Change |
|---|---|
| Snack cans (`economy.ts`: 4-cap, 3-hour refill) | Replace with **Discovery Snacks** (§26–27): first-login grant of 3 universal snacks + 1 friendship treat; small daily free grant; rewarded ads with strict daily/campaign caps; brand QR grants. Only *unknown-pet captures* cost a snack — QR exchange, reunions with connected pets, and adoption unlocks are free (§7). Remove the continuous 3-hour timer. |
| Rarity (`cardFactory.ts: rollRarity`, 10+ gate, server `compute_rarity`) | **Delete rarity as a pet attribute.** Rarity/tier styling moves to *achievements, quest rewards, and cosmetics* (§38). No pet is "mythic" — a card FRAME can be special because of what the user did (Familiarity level, event stamp, relationship milestone), never because of a random roll on the animal. |
| XP / trainer level (`levelFromXp`, 250 XP/level) | Rename to **Explorer Level**; XP renamed **Paw Points** (§27). Sources: valid encounters, name learning, reunions, connections, quests, place contributions. Sinks: cosmetics, deck themes, optional quest entries. Keep the level math initially. |
| Achievements (`ACHIEVEMENTS` — flat catch-count milestones) | Rebuild into the 9 spec categories (§28): Discovery, Memory, Connection, Relationship, Place, Event, Adoption, Community, Group. Badge-based, permanent, never spent. |
| Silly name generator (`sillyName`) | Demote to *suggested temporary nickname* for Unidentified Discoveries. The primary flow is the **real-name prompt** (§9). Never auto-assign a silly name over a user-entered name. |
| Onboarding (6 slides) | Cut to 4 (§5): Meet real pets / Remember names & places / Connect now or later / Play quests & help adoption pets. Keep the model-download progress bar function. After sign-in add the 3-path chooser: Add My Pet / Start Discovering / Explore Nearby. |
| Bottom nav (`BottomNav.tsx`) | Re-label & re-scope 5 tabs (§2): **Discover** (was Map), **PetDex**, **Meet!** (was Catch!, stays raised/center), **Play** (was Ranks), **Me**. |
| Leaderboards | Move under Play; rebuild on *verified unique-pet counts* and event categories (§24) once the encounter model exists. |
| WelcomeBack nudge | Retarget: next quest progress, pending match confirmations, expiring quests — not "low on cans." |

### REMOVE (delete outright)
| Capability | Files to delete / strip |
|---|---|
| Steal Wars battles (demo + server path) | `src/lib/battle.ts`, `src/components/BattleArena.tsx`, battle trigger in `CaptureView.tsx`, `battles` table + `draw_champion` RPC usage (schema can be dropped in a migration). The spec explicitly forbids destructive competition (§30, §39). |
| Battle Power / Cost | `battleStats`, cost/power/candy panel in `CardDetail.tsx` |
| Evolution / Ascension / star ranks | `src/lib/evolution.ts`, `starRank`, Ascension panel in `CardDetail.tsx`, star badges in `CollectionView.tsx` |
| Per-card candy | `candy` field, +3-candy revisit reward, feed-overflow-to-candy in `food.ts` |
| Feed-to-boost stat economy | `feedPet`, stat gains, match multipliers in `food.ts`; Feed panel in `CardDetail.tsx`; `BoostStore.tsx` in its current form (rebuild later as the branded **item** store, §26 — items as discovery keys, not stat boosters) |
| Random personality stats as game numbers | `randomStats`, chonkiness/friendliness/energy bars, tribes/abilities (`tribesFor`, `abilityFor`) — replace with owner/community-entered **traits** (choose up to 3, §9). Playful personality copy can stay as flavor text only. |
| Coins & Treats currencies | Collapse into Paw Points (§27). Remove `buyCanWithCoins`, treat costs, coin/treat grants. |
| Revisit rewards & 4-hour cooldown | The whole level+candy+XP revisit payout in `capture.ts` / migration 0005. Revisits become **Reunions**: they append an encounter to the same pet's timeline, advance Familiarity, and never mint value. Same-day duplicate = "You already met this pet today" (§8). The anti-farming *recognition* machinery stays; the *reward* it gated disappears. |
| Card level (revisit counter) | `level` field — superseded by Familiarity (§13). |

### BUILD (new systems, none exist today)
Provisional→canonical identity merge · owned pet profiles with privacy/matching settings · name/identity prompt · delayed pet-parent discovery + claims · QR exchange + Pet Family calling card · Familiarity progression · pet-to-pet relationships · decks · PetDex Play games · quest engine · place canonicalization · event mode · adoption PetDex + org verification · admin console · notifications.

---

## 2. Target data model (Supabase)

The spec's §34 schema is the source of truth. The single most important structural change:

> **Today:** one `pet_cards` row = one owned collectible.
> **Target:** one canonical `pet_profiles` row (owned or provisional) + many per-user `encounters` rows referencing it. Users own *relationships to* pets and their own encounter history — never other people's pets (§4).

### Migration strategy — recommend a v2 schema, not incremental patches
Create `supabase/migrations/0006_v2_identity_schema.sql` (and successors) that:

1. Creates all new tables per §34: `pet_profiles`, `pet_images` (with `embedding vector(384)`, `angle_type`), `encounters`, `provisional_pets`, `connections`, `pet_relationships`, `places` (with aliases, geofence, `parent_place_id`), `events`, `quests`, `quest_progress`, `organizations`, `adoption_pets`, `decks`, `deck_cards`, `inventory`, `campaign_items`, `reports`. Add `users` profile extensions (privacy, explorer_level).
2. **Data migration for existing users:** each existing `pet_cards` row becomes (a) one `provisional_pets` + `pet_profiles` row (status: unclaimed/named-by-discoverer, name = current customName, species/breed carried over, images + signatures moved to `pet_images`) and (b) one `encounters` row (occurred_at = createdAt, place/venue carried over, status verified). Card `level` N > 1 optionally expands to N reunion encounters at unknown dates — simpler: store one encounter and a `legacy_reunions` count on the encounter's metadata. Drop `rarity`, `stats`, `candy`, `starRank`, `last_revisit_at` semantics.
3. Drops `battles` and battle RPCs; replaces `capture_pet` with the new `capture_encounter` RPC family (§35): `captureEncounter`, `matchPet`, `createProvisionalPet`, `mergeProvisionalWithCanonical`, `recordReunion`, `requestPetParentConnection`, `claimPet`, `resolvePlace`, `evaluateQuestProgress`, `validateUniquePetForQuest`.
4. Row-level security throughout: pet identity fields writable only by owner; encounters writable only by their author; adoption pets writable only by verified org admins; matching honors per-pet `matching_opt_in` and visibility (§10, §30).

Client store (`store.ts`) restructures accordingly:
- `collection: PetCard[]` → `pets: Record<petId, PetSummary>` + `encounters: Encounter[]` + `myPets: OwnedPetProfile[]`.
- Keep zustand-persist + `skipHydration` pattern and the guest-mode local-first behavior: offline captures create local draft encounters that sync + match later (§36).

---

## 3. Phased implementation plan

Follows the spec's MVP ladder (§37) with an added Phase 0. Each phase ends shippable. Per-phase acceptance criteria are drawn from §39.

### PHASE 0 — Teardown & reframe (1 session)
Remove everything in the REMOVE table above so the shipped app no longer contradicts the new positioning; re-label the nav; simplify currency display to Paw Points + Discovery Snacks (temporary flat daily grant of e.g. 5 snacks/day, refined in Phase 6); cut onboarding to 4 slides; update Welcome tagline to "Meet pets. Remember them. Collect their stories."
- CardDetail interim state: photo/art, name, breed, traits placeholder, "First met" date/place, encounter count. No stats/power/rarity.
- Keep local capture working end-to-end (capture → validate → save encounter locally → appears in PetDex).
- **Accept when:** app builds, no battle/feed/evolve/rarity UI reachable, capture→PetDex loop works, tests/typecheck pass.

### PHASE 1 — Identity & Encounters (spec MVP 1) — the core rebuild
1. **Owned pet profiles**: "Add My Pet" flow (name, species, breed, traits, photos from camera roll or capture, visibility: public/limited/connections-only/private, `matching_opt_in`). Multiple pets per user. Life status incl. memorial (§4, §36).
2. **Capture → name prompt**: after validation, show §9's screen — name field, "I don't know", optional breed confirm, up to 3 traits, notes. Saving creates a local encounter + provisional pet immediately (offline-safe), then syncs.
3. **Canonical matching service**: port the embedding-match logic into `matchPet` RPC — embedding similarity (primary), species/breed consistency (hard filter), name similarity + location/time (contextual boosts only), per §31's signal table. Outcomes per §8's table: high-confidence match → "We may know this pet" connect prompt; possible match → pending; already-in-PetDex → Reunion screen; no match → named/unidentified discovery; same-day duplicate → no new unique; spoof → reject + refund snack on technical failure.
4. **Reunions**: re-capture of a known pet appends an encounter (date, place, event), advances Familiarity, never duplicates (§39).
5. **Familiarity levels 0–5** (§13): per-user-per-pet, computed from encounter history (name recorded, distinct days, distinct places/events, 30-day span). Unlocks card visuals + features, no canonical-stat effect.
6. **QR exchange**: every user gets a Pet Family calling card QR (§15); scanning creates a free, verified connection and imports the pets the owner elected to share.
7. **PetDex library v2** (§16): tabs My Pets / Pets Met / Community / Adoption(placeholder); search by name, parent, breed, place; collection groupings.
8. **Card merge**: when a provisional pet matches a canonical one (or is claimed), merge preserves the discoverer's photo, entered name, date, place, notes as their encounter history (§10, §39).
- **Accept when (§39):** photograph→name→save→searchable; later canonical link preserves encounter; "Not this pet" rejection sticks; parent controls matching participation; QR exchange free; repeated photos of one pet ≠ multiple uniques; revisit = reunion on same card.

### PHASE 2 — Connections & Relationships (spec MVP 2)
1. Delayed pet-parent discovery notifications + confirmation flows per the §10 privacy matrix (auto / confirm-required / connections-only / off / private).
2. Claim This Pet flow (§11): sign-in required, evidence submission, auto-approve on strong multi-signal alignment else moderation queue; Pet Reuniter badge for the discoverer; share cards omit precise live location.
3. Pet-to-pet relationships (§14): the 8 types (Pawsome Friend, Playdate Pal, Adventure Buddy, Neighborhood Bestie, Furboo, Furever Love, Sibling at Heart, Housemate), dual-parent confirmation, relationship levels First Hello → Furever Bond with cosmetic-only rewards.
4. Pet timelines & memories on CardDetail (§12): first met, encounters/places/events counts, Familiarity meter, Record Reunion / Add Memory / Share Card actions.
5. Decks v1 (§17): personal + memory decks, multi-deck membership, privacy-respecting sharing.
- **Accept when:** two parents can mutually confirm a Furboo; declined match keeps a private unconnected discovery; share outputs obey privacy settings.

### PHASE 3 — Places & Quests (spec MVP 3)
1. Place canonicalization (§21): community place submission, dedupe by GPS radius + name similarity + provider ID, aliases, parent-child hierarchy, admin merge.
2. Check-ins bind encounters to places; Discover tab rebuild (§6): search, filters, Near You, Today's Discovery, map with place/quest pins.
3. Quest engine (§19–20): scope/time/geofence/eligibility/objective/uniqueness/verification/reward/inventory/anti-fraud fields; `evaluateQuestProgress` + `validateUniquePetForQuest` enforcing the §31 counting rules (one canonical pet per user per quest; same-day duplicates never count; pending identity = provisional progress with held reward).
4. Reward redemption via single-use QR/staff code with expiry.
- **Accept when:** the X Café example quest (§20) is fully configurable and playable; unique-pet validation holds under duplicate-photo attack.

### PHASE 4 — Event Mode (spec MVP 4)
Events as date-bound overlays on parent places (`geofence_override`, zones); event check-in suggestion; Discover switches to event mode; the §23 quest catalog (breed quests, connection quests, Secret Pawstar, team quests, community goals); §24 leaderboards with validation + LED/anonymized output; post-event auto-generated Event PetDex recap deck.

### PHASE 5 — Adoption & Organizations (spec MVP 5)
Verified-org model (`organizations`), AWO portal (manage adoption pets, QR collections, inquiries, adopted-status handling per §25), adoption tab in PetDex, advocate achievements, strict rules: only verified orgs create adoption profiles, no edit rights for users, location privacy.

### PHASE 6 — Brand Campaign Platform (spec MVP 6)
Branded inventory items as discovery keys (§26 table: species snacks, Friendship Treat, Breed Finder, Adoption Token, Place Pass, Event Mystery Item, cosmetics); acquisition routes with caps (rewarded video by user-chosen item, product/booth QR, brand quests, optional partner purchase, daily free grant); brand/venue/event/AWO/community portals (§33); admin console modules (§32).

### PetDex Play games (cross-phase, start in Phase 2, expand at Phase 4)
§18's ten games. Build order: Who's That Pet? and Where Did We Meet? first (solo, purely local data — good early retention); Pet Family Match and Breed Bingo with Phase 3; event/team games with Phase 4. Hard rule enforced in code review: no game transfers ownership, deletes a card, exposes hidden data, or ranks real pets by worth.

---

## 4. Cross-cutting requirements

- **Privacy & safety (§30)** are architectural, not a feature: default-hidden live locations, opt-in matching at pet level, display names only, minors' guardian controls, human-face blurring in share outputs, report flows (wrong identity, privacy, stolen image, unsafe location, welfare, quest fraud). Bake into RLS + share-card generation from Phase 1.
- **Edge states (§36)**: offline drafts, no-location manual place pick, no-snack fallbacks, dual claims freeze, co-parents, renames preserving the discoverer's entered name, admin merges preserving everything, memorial status, account deletion per privacy policy.
- **Notifications (§29)**: in-app first (the WelcomeBack overlay pattern), Web Push later; every type individually controllable.
- **Testing pattern**: the repo has an established Node/tsx approach for store/logic tests (localStorage polyfill + dynamic `import()` after the polyfill — static imports get hoisted above it and break). Extract pure logic (matching, quest validation, familiarity computation) into testable modules like the existing `resolveMatchAndReward` split. `npx tsc --noEmit` and `npm run build` must pass every phase.
- **Verification limitation**: browser preview tooling has been unavailable in recent sessions; if so again, state plainly that UI is logic-verified but not visually verified, and ask the user to check on device.
- **Deployment**: commit to `https://github.com/all4petsparty/petcatch.git` (auth is set up as the repo owner) and deploy with `npx vercel deploy --prod --yes`. Never commit `.env.local`.

---

## 5. Open product decisions (ask the user before or during Phase 0/1)

1. **Existing live users' collections**: migrate every current card into provisional pets + encounters (recommended, per §2 above), or offer a clean slate with an optional "import my old PetDex" step?
2. **Throw-the-treat capture gesture**: DECIDED (user-confirmed) — keep the throw-a-treat gesture as the way to "Meet" a pet, rewording all copy from "catch" to "meet." The thrown treats are the Discovery Snack items themselves and must be designed so they can be either generic treats or brand-associated treats added later via the Phase 6 branded-inventory system (§26) — i.e., the capture gesture should render whichever treat item the user has selected/owns.
3. **Community Pets** (§4): in scope for Phase 1's PetDex tabs or deferred? Recommendation: show the tab, populate in Phase 3 when places exist (community pets are area-anchored).
4. **Paw Points conversion**: grant existing users Paw Points equal to their current XP (recommended — preserves Explorer Level), and simply zero out coins/treats/candy with a one-time "thanks for early-testing" cosmetic badge?
5. **Card art backdrops**: keep the 4 mystical hatch backdrops as the default look, or move them behind Familiarity levels as earned upgrades (§12 says visual upgrades are earned)? Recommendation: default = clean photo card; backdrops unlock at Familiarity 2+.

---

## 6. Definition of done for the whole pivot

All 14 acceptance criteria in spec §39 pass, plus:
- Nothing in the UI or schema implies a real pet has randomized worth, combat power, or can be lost through play.
- The §40 game loop is traceable in the product: Discover → Identify → Remember → Connect → Reconnect → Relate → Play → Share.
- Tagline everywhere: "Meet pets. Remember them. Collect their stories."
