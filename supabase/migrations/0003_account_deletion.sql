-- ============================================================
-- PetCatch — account deletion (Privacy Policy §7)
-- Personal identifiers are purged; the user's pet cards persist
-- anonymized ("Game Integrity Exemption") by de-linking ownership.
-- ============================================================

-- Cards may outlive their owner: make ownership nullable
alter table public.pet_cards alter column owner_id drop not null;
alter table public.pet_cards drop constraint pet_cards_owner_id_fkey;
alter table public.pet_cards
  add constraint pet_cards_owner_id_fkey
  foreign key (owner_id) references public.profiles (id) on delete set null;

create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- de-link cards (they stay on the map/leaderboards, anonymized)
  update public.pet_cards set owner_id = null where owner_id = v_uid;

  -- purge identity: profile row, then the auth user itself
  delete from public.profiles where id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

-- Leaderboards join profiles, so de-linked cards drop off boards naturally;
-- keep the total_catches trigger happy with null owners
create or replace function public.bump_total_catches()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.owner_id is not null then
    update public.profiles set total_catches = total_catches + 1 where id = new.owner_id;
  elsif tg_op = 'DELETE' and old.owner_id is not null then
    update public.profiles set total_catches = greatest(total_catches - 1, 0) where id = old.owner_id;
  end if;
  return coalesce(new, old);
end;
$$;
