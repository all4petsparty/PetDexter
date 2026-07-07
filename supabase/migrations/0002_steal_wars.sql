-- ============================================================
-- PetCatch — Steal Wars ⚔️
--
-- Rule: when a user captures a pet at a venue and ANOTHER user has
-- already captured the SAME pet (pgvector similarity) at that venue,
-- a battle is created. Each side draws a RANDOM champion card from
-- their PetDex; the higher card power wins. The winner keeps their
-- copy of the contested pet — the loser's copy is deleted.
-- ============================================================

-- ------------------------------------------------------------
-- Card power (mirrors the client's battleStats() in cardFactory.ts)
-- ------------------------------------------------------------
create or replace function public.card_power(p_stats jsonb, p_rarity public.rarity_tier)
returns integer
language sql immutable as $$
  select 1
    + round((((coalesce((p_stats->>'chonkiness')::numeric, 50)
             + coalesce((p_stats->>'friendliness')::numeric, 50)
             + coalesce((p_stats->>'energy')::numeric, 50)) / 3) / 100) * 4)::int
    + floor((array_position(enum_range(null::public.rarity_tier), p_rarity) - 1) * 0.8)::int;
$$;

-- ------------------------------------------------------------
-- Battles
-- ------------------------------------------------------------
create table public.battles (
  id                  uuid primary key default gen_random_uuid(),
  venue_id            uuid references public.venues (id) on delete set null,
  challenger_id       uuid not null references public.profiles (id) on delete cascade,
  defender_id         uuid not null references public.profiles (id) on delete cascade,
  -- each side's copy of the contested pet (set null on delete so the
  -- resolved battle survives as history after the loser's copy is removed)
  challenger_card_id  uuid references public.pet_cards (id) on delete set null,
  defender_card_id    uuid references public.pet_cards (id) on delete set null,
  -- champion snapshots: { card_id, name, species, rarity, power, image_url }
  challenger_champion jsonb,
  defender_champion   jsonb,
  winner_id           uuid references public.profiles (id),
  status              text not null default 'awaiting_champions'
                        check (status in ('awaiting_champions', 'resolved')),
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);

create index battles_challenger_idx on public.battles (challenger_id, status);
create index battles_defender_idx   on public.battles (defender_id, status);

alter table public.battles enable row level security;

create policy "Participants see their battles"
  on public.battles for select
  using (auth.uid() = challenger_id or auth.uid() = defender_id);
-- all writes go through security-definer RPCs below

-- Live battle updates for connected clients
do $$
begin
  alter publication supabase_realtime add table public.battles;
exception when others then null;
end $$;

-- ------------------------------------------------------------
-- capture_pet v2: same behavior as v1, plus Steal War detection —
-- if the newly minted pet matches another user's card at this venue,
-- a battle is created and returned in the response.
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
  v_match      record;
  v_card       public.pet_cards%rowtype;
  v_rival_card public.pet_cards%rowtype;
  v_rarity     public.rarity_tier;
  v_battle     public.battles%rowtype;
  v_battle_json jsonb := null;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_match from public.match_pet_signature(p_signature, p_threshold);

  if v_match.card_id is not null then
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

  v_rarity := public.compute_rarity(p_breed);

  insert into public.pet_cards
    (owner_id, custom_name, species, breed, rarity, image_url,
     signature, lat, lng, venue_id, stats)
  values
    (auth.uid(), p_custom_name, p_species, p_breed, v_rarity, p_image_url,
     p_signature, p_lat, p_lng, p_venue_id, p_stats)
  returning * into v_card;

  -- ⚔️ Steal War check: someone else already caught this pet here?
  if p_venue_id is not null then
    select c.* into v_rival_card
    from public.pet_cards c
    where c.venue_id = p_venue_id
      and c.owner_id <> auth.uid()
      and 1 - (c.signature <=> p_signature) >= p_threshold
      -- pets already contested in an open battle can't be contested twice
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

-- ------------------------------------------------------------
-- draw_champion: the caller draws a RANDOM card from their PetDex.
-- When both sides have drawn, the battle resolves atomically:
-- higher power wins (ties: higher champion rarity, then coin flip)
-- and the loser's copy of the contested pet is deleted.
-- ------------------------------------------------------------
create or replace function public.draw_champion(p_battle_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_battle        public.battles%rowtype;
  v_is_challenger boolean;
  v_own_card_id   uuid;
  v_card          public.pet_cards%rowtype;
  v_snapshot      jsonb;
  v_c_pow int; v_d_pow int;
  v_c_rar int; v_d_rar int;
  v_winner uuid;
  v_loser_card uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_battle from public.battles where id = p_battle_id for update;
  if not found then
    raise exception 'Battle not found';
  end if;
  if auth.uid() not in (v_battle.challenger_id, v_battle.defender_id) then
    raise exception 'Not a participant in this battle';
  end if;
  if v_battle.status <> 'awaiting_champions' then
    raise exception 'Battle already resolved';
  end if;

  v_is_challenger := auth.uid() = v_battle.challenger_id;
  if (v_is_challenger and v_battle.challenger_champion is not null)
     or (not v_is_challenger and v_battle.defender_champion is not null) then
    raise exception 'Champion already drawn';
  end if;

  v_own_card_id := case when v_is_challenger
                        then v_battle.challenger_card_id
                        else v_battle.defender_card_id end;

  -- random champion from the caller's PetDex, excluding the contested pet;
  -- if it's their only card, the contested pet must fight for itself
  select * into v_card from public.pet_cards
  where owner_id = auth.uid() and id is distinct from v_own_card_id
  order by random() limit 1;
  if not found then
    select * into v_card from public.pet_cards where id = v_own_card_id;
    if not found then
      raise exception 'No cards available to draw';
    end if;
  end if;

  v_snapshot := jsonb_build_object(
    'card_id', v_card.id,
    'name', v_card.custom_name,
    'species', v_card.species,
    'rarity', v_card.rarity,
    'power', public.card_power(v_card.stats, v_card.rarity),
    'image_url', v_card.image_url
  );

  if v_is_challenger then
    update public.battles set challenger_champion = v_snapshot where id = p_battle_id;
  else
    update public.battles set defender_champion = v_snapshot where id = p_battle_id;
  end if;

  select * into v_battle from public.battles where id = p_battle_id;

  -- Resolve once both champions are on the table
  if v_battle.challenger_champion is not null and v_battle.defender_champion is not null then
    v_c_pow := (v_battle.challenger_champion->>'power')::int;
    v_d_pow := (v_battle.defender_champion->>'power')::int;
    v_c_rar := array_position(enum_range(null::public.rarity_tier),
                              (v_battle.challenger_champion->>'rarity')::public.rarity_tier);
    v_d_rar := array_position(enum_range(null::public.rarity_tier),
                              (v_battle.defender_champion->>'rarity')::public.rarity_tier);

    v_winner := case
      when v_c_pow > v_d_pow then v_battle.challenger_id
      when v_d_pow > v_c_pow then v_battle.defender_id
      when v_c_rar > v_d_rar then v_battle.challenger_id
      when v_d_rar > v_c_rar then v_battle.defender_id
      when random() < 0.5   then v_battle.challenger_id
      else v_battle.defender_id
    end;

    v_loser_card := case when v_winner = v_battle.challenger_id
                         then v_battle.defender_card_id
                         else v_battle.challenger_card_id end;

    update public.battles
    set winner_id = v_winner, status = 'resolved', resolved_at = now()
    where id = p_battle_id;

    -- the stolen pet: loser's copy leaves their PetDex
    if v_loser_card is not null then
      delete from public.pet_cards where id = v_loser_card;
    end if;

    select * into v_battle from public.battles where id = p_battle_id;
  end if;

  return to_jsonb(v_battle);
end;
$$;

-- ------------------------------------------------------------
-- Battle feed for the client (poll or subscribe via realtime)
-- ------------------------------------------------------------
create or replace view public.my_battles
with (security_invoker = on) as
select
  b.id, b.status, b.venue_id, v.name as venue_name,
  b.challenger_id, cp.username as challenger_name,
  b.defender_id, dp.username as defender_name,
  b.challenger_champion, b.defender_champion,
  b.winner_id, b.created_at, b.resolved_at,
  coalesce(cc.custom_name, dc.custom_name) as contested_name,
  coalesce(cc.image_url, dc.image_url)     as contested_image
from public.battles b
join public.profiles cp on cp.id = b.challenger_id
join public.profiles dp on dp.id = b.defender_id
left join public.venues v on v.id = b.venue_id
left join public.pet_cards cc on cc.id = b.challenger_card_id
left join public.pet_cards dc on dc.id = b.defender_card_id;
