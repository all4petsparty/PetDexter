-- ============================================================
-- PetDexter — let deleting a pet_profiles row actually work.
--
-- migration 0006 gave pet_images an `on delete cascade` FK to
-- pet_profiles, but left encounters.pet_id as a plain (RESTRICT-by-
-- default) FK. Deleting a pet_profiles row that has any encounters would
-- fail with a foreign-key-violation. This finds whatever Postgres
-- auto-named that constraint (rather than guessing) and replaces it with
-- a cascading one, so the new "delete this card" feature actually works
-- for pets that have been synced to Supabase.
-- ============================================================

do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.encounters'::regclass
    and contype = 'f'
    and confrelid = 'public.pet_profiles'::regclass;

  if con_name is not null then
    execute format('alter table public.encounters drop constraint %I', con_name);
  end if;
end $$;

alter table public.encounters
  add constraint encounters_pet_id_fkey
  foreign key (pet_id) references public.pet_profiles(id) on delete cascade;
