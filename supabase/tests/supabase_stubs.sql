-- Stand-ins for what Supabase gives every project, so the SQL files in
-- supabase/migrations can run on a plain Postgres in CI (see
-- scripts/test-database.sh). Never run this on the real database.
--
-- auth.uid() reads a setting the tests change to "sign in" as someone:
--   set test.uid = '<user id>';
-- An empty setting is a signed-out visitor.

create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;

-- Supabase lets the signed-in and signed-out roles use what's in the public
-- schema; row-level security and the functions' own checks decide the rest.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;
grant execute on all functions in schema auth to anon, authenticated;
create or replace function auth.role() returns text language sql stable as $$
  select case when auth.uid() is null then 'anon' else 'authenticated' end
$$;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz default now()
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

-- Supabase's realtime publication (tables are added to it by the migrations).
do $$ begin create publication supabase_realtime; exception when duplicate_object then null; end $$;

-- The characters table (shared with the two-browser tests).
\ir characters_table.sql
grant execute on function auth.uid(), auth.role() to anon, authenticated;

