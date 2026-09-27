import { supabase } from "./supabaseClient";

function rowToSheet(row) {
  return { ...row.data, id: row.id, updatedAt: row.updated_at };
}

export async function listCharacters() {
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .order("updated_at", { ascending: false });

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
