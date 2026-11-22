-- More of QuestKeeper's database rules: secret messages, journal reactions,
-- removing a player for good, and giving items. Run by
-- scripts/test-database.sh. Each check raises "FAILED: ..." if the rule
-- doesn't hold.
--
-- The people: Dana runs the table (DM); Ann, Bo and Cy play at it; Eve is
-- signed in but not at it.

\set ON_ERROR_STOP 1
\set dana '''00000000-0000-0000-0000-0000000001d0'''
\set ann  '''00000000-0000-0000-0000-0000000001a0'''
\set bo   '''00000000-0000-0000-0000-0000000001b0'''
\set cy   '''00000000-0000-0000-0000-0000000001c0'''
\set eve  '''00000000-0000-0000-0000-0000000001e0'''
\set tbl  '''00000000-0000-0000-0000-0000000001f0'''

-- The scene, set up as the database owner.
reset role;
insert into auth.users (id) values (:dana), (:ann), (:bo), (:cy), (:eve);
insert into public.characters (id, user_id, data) values
  ('00000000-0000-0000-0000-0000000001a1', :ann, '{"name": "Ann"}'),
  ('00000000-0000-0000-0000-0000000001b1', :bo, '{"name": "Bo"}'),
  ('00000000-0000-0000-0000-0000000001c1', :cy, '{"name": "Cy"}'),
  ('00000000-0000-0000-0000-0000000001e1', :eve, '{"name": "Eve"}');
insert into public.game_tables (id, dm_id, name, join_code) values (:tbl, :dana, 'Second table', 'TEST02');
insert into public.table_members (table_id, user_id, character_id) values
  (:tbl, :ann, '00000000-0000-0000-0000-0000000001a1'),
  (:tbl, :bo, '00000000-0000-0000-0000-0000000001b1'),
  (:tbl, :cy, '00000000-0000-0000-0000-0000000001c1');
set role authenticated;

-- 1. Secret messages: only the people in a conversation can read it, not
--    others at the table, and not the DM unless they're in it.
set test.uid = :ann;
select public.start_conversation(:tbl, array[:bo]::uuid[], false) as conv \gset
select public.send_table_message(:'conv', 'Meet me behind the inn.');
set test.uid = :bo;
do $$ begin
  if (select count(*) from public.table_messages) <> 1 then raise exception 'FAILED: someone in the conversation cannot read it'; end if;
end $$;
set test.uid = :cy;
do $$ begin
  if exists (select 1 from public.table_messages) then raise exception 'FAILED: another player can read a conversation they are not in'; end if;
end $$;
set test.uid = :dana;
do $$ begin
  if exists (select 1 from public.table_messages) then raise exception 'FAILED: the DM can read a conversation they are not in'; end if;
end $$;
set test.uid = :eve;
do $$ begin
  begin
    perform public.start_conversation('00000000-0000-0000-0000-0000000001f0', array['00000000-0000-0000-0000-0000000001b0']::uuid[], false);
    raise exception 'FAILED: someone not at the table started a conversation there';
  exception when others then
    if sqlerrm like 'FAILED:%' then raise; end if;
  end;
end $$;

-- 2. Journal reactions: only people at the table react, and nobody can
--    take back someone else's reaction.
set test.uid = :ann;
insert into public.table_journal_entries (table_id, body, visibility) values (:tbl, 'We found the map!', 'table');
select id as entry from public.table_journal_entries where body = 'We found the map!' \gset
set test.uid = :bo;
insert into public.journal_reactions (entry_id, table_id, emoji) values (:'entry', :tbl, '❤️');
set test.uid = :eve;
do $$ begin
  begin
    insert into public.journal_reactions (entry_id, table_id, emoji)
      select id, table_id, '👍' from public.table_journal_entries limit 1;
    if exists (select 1 from public.journal_reactions where user_id = '00000000-0000-0000-0000-0000000001e0') then
      raise exception 'FAILED: someone not at the table reacted to a note';
    end if;
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.journal_reactions where user_id = '00000000-0000-0000-0000-0000000001e0') then
    raise exception 'FAILED: someone not at the table reacted to a note';
  end if;
end $$;
set role authenticated;
set test.uid = :cy;
delete from public.journal_reactions where user_id = :bo;
reset role;
do $$ begin
  if not exists (select 1 from public.journal_reactions where user_id = '00000000-0000-0000-0000-0000000001b0') then
    raise exception 'FAILED: a player took back someone else''s reaction';
  end if;
