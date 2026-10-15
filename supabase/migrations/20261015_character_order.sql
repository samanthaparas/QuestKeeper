-- Character order: lets players arrange the "Your Characters" list the way
-- they like (Reorder button on that page). Run this once in the Supabase SQL
-- editor.
--
-- Each character gets a number: 0 is the top of the list, 1 is next, and so
-- on. Empty (null) means "never placed", so new characters show up at the
-- top until the player reorders again.
--
-- No new permissions are needed: players can already update their own
-- characters, and this is just one more column on that row.
alter table public.characters
  add column if not exists list_position integer;
