#!/usr/bin/env bash
# The database test: builds QuestKeeper's database from scratch on a plain
# Postgres, the way Supabase has it, and checks its security rules.
#
#   1. supabase/tests/supabase_stubs.sql stands in for what Supabase provides
#      (sign-in, file storage, the characters table made in the dashboard).
#   2. Every file in supabase/migrations runs, in the order listed in
#      supabase/tests/migration-order.txt. A file missing from that list, or
#      one that fails, stops the test.
#   3. Each supabase/tests/*.test.sql file runs; any failed check stops it.
#
# Needs psql and a throwaway Postgres to point at. Uses PGHOST, PGPORT,
# PGUSER and PGPASSWORD like psql does, and makes (and replaces) a database
# named qk_test. Never point it at the real database.
#
#   scripts/test-database.sh

set -euo pipefail
cd "$(dirname "$0")/.."

DB=qk_test
run() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }

# Every migration has to be in the order list, so a new one can't be skipped.
missing=0
for file in supabase/migrations/*.sql; do
  name=$(basename "$file")
  if ! grep -qx "$name" supabase/tests/migration-order.txt; then
    echo "Not in supabase/tests/migration-order.txt: $name (add it at the end)"
    missing=1
  fi
done
[ "$missing" -eq 0 ] || exit 1

run -d postgres -c "drop database if exists $DB" -c "create database $DB"
run -d "$DB" -f supabase/tests/supabase_stubs.sql >/dev/null 2>&1

count=0
while read -r name; do
  case "$name" in ""|\#*) continue ;; esac
  run -d "$DB" -f "supabase/migrations/$name" >/dev/null 2>&1 || {
    echo "Migration failed: $name"
    run -d "$DB" -f "supabase/migrations/$name" 2>&1 | grep -m3 ERROR
    exit 1
  }
  count=$((count + 1))
done < supabase/tests/migration-order.txt
echo "Ran $count migrations."


for test in supabase/tests/*.test.sql; do
  run -d "$DB" -o /dev/null -f "$test"
  echo "Passed: $(basename "$test")"
done
