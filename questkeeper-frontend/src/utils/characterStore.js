import { supabase } from "./supabaseClient";

function rowToSheet(row) {
  return {
    ...row.data,
    id: row.id,
    updatedAt: row.updated_at,
    listPosition: row.list_position ?? null,
    // Who the character belongs to. A DM can read the characters at their
    // table, so the sheet uses this to tell "mine" from "a player's".
    ownerId: row.user_id ?? null,
  };
}

// Only the signed-in user's own characters. Row-level security also lets a DM
// read the characters of players at their table, so this must filter by owner
// or those characters would show up in the DM's own list.
export async function listCharacters() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return [];

  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", session.user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data.map(rowToSheet);
}

// Read-only lookup used by a DM's table view (allowed by row-level security
// only for characters at a table the caller runs).
export async function getCharactersByIds(ids) {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .in("id", ids);

  if (error) throw error;
  return data.map(rowToSheet);
}

export async function getCharacter(id) {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToSheet(data) : null;
}

// baseUpdatedAt: the "last updated" time of the version this edit started from
// (what the server told us last). When it's given, the save only goes ahead if
// the character is still at that version: if another device or tab saved in
// the meantime, nothing is overwritten and the error has code
// "version_conflict", so the sheet can ask which version to keep. Without it
// (a brand-new character) the sheet is simply created.
export async function saveCharacter(sheet, { baseUpdatedAt = null } = {}) {
  // listPosition lives in its own column (see saveCharacterOrder), so it's
  // kept out of the sheet's saved data.
  // ownerId comes from the row's own column, so it isn't saved inside the data.
  // eslint-disable-next-line no-unused-vars
  const { id, listPosition, ownerId, ...rest } = sheet;
  // getSession reads the saved session locally. getUser would make a network
  // call to the login service on every save, which counts toward its rate limit.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("You are signed out. Log in to save changes.");
  // Only the owner can save, and a save never hands the character to someone
  // else. (The database refuses it too; this says why, instead of looking
  // like a lost connection.)
  if (ownerId && ownerId !== session.user.id) {
    throw Object.assign(new Error("Only the player who owns this character can change it."), {
      code: "not_owner",
    });
  }

  if (baseUpdatedAt) {
    // One database step: change the row only if it is still the version we
    // started from. Zero rows back means it isn't (or it's gone).
    const { data: updated, error: updateError } = await supabase
      .from("characters")
      .update({ data: rest, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("updated_at", baseUpdatedAt)
      .select()
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) return rowToSheet(updated);

    const { data: current, error: lookupError } = await supabase
      .from("characters")
      .select("id, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (current) {
      throw Object.assign(new Error("This character was changed on another device."), {
        code: "version_conflict",
      });
    }
    // The character is gone (deleted elsewhere): fall through and save it
    // again, as before, rather than silently losing these edits.
  }

  const { data, error } = await supabase
    .from("characters")
    .upsert({
      id,
      user_id: session.user.id,
      data: rest,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return rowToSheet(data);
}

// The player's own order for the "Your Characters" list. Characters they
// haven't placed yet (made since they last reordered) come first, newest
// first; the rest follow in the order they chose. Doesn't change the list
// it's given.
export function sortByListPosition(characters) {
  const unplaced = characters.filter((sheet) => sheet.listPosition == null);
  const placed = characters
    .filter((sheet) => sheet.listPosition != null)
    .sort((a, b) => a.listPosition - b.listPosition);
  return [...unplaced, ...placed];
}

// Saves a new order: the first id goes to the top. Only list_position is
// written, so the characters' "last updated" time (used to find the player's
// most recent character) doesn't change.
export async function saveCharacterOrder(ids) {
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from("characters").update({ list_position: index }).eq("id", id),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
}

// The database doesn't report an error when it refuses to delete a row (it
// just deletes nothing), so ask for the deleted row back and treat "none" as
// a failure the page can show.
export async function deleteCharacter(id) {
  const { data, error } = await supabase.from("characters").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("The character wasn't deleted.");
}

export async function getMostRecentCharacter() {
  const characters = await listCharacters();
  return characters[0] ?? null;
}
