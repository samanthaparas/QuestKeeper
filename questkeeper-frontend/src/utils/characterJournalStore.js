import { supabase } from "./supabaseClient";

// A character's personal journal lives in Supabase (see
// 20261018_character_journal.sql). Only its owner can ever read or change it;
// sharing a note with a table is a separate, deliberate step (the notes are
// copied into the table's journal and remember where they went).

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export async function listPersonalNotes(characterId) {
  return unwrap(
    await supabase
      .from("character_journal_entries")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: true }),
  );
}

export async function addPersonalNote(characterId, { body, sessionNumber }) {
  return unwrap(
    await supabase
      .from("character_journal_entries")
      .insert({ character_id: characterId, body: body.trim(), session_number: sessionNumber })
      .select()
      .single(),
  );
}

export async function updatePersonalNote(id, { body, sessionNumber }) {
  unwrap(
    await supabase
      .from("character_journal_entries")
      .update({ body: body.trim(), session_number: sessionNumber })
      .eq("id", id),
  );
}

export async function deletePersonalNote(id) {
  unwrap(await supabase.from("character_journal_entries").delete().eq("id", id));
}

// Remember that a note was brought into a table's journal ("table" for the
// whole table, "private" for a Just me note there).
export async function markNoteShared(id, { tableId, as }) {
  unwrap(
    await supabase
      .from("character_journal_entries")
      .update({ shared_table_id: tableId, shared_as: as, shared_at: new Date().toISOString() })
      .eq("id", id),
  );
}
