-- QuestKeeper: homebrew races, subraces, backgrounds and subclasses, and
-- who can see them.
--
-- Run once in the Supabase dashboard: SQL Editor -> paste -> Run.
-- Nothing here touches existing tables.
--
-- Who can see an author's homebrew:
--   - The author, always (including private drafts).
--   - Everyone at a table the author shared their homebrew with.
--   - Anyone who accepted the author's invite link.
-- Others only ever see entries the author marked as shared.
-- Only the author can create, edit or delete their entries.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

-- One row per homebrew option. `data` holds the numbers and lists for its
-- category (ability bonuses, traits, features...); the app checks its shape.
create table public.homebrew_entries (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  -- class, feat and spell are allowed now so they can be added later
  -- without changing this table.
  category   text not null check (category in
               ('race', 'subrace', 'background', 'subclass', 'class', 'feat', 'spell')),
  name       text not null check (char_length(name) between 1 and 80),
  based_on   text check (char_length(based_on) <= 120),
  link_url   text check (link_url ~* '^https?://' and char_length(link_url) <= 500),
  summary    text not null default '' check (char_length(summary) <= 5000),
  data       jsonb not null default '{}'::jsonb
               check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 50000),
  -- false = private draft, only the author sees it.
  is_shared  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index homebrew_entries_owner_idx on public.homebrew_entries (owner_id);

-- "Everyone at this table can see my shared homebrew."
create table public.homebrew_table_shares (
  owner_id   uuid not null default auth.uid()
               references auth.users (id) on delete cascade,
  table_id   uuid not null references public.game_tables (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, table_id)
);
create index homebrew_table_shares_table_idx on public.homebrew_table_shares (table_id);

-- A one-time invite link. The labels are typed by the author, because
-- QuestKeeper has no display names: who it's for, and how the author appears.
create table public.homebrew_invites (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid()
                    references auth.users (id) on delete cascade,
  code            text not null unique
                    default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  recipient_label text not null check (char_length(recipient_label) between 1 and 40),
  sender_label    text not null check (char_length(sender_label) between 1 and 40),
  created_at      timestamptz not null default now(),
  -- Unused links stop working after two weeks.
  expires_at      timestamptz not null default now() + interval '14 days',
  accepted_by     uuid references auth.users (id) on delete set null,
  accepted_at     timestamptz
);
create index homebrew_invites_owner_idx on public.homebrew_invites (owner_id);

-- Lasting access from an accepted invite. Either side can delete it:
-- the author to revoke, the recipient to remove it from their account.
create table public.homebrew_grants (
  owner_id        uuid not null references auth.users (id) on delete cascade,
  grantee_id      uuid not null references auth.users (id) on delete cascade,
  recipient_label text not null,
  sender_label    text not null,
  created_at      timestamptz not null default now(),
  primary key (owner_id, grantee_id),
  check (owner_id <> grantee_id)
);
create index homebrew_grants_grantee_idx on public.homebrew_grants (grantee_id);

-- ---------------------------------------------------------------------------
-- 2. Helper: can the signed-in user see this author's shared homebrew?
--    SECURITY DEFINER so the policies can check grants and table shares
--    without tripping over those tables' own rules.
-- ---------------------------------------------------------------------------

create or replace function public.can_view_homebrew_of(p_owner_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_owner_id = (select auth.uid())
    or exists (
      select 1 from public.homebrew_grants
      where owner_id = p_owner_id and grantee_id = (select auth.uid())
    )
    or exists (
      select 1 from public.homebrew_table_shares s
      where s.owner_id = p_owner_id
        and public.is_table_participant(s.table_id)
    );
$$;

-- ---------------------------------------------------------------------------
-- 3. Row level security
-- ---------------------------------------------------------------------------

alter table public.homebrew_entries enable row level security;
alter table public.homebrew_table_shares enable row level security;
alter table public.homebrew_invites enable row level security;
alter table public.homebrew_grants enable row level security;

-- Entries: your own (drafts too), plus shared ones from authors you can see.
create policy "View own or shared homebrew"
  on public.homebrew_entries for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (is_shared and (select public.can_view_homebrew_of(owner_id)))
  );

