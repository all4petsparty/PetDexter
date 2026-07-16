-- ============================================================
-- PetDexter V2 — identity & encounter schema (Phase 1)
--
-- NOT YET EXECUTED. This migration is written as scaffolding for the
-- backend half of Phase 1 (see PetDexter_V2_Implementation_Plan.md §2) —
-- applying it requires Supabase project access this session did not have
-- (the supabase MCP connector needs the user to authorize it first via
-- `claude mcp` / /mcp in an interactive session). The client-side app in
-- this commit runs entirely on local per-user PetCard records with an
-- embedded `encounters` array; it does not call any of the RPCs below yet.
--
-- What changes conceptually vs. migrations 0001–0005: today one
-- `pet_cards` row IS the collectible. From here on, a `pet_profiles` row is
-- the canonical pet (owned or provisional), and every meeting a user has
-- with it is a separate `encounters` row — a user never owns another
-- person's pet, they own a relationship + history to the canonical record.
-- ============================================================

-- ---- Canonical pet identity -----------------------------------------

create table if not exists public.pet_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id), -- null while provisional/unclaimed
  canonical_name text not null,
  species public.species_type not null,
  breed text,
  traits text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public','limited','connections_only','private')),
  matching_opt_in boolean not null default true,
  life_status text not null default 'active' check (life_status in ('active','memorial')),
  status text not null default 'unclaimed' check (status in ('owned','connected','unclaimed','community','adoption','memorial')),
  created_at timestamptz not null default now()
);

create table if not exists public.pet_images (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  image_url text not null,
  embedding vector(384),
  angle_type text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pet_images_pet_id_idx on public.pet_images(pet_id);

-- ---- Encounters (per-user meeting history) ---------------------------

create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  pet_id uuid references public.pet_profiles(id), -- null while provisional_pet_id is set instead
  provisional_pet_id uuid,
  photo_url text,
  entered_name text,
  occurred_at timestamptz not null default now(),
  place_id uuid,
  event_id uuid,
  status text not null default 'new' check (status in ('new','revisit','possible_duplicate','pending_match','verified')),
  match_confidence text check (match_confidence in ('likely','possible','none'))
);
create index if not exists encounters_user_id_idx on public.encounters(user_id);
create index if not exists encounters_pet_id_idx on public.encounters(pet_id);

create table if not exists public.provisional_pets (
  id uuid primary key default gen_random_uuid(),
  suggested_name text,
  species public.species_type not null,
  breed text,
  traits text[] not null default '{}',
  canonical_candidate_id uuid references public.pet_profiles(id),
  community_status text not null default 'unreviewed'
);

-- ---- Connections & relationships --------------------------------------

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id),
  user_b uuid not null references auth.users(id),
  source text not null check (source in ('qr','match')),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);

create table if not exists public.pet_relationships (
  id uuid primary key default gen_random_uuid(),
  pet_a uuid not null references public.pet_profiles(id),
  pet_b uuid not null references public.pet_profiles(id),
  type text not null check (type in (
    'pawsome_friend','playdate_pal','adventure_buddy','neighborhood_bestie',
    'furboo','furever_love','sibling_at_heart','housemate'
  )),
  status text not null default 'requested' check (status in ('requested','accepted','declined','paused')),
  level int not null default 0,
  confirmed_by_a boolean not null default false,
  confirmed_by_b boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---- Places & events (extends 0001's simpler venues table later) -----

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  aliases text[] not null default '{}',
  category text,
  lat double precision,
  lng double precision,
  geofence_radius_m int,
  parent_place_id uuid references public.places(id),
  verification_status text not null default 'community' check (verification_status in ('community','claimed','verified','merged','archived'))
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place_id uuid references public.places(id),
  starts_at timestamptz,
  ends_at timestamptz,
  hours jsonb,
  geofence_override jsonb,
  status text not null default 'draft' check (status in ('draft','published','active','ended','archived'))
);

-- ---- Quests -------------------------------------------------------------

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('global','event','place','organization','brand','group','personal')),
  scope_id uuid,
  objective_json jsonb not null,
  validation_json jsonb not null default '{}',
  reward_json jsonb not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz
);

create table if not exists public.quest_progress (
  user_id uuid not null references auth.users(id),
  quest_id uuid not null references public.quests(id),
  progress_json jsonb not null default '{}',
  status text not null default 'active' check (status in ('available','joined','active','completed','claimed','expired')),
  verified_at timestamptz,
  primary key (user_id, quest_id)
);

-- ---- Organizations & adoption ------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('awo','brand','venue','event_organizer','community')),
  name text not null,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','suspended')),
  admin_users uuid[] not null default '{}'
);

create table if not exists public.adoption_pets (
  pet_id uuid primary key references public.pet_profiles(id),
  organization_id uuid not null references public.organizations(id),
  adoption_status text not null default 'available' check (adoption_status in ('available','adopted')),
  inquiry_url text,
  published_at timestamptz not null default now()
);

-- ---- Decks --------------------------------------------------------------

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('user','group','event')),
  owner_id uuid not null,
  title text not null,
  visibility text not null default 'private' check (visibility in ('private','link','public','group')),
  deck_type text not null check (deck_type in ('personal','place','event','relationship','adoption','quest','group','memory'))
);

create table if not exists public.deck_cards (
  deck_id uuid not null references public.decks(id) on delete cascade,
  pet_id uuid not null references public.pet_profiles(id),
  encounter_id uuid references public.encounters(id),
  sort_order int not null default 0,
  primary key (deck_id, pet_id)
);

-- ---- Campaign inventory & reports ---------------------------------------

create table if not exists public.campaign_items (
  id uuid primary key default gen_random_uuid(),
  sponsor_org_id uuid references public.organizations(id),
  item_type text not null,
  rules jsonb not null default '{}',
  daily_cap int,
  campaign_cap int
);

create table if not exists public.inventory (
  user_id uuid not null references auth.users(id),
  item_id uuid not null references public.campaign_items(id),
  quantity int not null default 0,
  expiry timestamptz,
  primary key (user_id, item_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id),
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Deliberately NOT included yet, pending product decisions in
-- PetDexter_V2_Implementation_Plan.md §5:
--   - data migration of existing pet_cards rows into pet_profiles +
--     encounters (decision 1: migrate vs. clean slate)
--   - RLS policies for every table above
--   - the captureEncounter / matchPet / mergeProvisionalWithCanonical /
--     requestPetParentConnection / claimPet / recordReunion RPC family
--   - dropping the old rarity/candy/stats/battles objects from 0001–0002
-- ============================================================
