-- Housekeeping: remove the old four-part version of save_table_recap. Run
-- this once in the Supabase SQL editor (safe to run again).
--
-- 20261022_campaigns.sql replaced it with a five-part version (it added the
-- campaign number) and the app only ever calls that one, but the old one was
-- still in the live database beside it. Nothing uses it; this just tidies up.
-- The current save_table_recap(uuid, int, text, timestamptz, int) is untouched.

drop function if exists public.save_table_recap(uuid, int, text, timestamptz);
