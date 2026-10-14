-- Handouts: the DM prepares letters, maps, wanted posters and the like, then
-- reveals each one to the whole table or to chosen players. Until then only
-- the DM can see it. Run this once in the Supabase SQL editor.
--
-- Who can do what:
--   The DM     make, edit, reveal, hide and delete handouts at their table.
--   A player   see a handout (and its picture) only once it's revealed to
--              everyone or to them, and only while they're at the table.

-- 1. The handouts.
create table if not exists public.table_handouts (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references public.game_tables (id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 1 and 120),
  body        text not null default '' check (char_length(body) <= 4000),
  image_path  text check (char_length(image_path) <= 300),
  -- Revealed to the whole table (including people who join later)...
  shown_to_all boolean not null default false,
  -- ...or to these players only.
  shown_to    uuid[] not null default '{}',
  revealed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists table_handouts_table_idx
  on public.table_handouts (table_id, created_at);

-- 2. Who can read a handout: the DM, or a player it's been shown to.
create or replace function public.can_read_handout(p_handout_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.table_handouts h
    where h.id = p_handout_id
      and (
        public.is_table_dm(h.table_id)
        or (
          public.is_table_member(h.table_id)
          and (h.shown_to_all or (select auth.uid()) = any (h.shown_to))
        )
      )
  );
$$;

-- The same check for a stored picture, from its path ("<table>/<handout>/...").
create or replace function public.can_read_handout_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return public.can_read_handout(split_part(p_name, '/', 2)::uuid);
exception when others then
  return false;
end;
$$;

-- Only the DM of the table in the path ("<table>/...") can add or remove pictures.
create or replace function public.is_handout_file_dm(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return public.is_table_dm(split_part(p_name, '/', 1)::uuid);
exception when others then
  return false;
end;
$$;

revoke execute on function
  public.can_read_handout(uuid), public.can_read_handout_file(text), public.is_handout_file_dm(text)
  from public, anon;
grant execute on function
  public.can_read_handout(uuid), public.can_read_handout_file(text), public.is_handout_file_dm(text)
  to authenticated;

-- 3. Row-level security.
alter table public.table_handouts enable row level security;

drop policy if exists "DM and revealed players can read handouts" on public.table_handouts;
create policy "DM and revealed players can read handouts"
  on public.table_handouts for select to authenticated
  using (
    (select public.is_table_dm(table_id))
    or (
      (select public.is_table_member(table_id))
      and (shown_to_all or (select auth.uid()) = any (shown_to))
    )
  );

drop policy if exists "DMs can add handouts" on public.table_handouts;
create policy "DMs can add handouts"
  on public.table_handouts for insert to authenticated
  with check ((select public.is_table_dm(table_id)));

drop policy if exists "DMs can change handouts" on public.table_handouts;
create policy "DMs can change handouts"
  on public.table_handouts for update to authenticated
  using ((select public.is_table_dm(table_id)))
  with check ((select public.is_table_dm(table_id)));

drop policy if exists "DMs can delete handouts" on public.table_handouts;
create policy "DMs can delete handouts"
  on public.table_handouts for delete to authenticated
  using ((select public.is_table_dm(table_id)));

-- 4. Pictures: a private bucket, 5 MB per image, no public links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'table-handout-images', 'table-handout-images', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "DM and revealed players can view handout pictures" on storage.objects;
create policy "DM and revealed players can view handout pictures"
  on storage.objects for select to authenticated
  using (bucket_id = 'table-handout-images' and (select public.can_read_handout_file(name)));

drop policy if exists "DMs can add handout pictures" on storage.objects;
create policy "DMs can add handout pictures"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'table-handout-images' and (select public.is_handout_file_dm(name)));

drop policy if exists "DMs can remove handout pictures" on storage.objects;
create policy "DMs can remove handout pictures"
  on storage.objects for delete to authenticated
  using (bucket_id = 'table-handout-images' and (select public.is_handout_file_dm(name)));

-- 5. Live updates, so a reveal shows up on players' screens right away.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'table_handouts'
  ) then
    alter publication supabase_realtime add table public.table_handouts;
  end if;
end;
$$;
