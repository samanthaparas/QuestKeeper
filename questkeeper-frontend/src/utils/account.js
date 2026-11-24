// Account settings: display name, email and password, all kept by Supabase
// Auth. The display name lives in the account's user_metadata.

import { supabase } from "./supabaseClient";
import { clearAllSheetCaches } from "./sheetCache";

export const DISPLAY_NAME_MAX = 40;

export function getDisplayName(user) {
  const name = user?.user_metadata?.display_name;
  return typeof name === "string" ? name : "";
}

// Supabase's messages are written for developers; these are for players.
function friendlyError(error) {
  if (error?.code === "reauthentication_needed" || /reauthenticat/i.test(error?.message ?? "")) {
    return "For your safety, please log out and back in, then change your password straight away.";
  }
  if (error?.code === "same_password") return "That's already your password. Pick a new one.";
  if (error?.code === "weak_password") return error.message || "That password is too easy to guess.";
  if (error?.code === "email_exists") return "Another account already uses that email.";
  return error?.message || "Something went wrong. Please try again.";
}

async function update(attributes, options) {
  const { data, error } = await supabase.auth.updateUser(attributes, options);
  if (error) throw new Error(friendlyError(error));
  return data.user;
}

export function updateDisplayName(name) {
  return update({ data: { display_name: name.trim().slice(0, DISPLAY_NAME_MAX) } });
}

// Supabase emails a confirmation link (to the new address, and to the old one
// too when "secure email change" is on). The email only changes once it's
// clicked. The link brings them back to this Settings page.
export function updateEmail(email) {
  const back = `${window.location.origin}${window.location.pathname}#/settings`;
  return update({ email: email.trim() }, { emailRedirectTo: back });
}

export function updatePassword(password) {
  return update({ password });
}

// --- Your data: download it, or delete the account -----------------------------

// The file buckets the app writes to (see portraits.js, messageStore.js and
// handoutStore.js).
const PORTRAIT_BUCKET = "character-portraits";
const MESSAGE_BUCKET = "table-message-images";
const HANDOUT_BUCKET = "table-handout-images";

async function signedInUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You are signed out. Log in first.");
  return session.user;
}

// One section of the download. If it can't be read, the file says so instead
// of quietly leaving it out.
async function section(read) {
  try {
    const { data, error } = await read();
    if (error) throw error;
    return data ?? [];
  } catch {
    return { error: "This part couldn't be read. Try again later." };
  }
}

// Everything the person has put into QuestKeeper that they can read: their
// characters, homebrew, journal notes, messages they sent and their seats and
// tables. Returned as plain data for a JSON file.
export async function collectMyData() {
  const user = await signedInUserId();
  const mine = (table, column, columns = "*") =>
    section(() => supabase.from(table).select(columns).eq(column, user.id));

  const [characters, homebrew, characterJournal, tableJournal, messages, seats, tablesRun] = await Promise.all([
    mine("characters", "user_id"),
    mine("homebrew_entries", "owner_id"),
    mine("character_journal_entries", "owner_id"),
    mine("table_journal_entries", "author_id"),
    mine("table_messages", "sender_id", "table_id, body, image_path, created_at"),
    mine("table_members", "user_id", "table_id, character_id, joined_at"),
    mine("game_tables", "dm_id", "id, name, created_at"),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: { email: user.email ?? "", displayName: getDisplayName(user) },
    characters,
    homebrew,
    characterJournalNotes: characterJournal,
    tableJournalNotes: tableJournal,
    messagesYouSent: messages,
    tablesYouPlayAt: seats,
    tablesYouRun: tablesRun,
    note: "Pictures you uploaded are not in this file. Ask for them if you need them.",
  };
}

// Downloads collectMyData() as a file named for today.
export async function downloadMyData() {
  const data = await collectMyData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `questkeeper-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// How many tables the person runs (deleting the account deletes those for
// their players too, so the page says so first).
export async function countTablesIRun() {
  const user = await signedInUserId();
  const { count, error } = await supabase
    .from("game_tables")
    .select("id", { count: "exact", head: true })
    .eq("dm_id", user.id);
  if (error) throw error;
  return count ?? 0;
}

// Removes the person's uploaded pictures from file storage: their portraits,
// the pictures in messages they sent, and the handout pictures of tables they
// run. Best effort: a picture that can't be removed doesn't stop the deletion
// (the database rows that point at it are going anyway).
async function removeMyFiles(userId) {
  async function remove(bucket, paths) {
    const clean = paths.filter(Boolean);
    for (let start = 0; start < clean.length; start += 100) {
      await supabase.storage.from(bucket).remove(clean.slice(start, start + 100)).catch(() => {});
    }
  }
  const paths = async (read, key) => {
    try {
      const { data } = await read();
      return (data ?? []).map((row) => row[key]);
    } catch {
      return [];
    }
  };

  try {
    const { data: portraits } = await supabase.storage.from(PORTRAIT_BUCKET).list(userId);
    await remove(PORTRAIT_BUCKET, (portraits ?? []).map((file) => `${userId}/${file.name}`));
  } catch {
    // Nothing to remove, or it couldn't be listed.
  }
  await remove(
    MESSAGE_BUCKET,
    await paths(
      () => supabase.from("table_messages").select("image_path").eq("sender_id", userId).not("image_path", "is", null),
      "image_path",
    ),
  );
  const { data: tables } = await supabase.from("game_tables").select("id").eq("dm_id", userId);
  const tableIds = (tables ?? []).map((table) => table.id);
  if (tableIds.length > 0) {
    await remove(
      HANDOUT_BUCKET,
      await paths(
        () => supabase.from("table_handouts").select("image_path").in("table_id", tableIds).not("image_path", "is", null),
        "image_path",
      ),
    );
  }
}

// Deletes the account and everything in it, for good. The database function
// (20261123_delete_my_account.sql) does the real work; the pictures go first.
export async function deleteMyAccount() {
  const user = await signedInUserId();
  await removeMyFiles(user.id);
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    throw new Error(
      /function .* does not exist|not find the function/i.test(error.message ?? "")
        ? "Deleting accounts isn't switched on yet. Please try again later."
        : "The account couldn't be deleted. Nothing else was changed, so please try again.",
    );
  }
  // The login is gone: clear this device's saved sign-in and character copies.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  clearAllSheetCaches();
}
