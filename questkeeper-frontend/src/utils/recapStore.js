import { supabase } from "./supabaseClient";

// The table's "Previously on..." recaps live in Supabase (see
// 20261022_table_recaps.sql): one short recap per session, which anyone at the
// table can read and change.

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export async function listRecaps(tableId) {
  return unwrap(await supabase.from("table_recaps").select("*").eq("table_id", tableId));
}

// Saves a session's recap. expectedAt is the updated_at of the version being
// edited (null if there wasn't one). campaign: which campaign it belongs to
// (null for the table's current one). An empty body removes it. Throws an error
// with code "changed" when someone else saved first, so the screen can say so.
export async function saveRecap(tableId, sessionNumber, body, expectedAt = null, campaign = null) {
  const { data, error } = await supabase.rpc("save_table_recap", {
    p_table_id: tableId,
    p_session: sessionNumber,
    p_body: body,
    p_expected_at: expectedAt,
    p_campaign: campaign,
  });
  if (error) {
    const failure = new Error(
      /RECAP_CHANGED/.test(error.message ?? "")
        ? "Someone else changed this recap just now."
        : (error.message ?? "Couldn't save the recap."),
    );
    if (/RECAP_CHANGED/.test(error.message ?? "")) failure.code = "changed";
    throw failure;
  }
  return data;
}

// Calls onChange when anyone saves or removes a recap at this table.
export function subscribeToRecaps(tableId, onChange) {
  const channel = supabase
    .channel(`recaps-${tableId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "table_recaps", filter: `table_id=eq.${tableId}` },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
