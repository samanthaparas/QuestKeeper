-- QuestKeeper's database security rules, checked by signing in as different
-- people. Run by scripts/test-database.sh after every migration has run.
-- Each check raises "FAILED: ..." if the rule doesn't hold.
--
-- The people: Nolan runs the table (DM), Pippa and Billie play at it, Olive
-- is signed in but not at the table, and a signed-out visitor.

\set ON_ERROR_STOP 1
\set dm      '''00000000-0000-0000-0000-00000000000d'''
\set pippa   '''00000000-0000-0000-0000-0000000000a1'''
\set billie  '''00000000-0000-0000-0000-0000000000b1'''
\set olive   '''00000000-0000-0000-0000-00000000000f'''
\set tbl     '''00000000-0000-0000-0000-0000000000c1'''

-- The scene, set up as the database owner (which skips the rules).
reset role;
insert into auth.users (id) values (:dm), (:pippa), (:billie), (:olive);
insert into public.characters (id, user_id, data) values
  ('00000000-0000-0000-0000-0000000000a2', :pippa, '{"name": "Pippa"}'),
  ('00000000-0000-0000-0000-0000000000b2', :billie, '{"name": "Billie"}');
insert into public.game_tables (id, dm_id, name) values (:tbl, :dm, 'Test night');
insert into public.table_members (table_id, user_id, character_id) values
  (:tbl, :pippa, '00000000-0000-0000-0000-0000000000a2'),
  (:tbl, :billie, '00000000-0000-0000-0000-0000000000b2');
insert into public.combatants (id, table_id, kind, user_id, name) values
  ('00000000-0000-0000-0000-0000000000a3', :tbl, 'player', :pippa, 'Pippa'),
  ('00000000-0000-0000-0000-0000000000b3', :tbl, 'player', :billie, 'Billie'),
  ('00000000-0000-0000-0000-0000000000e3', :tbl, 'monster', null, 'Brown Bear');
insert into public.combatant_secrets (combatant_id, max_hp, current_hp, armor_class) values
  ('00000000-0000-0000-0000-0000000000e3', 20, 20, 11);
insert into public.table_handouts (table_id, title, shown_to_all, shown_to) values
  (:tbl, 'Hidden map', false, '{}'),
  (:tbl, 'Letter for Pippa', false, array[:pippa]::uuid[]);
-- Pippa writes a note for the table and a private one (the journal fills in
-- who wrote it from whoever is signed in).
set test.uid = :pippa;
insert into public.table_journal_entries (table_id, body, visibility) values
  (:tbl, 'We crossed the bridge.', 'table'),
  (:tbl, 'Secret: I am the duke''s niece.', 'private');

-- 1. Hidden enemy stats: only the DM can read them.
set role authenticated;
set test.uid = :pippa;
do $$ begin
  if (select count(*) from public.combatant_secrets) <> 0 then
    raise exception 'FAILED: a player can read enemy HP and AC';
  end if;
end $$;
set test.uid = :dm;
do $$ begin
  if (select count(*) from public.combatant_secrets) <> 1 then
    raise exception 'FAILED: the DM cannot read enemy HP';
  end if;
end $$;

-- 2. Private journal notes: only the writer, never the DM or another player.
set test.uid = :billie;
do $$ begin
  if exists (select 1 from public.table_journal_entries where visibility = 'private') then
    raise exception 'FAILED: another player can read a private note';
  end if;
  if not exists (select 1 from public.table_journal_entries where body = 'We crossed the bridge.') then
    raise exception 'FAILED: a player cannot read a note shared with the table';
  end if;
end $$;
set test.uid = :dm;
do $$ begin
  if exists (select 1 from public.table_journal_entries where visibility = 'private') then
    raise exception 'FAILED: the DM can read a player''s private note';
  end if;
end $$;
set test.uid = :pippa;
do $$ begin
  if not exists (select 1 from public.table_journal_entries where visibility = 'private') then
    raise exception 'FAILED: the writer cannot read their own private note';
  end if;
end $$;

-- 3. Handouts: hidden until revealed, and a chosen player's only for them.
set test.uid = :billie;
do $$ begin
  if exists (select 1 from public.table_handouts) then
    raise exception 'FAILED: a player can see a handout that was not shown to them';
  end if;
end $$;
set test.uid = :pippa;
do $$ begin
  if (select array_agg(title order by title) from public.table_handouts) is distinct from array['Letter for Pippa'] then
    raise exception 'FAILED: a chosen player does not see only their handout';
  end if;
end $$;

-- 4. Someone not at the table sees nothing of it.
set test.uid = :olive;
do $$ begin
  if exists (select 1 from public.game_tables) or exists (select 1 from public.combatants)
     or exists (select 1 from public.table_journal_entries) then
    raise exception 'FAILED: an outsider can see a table they are not at';
  end if;
end $$;

-- 5. A signed-out visitor sees nothing either.
reset role;
set role anon;
set test.uid = '';
do $$ begin
  if exists (select 1 from public.game_tables) or exists (select 1 from public.table_journal_entries) then
    raise exception 'FAILED: a signed-out visitor can see a table';
  end if;
end $$;

-- 6. Only the DM can change a monster's HP; damage taken counts every hit
--    in full, so a downed monster never shows its secret max HP (20).
reset role;
set role authenticated;
set test.uid = :pippa;
do $$ begin
  begin
    perform public.apply_damage('00000000-0000-0000-0000-0000000000e3', 5);
    raise exception 'FAILED: a player changed a monster''s HP';
  exception when others then
    if sqlerrm like 'FAILED:%' then raise; end if;
  end;
end $$;
set test.uid = :dm;
select public.apply_damage('00000000-0000-0000-0000-0000000000e3', 30);
set test.uid = :pippa;
do $$
declare v_taken int; v_status text;
begin
  select damage_taken, status into v_taken, v_status from public.combatants where name = 'Brown Bear';
  if v_status <> 'down' then raise exception 'FAILED: the bear should be down, is %', v_status; end if;
  if v_taken <> 30 then raise exception 'FAILED: damage taken is %, not 30 (it would reveal max HP)', v_taken; end if;
end $$;

-- 7. "Step away (brb)" only changes your own row.
set test.uid = :pippa;
select public.set_my_away('00000000-0000-0000-0000-0000000000c1', true);
reset role;
do $$ begin
  if not (select away from public.combatants where name = 'Pippa') then
    raise exception 'FAILED: brb did not mark Pippa away';
  end if;
  if (select away from public.combatants where name = 'Billie') then
    raise exception 'FAILED: brb changed someone else''s row';
  end if;
end $$;

-- 8. Starting a campaign: anyone at the table, at any session; not outsiders.
set role authenticated;
set test.uid = :olive;
do $$ begin
  begin
    perform public.start_campaign('00000000-0000-0000-0000-0000000000c1', '', 1);
    raise exception 'FAILED: an outsider started a campaign';
  exception when others then
    if sqlerrm like 'FAILED:%' then raise; end if;
  end;
end $$;
set test.uid = :billie;
select public.start_campaign('00000000-0000-0000-0000-0000000000c1', 'Season 2', 12);
reset role;
do $$ begin
  if (select (campaign_number, session_number) from public.game_tables) is distinct from (2, 12) then
    raise exception 'FAILED: the new campaign did not start at session 12';
  end if;
end $$;

-- 9. Monster concentration lives in the DM-only row (checked in 1).
do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_name = 'combatant_secrets' and column_name = 'concentration') then
    raise exception 'FAILED: monster concentration is not in the DM-only table';
  end if;
end $$;
