-- ============================================================
-- PetCatch — re-identification upgrade
-- Signatures switch to 384-d DINOv2 instance embeddings computed
-- from the background-removed cutout; the match threshold drops
-- to 0.80 (benchmarked: same pet 0.79–0.94, other pets ≈ 0) and
-- matching is species-gated. Existing signatures are incompatible
-- and are discarded (cards themselves are preserved).
-- ============================================================

drop function if exists public.capture_pet(vector, public.species_type, text, text, text, double precision, double precision, uuid, jsonb, double precision);
drop function if exists public.match_pet_signature(vector, double precision);

drop index if exists pet_cards_signature_idx;
alter table public.pet_cards drop column signature;
alter table public.pet_cards add column signature vector(384);
create index pet_cards_signature_idx on public.pet_cards
  using hnsw (signature vector_cosine_ops);

-- Extra viewing angles per pet (recognition improves with each revisit)
create table public.pet_signatures (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references public.pet_cards (id) on delete cascade,
  signature  vector(384) not null,
  created_at timestamptz not null default now()
);
create index pet_signatures_card_idx on public.pet_signatures (card_id);
alter table public.pet_signatures enable row level security;
create policy "Signatures follow card visibility"
  on public.pet_signatures for select using (true);
-- writes happen via the security-definer RPCs only

create or replace function public.match_pet_signature(
  p_signature vector(384),
  p_species   public.species_type,
  p_threshold double precision default 0.80
)
returns table (card_id uuid, similarity double precision)
language sql stable security definer set search_path = public as $$
  with views as (
    select c.id, 1 - (c.signature <=> p_signature) as sim
    from public.pet_cards c
    where c.owner_id = auth.uid() and c.species = p_species and c.signature is not null
    union all
    select s.card_id, 1 - (s.signature <=> p_signature)
    from public.pet_signatures s
    join public.pet_cards c on c.id = s.card_id
    where c.owner_id = auth.uid() and c.species = p_species
  )
  select id, max(sim) from views
  group by id
  having max(sim) >= p_threshold
  order by max(sim) desc
  limit 1;
$$;

create or replace function public.capture_pet(
  p_signature   vector(384),
  p_species     public.species_type,
  p_breed       text,
  p_custom_name text,
  p_image_url   text,
  p_lat         double precision default null,
  p_lng         double precision default null,
  p_venue_id    uuid default null,
  p_stats       jsonb default '{}'::jsonb,
  p_threshold   double precision default 0.80
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_match      record;
  v_card       public.pet_cards%rowtype;
  v_rival_card public.pet_cards%rowtype;
  v_rarity     public.rarity_tier;
  v_battle     public.battles%rowtype;
  v_battle_json jsonb := null;
  v_view_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from public.match_pet_signature(p_signature, p_species, p_threshold);

  if v_match.card_id is not null then
    update public.pet_cards
    set level = level + 1, candy = candy + 3
    where id = v_match.card_id
    returning * into v_card;

    -- remember this viewing angle if it adds information (max 3 extras)
    select count(*) into v_view_count from public.pet_signatures where card_id = v_card.id;
    if v_match.similarity < 0.93 and v_view_count < 3 then
      insert into public.pet_signatures (card_id, signature) values (v_card.id, p_signature);
    end if;

    return jsonb_build_object(
      'outcome', 'revisit',
      'card_id', v_card.id,
      'level', v_card.level,
      'candy', v_card.candy,
      'similarity', v_match.similarity
    );
  end if;

  v_rarity := public.compute_rarity(p_breed);

  insert into public.pet_cards
    (owner_id, custom_name, species, breed, rarity, image_url,
     signature, lat, lng, venue_id, stats)
  values
    (auth.uid(), p_custom_name, p_species, p_breed, v_rarity, p_image_url,
     p_signature, p_lat, p_lng, p_venue_id, p_stats)
  returning * into v_card;

  -- ⚔️ Steal War check (species-gated like the local path)
  if p_venue_id is not null then
    select c.* into v_rival_card
    from public.pet_cards c
    where c.venue_id = p_venue_id
      and c.owner_id is not null and c.owner_id <> auth.uid()
      and c.species = p_species
      and c.signature is not null
      and 1 - (c.signature <=> p_signature) >= p_threshold
      and not exists (
        select 1 from public.battles b
        where b.status = 'awaiting_champions'
          and (b.challenger_card_id = c.id or b.defender_card_id = c.id)
      )
    order by c.signature <=> p_signature
    limit 1;

    if found then
      insert into public.battles
        (venue_id, challenger_id, defender_id, challenger_card_id, defender_card_id)
      values
        (p_venue_id, auth.uid(), v_rival_card.owner_id, v_card.id, v_rival_card.id)
      returning * into v_battle;

      v_battle_json := jsonb_build_object(
        'battle_id', v_battle.id,
        'defender_id', v_battle.defender_id,
        'status', v_battle.status
      );
    end if;
  end if;

  return jsonb_build_object(
    'outcome', 'new_discovery',
    'card_id', v_card.id,
    'serial_number', v_card.serial_number,
    'rarity', v_card.rarity,
    'battle', v_battle_json
  );
end;
$$;
