-- The characters table, as made in the Supabase dashboard before migrations
-- were kept in the repository (so it has no SQL file of its own). Used by
-- the database test (on plain Postgres) and the two-browser tests (on a local
-- Supabase). Never run this on the real database.
--
-- Each character belongs to one account, which can read, add, change and
-- delete it. (The DM's read-only view of characters at their table comes
-- from 20261003_dm_tables.sql.)

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.characters enable row level security;

drop policy if exists "Owners read their characters" on public.characters;
create policy "Owners read their characters" on public.characters
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Owners add characters" on public.characters;
create policy "Owners add characters" on public.characters
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Owners change their characters" on public.characters;
create policy "Owners change their characters" on public.characters
  for update to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Owners delete their characters" on public.characters;
create policy "Owners delete their characters" on public.characters
  for delete to authenticated using (user_id = (select auth.uid()));

grant all on public.characters to anon, authenticated, service_role;
