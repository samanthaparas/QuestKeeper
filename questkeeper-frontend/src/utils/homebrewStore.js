import { supabase } from "./supabaseClient";
import { cleanHomebrewData } from "./homebrewMappers";

// All homebrew data lives in Supabase. Row level security decides who sees
// what; see supabase/migrations/20261011_homebrew.sql.

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// Trims and limits the form values before they're saved.
function toRow({ category, name, basedOn, linkUrl, summary, data, isShared }) {
  return {
    category,
    name: String(name ?? "").trim().slice(0, 80),
    based_on: String(basedOn ?? "").trim().slice(0, 120) || null,
    link_url: String(linkUrl ?? "").trim() || null,
    summary: String(summary ?? "").trim().slice(0, 5000),
    data: cleanHomebrewData(category, data),
    is_shared: Boolean(isShared),
  };
}

// --- Entries ------------------------------------------------------------------

// Everything the signed-in user can see: their own (drafts too), plus shared
// entries from tables they're at and people who invited them.
export async function listVisibleHomebrew() {
  return unwrap(
    await supabase
      .from("homebrew_entries")
      .select("*")
      .order("name", { ascending: true }),
  );
}

export async function createHomebrew(entry) {
  return unwrap(
    await supabase.from("homebrew_entries").insert(toRow(entry)).select().single(),
  );
}

export async function updateHomebrew(id, entry) {
  return unwrap(
    await supabase
      .from("homebrew_entries")
      .update(toRow(entry))
      .eq("id", id)
      .select()
      .single(),
  );
}

export async function deleteHomebrew(id) {
  unwrap(await supabase.from("homebrew_entries").delete().eq("id", id));
}

// --- Sharing with tables ----------------------------------------------------------

// The tables the signed-in user shares their homebrew with.
export async function listMyTableShares(userId) {
  return unwrap(
    await supabase
      .from("homebrew_table_shares")
      .select("table_id")
      .eq("owner_id", userId),
  ).map((row) => row.table_id);
}

export async function shareWithTable(tableId) {
  unwrap(await supabase.from("homebrew_table_shares").insert({ table_id: tableId }));
}

export async function stopSharingWithTable(userId, tableId) {
  unwrap(
    await supabase
      .from("homebrew_table_shares")
      .delete()
      .eq("owner_id", userId)
      .eq("table_id", tableId),
  );
}

// --- Invite links ----------------------------------------------------------------

// recipientLabel: who it's for ("Jordan"); senderLabel: how you appear ("Sam").
export async function createInvite({ recipientLabel, senderLabel }) {
  return unwrap(
    await supabase
      .from("homebrew_invites")
      .insert({
        recipient_label: String(recipientLabel).trim().slice(0, 40),
        sender_label: String(senderLabel).trim().slice(0, 40),
      })
      .select()
      .single(),
  );
}

// Links you've made that nobody has used yet (expired ones included, so you
// can see and tidy them).
export async function listPendingInvites() {
  return unwrap(
    await supabase
      .from("homebrew_invites")
      .select("*")
      .is("accepted_by", null)
      .order("created_at", { ascending: false }),
  );
}

export async function cancelInvite(id) {
  unwrap(await supabase.from("homebrew_invites").delete().eq("id", id));
}

// What the invite page shows: { sender_label, status }, where status is
// "ok", "used", "expired", "own" or "not_found".
export async function getInvite(code) {
  const rows = unwrap(await supabase.rpc("get_homebrew_invite", { p_code: code }));
  return rows?.[0] ?? { sender_label: null, status: "not_found" };
}

export async function acceptInvite(code) {
  unwrap(await supabase.rpc("accept_homebrew_invite", { p_code: code }));
}

// The full link to send someone. The app uses hash routes (#/...), so the
// invite goes after the page address (which also works if the site moves
// into a subfolder).
export function inviteUrl(code, location = window.location) {
  return `${location.origin}${location.pathname}#/homebrew/invite/${code}`;
}

// --- Lasting access ---------------------------------------------------------------

// Both lists in one call: people you've shared with, and people sharing with you.
export async function listGrants(userId) {
  const rows = unwrap(
    await supabase
      .from("homebrew_grants")
      .select("*")
      .order("created_at", { ascending: false }),
  );
  return {
    sharedByMe: rows.filter((row) => row.owner_id === userId),
    sharedWithMe: rows.filter((row) => row.grantee_id === userId),
  };
}

// The author revoking someone, or the recipient removing access they were given.
export async function removeGrant(ownerId, granteeId) {
  unwrap(
    await supabase
      .from("homebrew_grants")
      .delete()
      .eq("owner_id", ownerId)
      .eq("grantee_id", granteeId),
  );
}
