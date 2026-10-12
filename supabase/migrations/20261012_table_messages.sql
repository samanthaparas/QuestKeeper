-- Secret messages at a table: anyone at the table (the DM or a player) can
-- start a conversation with the whole party, a few people, or just one, and
-- only the people in it can ever read it. A message can carry a picture,
-- like a map or a handout. Run this once in the Supabase SQL editor.
--
-- Who can read what:
--   A conversation and its messages: only its members, while they're still
--   at the table. An "everyone" conversation: anyone at the table, including
--   people who join later. Players can talk without the DM; the DM only sees
--   a conversation if they're in it.
--   Pictures: stored privately (no public links), readable by the same people.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table public.table_conversations (
  id              uuid primary key default gen_random_uuid(),
  table_id        uuid not null references public.game_tables (id) on delete cascade,
  created_by      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The whole party, including anyone who joins later.
  everyone        boolean not null default false,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index table_conversations_table_idx on public.table_conversations (table_id, last_message_at desc);

-- Who's in a conversation, and when each of them last read it.
create table public.table_conversation_members (
  conversation_id uuid not null references public.table_conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  last_read_at    timestamptz not null default 'epoch',
  primary key (conversation_id, user_id)
);

create table public.table_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.table_conversations (id) on delete cascade,
  -- Copied from the conversation so live updates can be filtered by table.
  table_id        uuid not null references public.game_tables (id) on delete cascade,
  sender_id       uuid not null references auth.users (id) on delete cascade,
  body            text not null default '' check (char_length(body) <= 2000),
  image_path      text check (char_length(image_path) <= 300),
  created_at      timestamptz not null default now(),
  check (char_length(body) > 0 or image_path is not null)
);
create index table_messages_conversation_idx on public.table_messages (conversation_id, created_at);
create index table_messages_table_idx on public.table_messages (table_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Who can read a conversation
-- ---------------------------------------------------------------------------

create or replace function public.can_read_conversation(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.table_conversations c
    where c.id = p_conversation_id
      -- Still at the table: a removed player loses access.
      and public.is_table_participant(c.table_id)
      and (
        c.everyone
        or exists (
          select 1 from public.table_conversation_members m
          where m.conversation_id = c.id and m.user_id = (select auth.uid())
        )
      )
  );
$$;

-- The same check for a stored picture, from its path ("<conversation id>/...").
create or replace function public.can_read_conversation_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  return public.can_read_conversation(split_part(p_name, '/', 1)::uuid);
exception when others then
  return false;
end;
$$;

-- Someone who can be messaged at this table: the DM or a seated player.
create or replace function public.is_table_person(p_table_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.game_tables where id = p_table_id and dm_id = p_user_id)
      or exists (select 1 from public.table_members where table_id = p_table_id and user_id = p_user_id);
$$;

-- ---------------------------------------------------------------------------
-- 3. Row-level security: read-only for the browser; writes go through the
--    functions below.
-- ---------------------------------------------------------------------------

alter table public.table_conversations        enable row level security;
alter table public.table_conversation_members enable row level security;
alter table public.table_messages             enable row level security;

create policy "Conversation members can read it"
  on public.table_conversations for select to authenticated
  using ((select public.can_read_conversation(id)));

create policy "Conversation members can see who's in it"
  on public.table_conversation_members for select to authenticated
  using ((select public.can_read_conversation(conversation_id)));

create policy "Conversation members can read its messages"
  on public.table_messages for select to authenticated
  using ((select public.can_read_conversation(conversation_id)));

-- ---------------------------------------------------------------------------
-- 4. Functions the app calls
-- ---------------------------------------------------------------------------

-- Opens a conversation with the whole table (p_everyone), or with the people
-- picked (the caller is always included). Reuses the existing conversation
-- with exactly the same people, so a group keeps one thread.
create or replace function public.start_conversation(
  p_table_id uuid,
  p_user_ids uuid[],
  p_everyone boolean default false
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_people uuid[];
  v_id uuid;
begin
  if not public.is_table_participant(p_table_id) then
    raise exception 'Only people at this table can send messages';
  end if;

  if p_everyone then
    select id into v_id from public.table_conversations
      where table_id = p_table_id and everyone
      order by created_at limit 1;
    if v_id is not null then return v_id; end if;

    insert into public.table_conversations (table_id, created_by, everyone)
      values (p_table_id, v_user, true) returning id into v_id;
    insert into public.table_conversation_members (conversation_id, user_id)
      select v_id, dm_id from public.game_tables where id = p_table_id
      union
      select v_id, user_id from public.table_members where table_id = p_table_id;
    return v_id;
  end if;

  select array_agg(distinct person order by person) into v_people
    from unnest(array_append(coalesce(p_user_ids, '{}'), v_user)) as person;

  if array_length(v_people, 1) < 2 then
    raise exception 'Pick at least one person to message';
  end if;
  if array_length(v_people, 1) > 20 then
    raise exception 'That is more people than a table holds';
  end if;
  if exists (select 1 from unnest(v_people) as person where not public.is_table_person(p_table_id, person)) then
    raise exception 'Everyone in a conversation has to be at this table';
  end if;

  -- The same group already has a conversation: use it.
  select c.id into v_id
    from public.table_conversations c
    where c.table_id = p_table_id and not c.everyone
      and (
        select array_agg(m.user_id order by m.user_id)
        from public.table_conversation_members m where m.conversation_id = c.id
      ) = v_people
    limit 1;
  if v_id is not null then return v_id; end if;

  insert into public.table_conversations (table_id, created_by, everyone)
    values (p_table_id, v_user, false) returning id into v_id;
  insert into public.table_conversation_members (conversation_id, user_id)
    select v_id, person from unnest(v_people) as person;
  return v_id;
end;
$$;

-- Sends a message (text, a picture, or both) to a conversation the caller is in.
create or replace function public.send_table_message(
  p_conversation_id uuid,
  p_body text,
  p_image_path text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_table uuid;
  v_body text := left(trim(coalesce(p_body, '')), 2000);
  v_id uuid;
begin
  if not public.can_read_conversation(p_conversation_id) then
    raise exception 'You are not in this conversation';
  end if;
  if v_body = '' and p_image_path is null then
    raise exception 'Write something or add a picture';
  end if;
  if p_image_path is not null and split_part(p_image_path, '/', 1) <> p_conversation_id::text then
    raise exception 'That picture belongs to another conversation';
  end if;

  select table_id into v_table from public.table_conversations where id = p_conversation_id;

  insert into public.table_messages (conversation_id, table_id, sender_id, body, image_path)
    values (p_conversation_id, v_table, v_user, v_body, p_image_path)
    returning id into v_id;

  update public.table_conversations set last_message_at = now() where id = p_conversation_id;
  -- Your own message counts as read.
  insert into public.table_conversation_members (conversation_id, user_id, last_read_at)
    values (p_conversation_id, v_user, now())
    on conflict (conversation_id, user_id) do update set last_read_at = now();
  return v_id;
end;
$$;

-- Marks a conversation read up to now (adds a late joiner to an "everyone"
-- conversation the first time they read it).
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_read_conversation(p_conversation_id) then
    raise exception 'You are not in this conversation';
  end if;
  insert into public.table_conversation_members (conversation_id, user_id, last_read_at)
    values (p_conversation_id, (select auth.uid()), now())
    on conflict (conversation_id, user_id) do update set last_read_at = now();
end;
$$;

revoke execute on function
  public.can_read_conversation(uuid), public.can_read_conversation_file(text),
  public.is_table_person(uuid, uuid),
  public.start_conversation(uuid, uuid[], boolean),
  public.send_table_message(uuid, text, text),
  public.mark_conversation_read(uuid)
  from public, anon;
grant execute on function
  public.can_read_conversation(uuid), public.can_read_conversation_file(text),
  public.is_table_person(uuid, uuid),
  public.start_conversation(uuid, uuid[], boolean),
  public.send_table_message(uuid, text, text),
  public.mark_conversation_read(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Pictures: a private bucket, 5 MB per image
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'table-message-images', 'table-message-images', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "Conversation members can view its pictures"
  on storage.objects for select to authenticated
  using (bucket_id = 'table-message-images' and (select public.can_read_conversation_file(name)));

create policy "Conversation members can add pictures"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'table-message-images' and (select public.can_read_conversation_file(name)));

-- ---------------------------------------------------------------------------
-- 6. Live updates (row-level security still decides who receives what)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.table_messages;
