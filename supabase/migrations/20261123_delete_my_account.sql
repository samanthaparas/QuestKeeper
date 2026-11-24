-- "Delete my account" (Settings > Your data).
--
-- A signed-in person can delete their own account. Deleting the login removes
-- everything that belongs to it, because every table that points at a person
-- is set to delete with them (characters, journal notes, messages they sent,
-- homebrew, seats at tables, and any tables they run, which disappear for the
-- players too). Rows that only mention them by name (an "updated by" note)
-- just lose the link.
--
-- Pictures in file storage are removed by the app first (it asks the storage
-- service, which is the only clean way to delete the files themselves).
--
-- Safe to run more than once. No other migration has to run before it.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
