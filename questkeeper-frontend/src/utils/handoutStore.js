import { supabase } from "./supabaseClient";
import { validateMessageImage } from "./messageStore";

// Handouts live in Supabase (see 20261015_table_handouts.sql). The database
// only ever gives a player the handouts revealed to them, so a hidden one
// (and its picture) never reaches their browser.

const BUCKET = "table-handout-images";
// How long a picture's private link works before it's fetched again.
const SIGNED_URL_SECONDS = 60 * 60;

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// Same rules as message pictures: PNG, JPG, WebP or GIF under 5 MB.
export const validateHandoutImage = validateMessageImage;

export async function listHandouts(tableId) {
  return unwrap(
    await supabase
      .from("table_handouts")
      .select("*")
      .eq("table_id", tableId)
      .order("created_at", { ascending: false }),
  );
}

// DM only. A new handout starts hidden. The picture (optional) is stored
// under the handout's own folder so its privacy follows the handout.
export async function createHandout(tableId, { title, body, imageFile }) {
  const id = crypto.randomUUID();
  let imagePath = null;
  if (imageFile) imagePath = await uploadHandoutImage(tableId, id, imageFile);

  return unwrap(
    await supabase
      .from("table_handouts")
      .insert({ id, table_id: tableId, title: title.trim(), body: body.trim(), image_path: imagePath })
      .select()
      .single(),
  );
}

export async function updateHandout(handout, { title, body, imageFile, removeImage = false }) {
  let imagePath = handout.image_path;
  if (imageFile) {
    imagePath = await uploadHandoutImage(handout.table_id, handout.id, imageFile);
  } else if (removeImage) {
    imagePath = null;
  }
  if (handout.image_path && imagePath !== handout.image_path) {
    await supabase.storage.from(BUCKET).remove([handout.image_path]);
  }

  unwrap(
    await supabase
      .from("table_handouts")
      .update({ title: title.trim(), body: body.trim(), image_path: imagePath })
      .eq("id", handout.id),
  );
}

// Reveal to everyone, or to some players (their user ids). Hide with
// { everyone: false, userIds: [] }.
export async function setHandoutAudience(handoutId, { everyone, userIds }) {
  const shown = everyone || userIds.length > 0;
  unwrap(
    await supabase
      .from("table_handouts")
      .update({
        shown_to_all: everyone,
        shown_to: everyone ? [] : userIds,
        revealed_at: shown ? new Date().toISOString() : null,
      })
      .eq("id", handoutId),
  );
}

export async function deleteHandout(handout) {
  if (handout.image_path) await supabase.storage.from(BUCKET).remove([handout.image_path]);
  unwrap(await supabase.from("table_handouts").delete().eq("id", handout.id));
}

async function uploadHandoutImage(tableId, handoutId, file) {
  const extension = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${tableId}/${handoutId}/${crypto.randomUUID()}.${extension}`;
  unwrap(await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type }));
  return path;
}

// A short-lived private link to a handout's picture.
export async function getHandoutImageUrl(path) {
  const data = unwrap(await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS));
  return data.signedUrl;
}

// Calls onChange when a handout at this table is added, changed or removed
// (row-level security still decides what each person receives).
export function subscribeToHandouts(tableId, onChange) {
  const channel = supabase
    .channel(`handouts-${tableId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "table_handouts", filter: `table_id=eq.${tableId}` },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
