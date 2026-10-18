import { supabase } from "./supabaseClient";

// The table journal lives in Supabase (see 20261015_table_journal.sql). The
// database signs each entry with the character's name (or "DM") and the
// session number, and only ever shows you shared entries plus your own.

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export async function listJournal(tableId) {
  return unwrap(
    await supabase
      .from("table_journal_entries")
      .select("*")
      .eq("table_id", tableId)
      .order("created_at", { ascending: true }),
  );
}

// sessionNumber: the session to file it under; leave it out for the table's
// current session.
export async function addJournalEntry(tableId, { body, visibility, sessionNumber }) {
  return unwrap(
    await supabase
      .from("table_journal_entries")
      .insert({
        table_id: tableId,
        body: body.trim(),
        visibility,
        ...(sessionNumber ? { session_number: sessionNumber } : {}),
      })
      .select()
      .single(),
  );
}

export async function updateJournalEntry(id, { body, visibility, sessionNumber }) {
  unwrap(
    await supabase
      .from("table_journal_entries")
      .update({
        body: body.trim(),
        visibility,
        ...(sessionNumber ? { session_number: sessionNumber } : {}),
      })
      .eq("id", id),
  );
}

export async function deleteJournalEntry(id) {
  unwrap(await supabase.from("table_journal_entries").delete().eq("id", id));
}

// DM only: new entries go under the next session from now on.
export async function startNextSession(tableId, currentSession) {
  unwrap(
    await supabase
      .from("game_tables")
      .update({ session_number: currentSession + 1 })
      .eq("id", tableId),
  );
}

// DM only: set the table's current session to any number (a campaign that
// continues at session 41, say).
export async function setSessionNumber(tableId, sessionNumber) {
  unwrap(
    await supabase
      .from("game_tables")
      .update({ session_number: sessionNumber })
      .eq("id", tableId),
  );
}

// Calls onChange when anyone adds, edits or removes an entry at this table
// (row-level security still decides what each person receives).
export function subscribeToJournal(tableId, onChange) {
  const channel = supabase
    .channel(`journal-${tableId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "table_journal_entries", filter: `table_id=eq.${tableId}` },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
