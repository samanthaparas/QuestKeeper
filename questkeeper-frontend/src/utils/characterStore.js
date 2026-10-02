import { supabase } from "./supabaseClient";

function rowToSheet(row) {
  return { ...row.data, id: row.id, updatedAt: row.updated_at };
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

export async function saveCharacter(sheet) {
  const { id, ...rest } = sheet;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("characters")
    .upsert({
      id,
      user_id: user.id,
      data: rest,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return rowToSheet(data);
}

export async function deleteCharacter(id) {
  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) throw error;
}

export async function getMostRecentCharacter() {
  const characters = await listCharacters();
  return characters[0] ?? null;
}
