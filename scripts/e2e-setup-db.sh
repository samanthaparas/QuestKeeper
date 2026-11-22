#!/usr/bin/env bash
# Loads QuestKeeper's database into the local Supabase that the two-browser
# tests run against (started with: supabase --workdir e2e start). Runs the
# characters table (made in the dashboard, so it has no migration), then every
# file in supabase/migrations in the order listed in
# supabase/tests/migration-order.txt. Starts from a clean database each time.
#
# Only ever points at the local Supabase on port 54322, never the real one.

set -euo pipefail
cd "$(dirname "$0")/.."

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
run() { psql -X -q -v ON_ERROR_STOP=1 "$DB_URL" "$@"; }

# A clean slate: everything QuestKeeper made last time goes.
run -c "drop schema if exists public cascade; create schema public;
        grant usage on schema public to anon, authenticated, service_role;
        grant all on schema public to postgres, service_role;
        alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
        alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
        alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
        delete from auth.users;" >/dev/null

run -f supabase/tests/characters_table.sql >/dev/null
while read -r name; do
  case "$name" in ""|\#*) continue ;; esac
  run -f "supabase/migrations/$name" >/dev/null 2>&1 || {
    echo "Migration failed: $name"
    run -f "supabase/migrations/$name" 2>&1 | grep -m3 ERROR
    exit 1
  }
done < supabase/tests/migration-order.txt
# Supabase's API reads the new tables and functions.
run -c "notify pgrst, 'reload schema';" >/dev/null
echo "Local Supabase is ready."
