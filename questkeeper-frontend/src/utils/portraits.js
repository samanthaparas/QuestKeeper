import { supabase } from "./supabaseClient";

const BUCKET = "character-portraits";
// 5 MB, the same as pictures in messages: phone photos are often over 2 MB.
// (The character-portraits storage bucket in Supabase must allow at least
// this much too; see its "Restrict file upload size" setting.)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validatePortraitFile(file) {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Images must be smaller than 5 MB.";
  }
  return null;
}

export async function uploadPortrait(userId, characterId, file) {
  const extension = file.name.split(".").pop();
  const path = `${userId}/${characterId}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
