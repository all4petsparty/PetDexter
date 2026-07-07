-- ============================================================
-- PetCatch — unified initial schema
-- Supabase (PostgreSQL) + pgvector
--
-- Embedding dimension: 768 — matches the CLS token embedding of
-- Transformers.js image feature-extraction models (e.g. ViT-base /
-- google/vit-base-patch16-224). If you swap models client-side,
-- update vector(768) everywhere below to match.
-- ============================================================

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
create type public.species_type as enum ('dog', 'cat', 'rabbit', 'bird', 'other');

create type public.rarity_tier as enum
  ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic');

-- ------------------------------------------------------------
-- Profiles (1:1 with Supabase Auth users)
-- ------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique not null check (char_length(username) between 3 and 24),
  avatar_url    text,
  region        text,                          -- e.g. 'PH-Manila' for regional boards
  total_catches integer not null default 0,    -- denormalized counter, trigger-maintained
  created_at    timestamptz not null default now()
);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      'trainer_' || substr(new.id::text, 1, 8)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Venues (B2B partner locations: pet cafes, shops, conventions)
-- ------------------------------------------------------------
create table public.venues (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  category         text not null default 'pet_shop',  -- pet_shop | pet_cafe | event | park
  lat              double precision not null,
  lng              double precision not null,
  checkin_radius_m integer not null default 50,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Pet cards (the collectibles)
-- ------------------------------------------------------------
create sequence public.pet_card_serial;

create table public.pet_cards (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  serial_number bigint not null default nextval('public.pet_card_serial'),
  custom_name   text not null,
  species       public.species_type not null,
  breed         text,
  rarity        public.rarity_tier not null default 'common',
  image_url     text not null,
  signature     vector(768) not null,          -- on-device embedding, uniqueness key
  lat           double precision,
  lng           double precision,
  venue_id      uuid references public.venues (id) on delete set null,
  level         integer not null default 1,
  candy         integer not null default 0,
  stats         jsonb not null default '{}'::jsonb,  -- { chonkiness, friendliness, energy }
  created_at    timestamptz not null default now()
);

create index pet_cards_signature_idx on public.pet_cards
  using hnsw (signature vector_cosine_ops);
create index pet_cards_owner_idx   on public.pet_cards (owner_id);
create index pet_cards_species_idx on public.pet_cards (species);
create index pet_cards_breed_idx   on public.pet_cards (breed);
create index pet_cards_geo_idx     on public.pet_cards (lat, lng);

-- Keep profiles.total_catches in sync
create or replace function public.bump_total_catches()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set total_catches = total_catches + 1 where id = new.owner_id;
  elsif tg_op = 'DELETE' then
    update public.profiles set total_catches = greatest(total_catches - 1, 0) where id = old.owner_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger pet_cards_count_trigger
  after insert or delete on public.pet_cards
  for each row execute function public.bump_total_catches();

-- ------------------------------------------------------------
-- Rarity: rarer breeds (fewer community sightings) rank higher
-- ------------------------------------------------------------
create or replace function public.compute_rarity(p_breed text)
returns public.rarity_tier
language plpgsql stable security definer set search_path = public as $$
declare
  breed_count bigint;
begin
  select count(*) into breed_count
  from public.pet_cards
  where breed is not distinct from p_breed;

  return case
    when breed_count = 0   then 'mythic'
    when breed_count < 5   then 'legendary'
    when breed_count < 20  then 'epic'
    when breed_count < 75  then 'rare'
    when breed_count < 250 then 'uncommon'
    else 'common'
  end;
end;
$$;

-- ------------------------------------------------------------
-- Uniqueness verification (pgvector cosine similarity)
-- Compares an incoming signature against the caller's collection.
-- ------------------------------------------------------------
create or replace function public.match_pet_signature(
  p_signature vector(768),
  p_threshold double precision default 0.95
)
returns table (card_id uuid, similarity double precision)
language sql stable security definer set search_path = public as $$
  select id, 1 - (signature <=> p_signature) as similarity
  from public.pet_cards
  where owner_id = auth.uid()
    and 1 - (signature <=> p_signature) >= p_threshold
  order by signature <=> p_signature
  limit 1;
$$;

-- ------------------------------------------------------------
-- Geolocation check-in: nearest active venue within its radius
-- (haversine — no PostGIS needed at this scale)
-- ------------------------------------------------------------
create or replace function public.haversine_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

create or replace function public.check_in(
  p_lat double precision,
  p_lng double precision
)
returns table (venue_id uuid, venue_name text, distance_m double precision)
language sql stable security definer set search_path = public as $$
  select v.id, v.name, public.haversine_m(p_lat, p_lng, v.lat, v.lng)
  from public.venues v
  where v.active
    and public.haversine_m(p_lat, p_lng, v.lat, v.lng) <= v.checkin_radius_m
  order by public.haversine_m(p_lat, p_lng, v.lat, v.lng)
  limit 1;
$$;

-- ------------------------------------------------------------
-- Capture pipeline RPC: the single entry point after an on-device scan.
-- Runs uniqueness check → either levels up an existing card ("revisit")
-- or mints a new card ("new_discovery") with computed rarity.
-- ------------------------------------------------------------
create or replace function public.capture_pet(
  p_signature   vector(768),
  p_species     public.species_type,
  p_breed       text,
  p_custom_name text,
  p_image_url   text,
  p_lat         double precision default null,
  p_lng         double precision default null,
  p_venue_id    uuid default null,
  p_stats       jsonb default '{}'::jsonb,
  p_threshold   double precision default 0.95
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_match   record;
  v_card    public.pet_cards%rowtype;
  v_rarity  public.rarity_tier;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from public.match_pet_signature(p_signature, p_threshold);

  if v_match.card_id is not null then
    -- Revisit: same animal already in this user's collection → level up + candy
    update public.pet_cards
    set level = level + 1, candy = candy + 3
    where id = v_match.card_id
    returning * into v_card;

    return jsonb_build_object(
      'outcome', 'revisit',
      'card_id', v_card.id,
      'level', v_card.level,
      'candy', v_card.candy,
      'similarity', v_match.similarity
    );
  end if;

  -- New unique discovery
  v_rarity := public.compute_rarity(p_breed);

  insert into public.pet_cards
    (owner_id, custom_name, species, breed, rarity, image_url,
     signature, lat, lng, venue_id, stats)
  values
    (auth.uid(), p_custom_name, p_species, p_breed, v_rarity, p_image_url,
     p_signature, p_lat, p_lng, p_venue_id, p_stats)
  returning * into v_card;

  return jsonb_build_object(
    'outcome', 'new_discovery',
    'card_id', v_card.id,
    'serial_number', v_card.serial_number,
    'rarity', v_card.rarity
  );
end;
$$;

-- ------------------------------------------------------------
-- Leaderboard views
-- security_invoker: views run with the caller's permissions so they
-- respect RLS on the underlying tables instead of bypassing it
-- ------------------------------------------------------------

-- Global / regional: most unique pets collected
create or replace view public.leaderboard_global
with (security_invoker = on) as
select p.id, p.username, p.avatar_url, p.region, count(c.id) as unique_pets
from public.profiles p
join public.pet_cards c on c.owner_id = p.id
group by p.id
order by unique_pets desc;

-- Category-specific: top catchers per species
create or replace view public.leaderboard_species
with (security_invoker = on) as
select c.species, p.id, p.username, p.avatar_url, count(c.id) as catches
from public.pet_cards c
join public.profiles p on p.id = c.owner_id
group by c.species, p.id
order by c.species, catches desc;

-- Breed-specific: widest variety documented within one breed
create or replace view public.leaderboard_breed
with (security_invoker = on) as
select c.breed, p.id, p.username, p.avatar_url,
       count(distinct c.id) as documented
from public.pet_cards c
join public.profiles p on p.id = c.owner_id
where c.breed is not null
group by c.breed, p.id
order by c.breed, documented desc;

-- ------------------------------------------------------------
-- Community map feed (safe public projection — no raw signatures)
-- ------------------------------------------------------------
create or replace view public.map_discoveries
with (security_invoker = on) as
select c.id, c.species, c.breed, c.rarity, c.custom_name, c.image_url,
       c.lat, c.lng, c.created_at, v.name as venue_name
from public.pet_cards c
left join public.venues v on v.id = c.venue_id
where c.lat is not null and c.lng is not null;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.venues    enable row level security;
alter table public.pet_cards enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Venues are viewable by everyone"
  on public.venues for select using (true);

create policy "Cards are viewable by everyone"
  on public.pet_cards for select using (true);

create policy "Users insert own cards"
  on public.pet_cards for insert with check (auth.uid() = owner_id);

create policy "Users update own cards"
  on public.pet_cards for update using (auth.uid() = owner_id);

create policy "Users delete own cards"
  on public.pet_cards for delete using (auth.uid() = owner_id);

-- ------------------------------------------------------------
-- Storage bucket for pet photos (public read, owner-scoped write)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

create policy "Pet photos are publicly readable"
  on storage.objects for select using (bucket_id = 'pet-photos');

create policy "Users upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'pet-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