create policy "Authors add their own homebrew"
  on public.homebrew_entries for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Authors edit their own homebrew"
  on public.homebrew_entries for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Authors delete their own homebrew"
  on public.homebrew_entries for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Table shares: the author, and people at that table, can see the share.
-- You can only share with a table you run or have joined.
create policy "View table shares"
  on public.homebrew_table_shares for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (select public.is_table_participant(table_id))
  );

create policy "Share with your own tables"
  on public.homebrew_table_shares for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select public.is_table_participant(table_id))
  );

create policy "Stop sharing with a table"
  on public.homebrew_table_shares for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Invites: only the author sees and manages their links. Recipients use the
-- two functions below instead, so they never see anyone else's invites.
create policy "Authors view their invites"
  on public.homebrew_invites for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "Authors create invites"
  on public.homebrew_invites for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and accepted_by is null
    and expires_at <= now() + interval '15 days'
  );

create policy "Authors cancel invites"
  on public.homebrew_invites for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Grants: both sides can see and remove them. There is no insert policy;
-- grants are only made by accept_homebrew_invite.
create policy "View your grants"
  on public.homebrew_grants for select to authenticated
  using (owner_id = (select auth.uid()) or grantee_id = (select auth.uid()));

create policy "Either side removes a grant"
  on public.homebrew_grants for delete to authenticated
  using (owner_id = (select auth.uid()) or grantee_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. Functions the app calls
-- ---------------------------------------------------------------------------

-- Keep updated_at honest no matter what the app sends.
create or replace function public.touch_homebrew_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger homebrew_entries_touch_updated_at
  before update on public.homebrew_entries
  for each row execute function public.touch_homebrew_updated_at();

-- What the invite page shows before someone accepts: who it's from and
-- whether it still works. Reveals nothing else about the author.
create or replace function public.get_homebrew_invite(p_code text)
returns table (sender_label text, status text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_invite public.homebrew_invites;
begin
  if (select auth.uid()) is null then raise exception 'Not signed in'; end if;

  select * into v_invite from public.homebrew_invites
    where code = upper(trim(p_code));
  if not found then
    return query select null::text, 'not_found'::text;
    return;
  end if;

  return query select v_invite.sender_label,
    case
      when v_invite.owner_id = (select auth.uid()) then 'own'
      when v_invite.accepted_by is not null then 'used'
      when v_invite.expires_at < now() then 'expired'
      else 'ok'
    end;
end;
$$;

-- Accepting an invite turns it into lasting access, and uses it up.
create or replace function public.accept_homebrew_invite(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_invite public.homebrew_invites;
begin
  if v_user is null then raise exception 'Not signed in'; end if;

  -- "for update" stops two people accepting the same link at once.
  select * into v_invite from public.homebrew_invites
    where code = upper(trim(p_code))
    for update;
  if not found then raise exception 'That invite link does not exist'; end if;
  if v_invite.owner_id = v_user then
    raise exception 'This is your own invite link';
  end if;
  if v_invite.accepted_by is not null then
    raise exception 'That invite link has already been used';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'That invite link has expired';
  end if;

  insert into public.homebrew_grants
    (owner_id, grantee_id, recipient_label, sender_label)
    values (v_invite.owner_id, v_user, v_invite.recipient_label, v_invite.sender_label)
    on conflict (owner_id, grantee_id) do nothing;

  update public.homebrew_invites
    set accepted_by = v_user, accepted_at = now()
    where id = v_invite.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Permissions, then refresh the API
-- ---------------------------------------------------------------------------

revoke execute on function
  public.can_view_homebrew_of(uuid),
  public.get_homebrew_invite(text),
  public.accept_homebrew_invite(text)
  from public, anon;
grant execute on function
  public.can_view_homebrew_of(uuid),
  public.get_homebrew_invite(text),
  public.accept_homebrew_invite(text)
  to authenticated;

notify pgrst, 'reload schema';
