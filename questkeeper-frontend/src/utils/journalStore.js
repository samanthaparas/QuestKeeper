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

// --- Campaigns (see 20261022_campaigns.sql) ------------------------------------
// A table can run several campaigns one after another. Notes belong to the
// table's current campaign when written. All of these are DM only.

// Splits the current campaign in two. The notes written between oldFrom and
// oldUntil (either can be null for "no limit") stay and become the older
// campaign (named firstName); every other note becomes the new current
// campaign (named secondName), optionally with its sessions numbered from 1.
// Returns { campaign, kept, moved }.
export async function splitCampaign(tableId, { oldFrom, oldUntil, firstName, secondName, restartSecond = true }) {
  return unwrap(
    await supabase.rpc("split_campaign", {
      p_table_id: tableId,
      p_old_from: oldFrom,
      p_old_until: oldUntil,
      p_first_name: firstName,
      p_second_name: secondName,
      p_restart_second: restartSecond,
    }),
  );
}

// Starts the next campaign from session 1.
export async function startCampaign(tableId, name) {
  return unwrap(await supabase.rpc("start_campaign", { p_table_id: tableId, p_name: name }));
}

export async function nameCampaign(tableId, campaign, name) {
  unwrap(await supabase.rpc("name_campaign", { p_table_id: tableId, p_campaign: campaign, p_name: name }));
}

// Moves notes to another campaign (to fix one that landed on the wrong side).
export async function moveJournalEntries(tableId, entryIds, campaign) {
  return unwrap(
    await supabase.rpc("move_journal_entries", {
      p_table_id: tableId,
      p_entry_ids: entryIds,
      p_campaign: campaign,
    }),
  );
}

// The portraits of the characters at this table, as a Map from a player's user
// id to their picture link, so notes can show who wrote them. Notes still work
// without it (they fall back to initials), so a failure just gives an empty Map.
export async function getTablePortraits(tableId) {
  try {
    const rows = unwrap(await supabase.rpc("get_table_member_portraits", { p_table_id: tableId }));
    return new Map(
      (rows ?? [])
        .filter((row) => row.userId && typeof row.portraitUrl === "string" && row.portraitUrl)
        .map((row) => [row.userId, row.portraitUrl]),
    );
  } catch {
    return new Map();
  }
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