end $$;

-- 3. Removing a player for good: only the DM can, and they can't rejoin
--    with the code until the DM lets them back.
set role authenticated;
set test.uid = :bo;
do $$ begin
  begin
    perform public.ban_member('00000000-0000-0000-0000-0000000001f0', '00000000-0000-0000-0000-0000000001c0');
    raise exception 'FAILED: a player removed someone for good';
  exception when others then
    if sqlerrm like 'FAILED:%' then raise; end if;
  end;
end $$;
set test.uid = :dana;
select public.ban_member(:tbl, :cy);
set test.uid = :cy;
do $$ begin
  begin
    perform public.join_table('TEST02', '00000000-0000-0000-0000-0000000001c1');
    raise exception 'FAILED: a player removed for good rejoined with the code';
  exception when others then
    if sqlerrm like 'FAILED:%' then raise; end if;
  end;
end $$;
set test.uid = :dana;
select public.unban_member(:tbl, :cy);
set test.uid = :cy;
select public.join_table('TEST02', '00000000-0000-0000-0000-0000000001c1');

-- 4. Giving items: only between people seated at the same table, only the
--    giver and receiver see the gift, and only they can move it on.
set test.uid = :ann;
select public.give_item(:tbl, :bo, '{"name": "Arrows", "quantity": 3}') as gift \gset
set test.gift = :'gift';
set test.uid = :cy;
do $$ begin
  if exists (select 1 from public.item_gifts) then raise exception 'FAILED: a third player can see someone else''s gift'; end if;
  begin
    perform public.take_gift(current_setting('test.gift')::uuid);
    raise exception 'FAILED: a third player took someone else''s gift';
  exception when others then
    if sqlerrm like 'FAILED:%' then raise; end if;
  end;
end $$;
set test.uid = :bo;
do $$ begin
  if (select count(*) from public.item_gifts) <> 1 then raise exception 'FAILED: the receiver cannot see their gift'; end if;
end $$;
set test.uid = :eve;
do $$ begin
  begin
    perform public.give_item('00000000-0000-0000-0000-0000000001f0', '00000000-0000-0000-0000-0000000001b0', '{"name": "Rock"}');
    raise exception 'FAILED: someone not at the table gave an item there';
  exception when others then
    if sqlerrm like 'FAILED:%' then raise; end if;
  end;
  begin
    insert into public.item_gifts (table_id, from_user, to_user, to_character_id, item)
      values ('00000000-0000-0000-0000-0000000001f0', '00000000-0000-0000-0000-0000000001e0',
              '00000000-0000-0000-0000-0000000001b0', '00000000-0000-0000-0000-0000000001b1', '{"name": "Rock"}');
    raise exception 'FAILED: a gift was written straight into the gift box';
  exception when insufficient_privilege then null;
  end;
end $$;
set test.uid = :ann;
do $$ begin
  begin
    perform public.give_item('00000000-0000-0000-0000-0000000001f0', '00000000-0000-0000-0000-0000000001a0', '{"name": "Rope"}');
    raise exception 'FAILED: a player gave an item to themselves';
  exception when others then
    if sqlerrm like 'FAILED:%' then raise; end if;
  end;
end $$;
-- Bo sends it back; now Ann can take it, and it leaves the gift box.
set test.uid = :bo;
select public.return_gift(:'gift');
set test.uid = :ann;
select public.take_gift(:'gift') as item \gset
do $$ begin
  if exists (select 1 from public.item_gifts) then raise exception 'FAILED: a taken gift stayed in the gift box'; end if;
end $$;
select :'item'::jsonb ->> 'name' = 'Arrows' as ok \gset
\if :ok
\else
  do $$ begin raise exception 'FAILED: the taken gift is not the item that was given'; end $$;
\endif
-- Ann gives again, then takes it back before Bo does.
select public.give_item(:tbl, :bo, '{"name": "Potion of Healing", "quantity": 1}') as gift2 \gset
set test.uid = :bo;
do $$ begin
  begin
    perform public.cancel_gift((select id from public.item_gifts limit 1));
    raise exception 'FAILED: the receiver cancelled the giver''s gift';
  exception when others then
    if sqlerrm like 'FAILED:%' then raise; end if;
  end;
end $$;
set test.uid = :ann;
select public.cancel_gift(:'gift2');
do $$ begin
  if exists (select 1 from public.item_gifts) then raise exception 'FAILED: a cancelled gift stayed in the gift box'; end if;
end $$;
