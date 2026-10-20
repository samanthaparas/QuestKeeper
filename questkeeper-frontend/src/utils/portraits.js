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

// --- Shrinking big pictures before upload ------------------------------------------
//
// Screenshots from a Retina Mac or a phone camera can be several MB. Big
// ones are resized in the browser before they're uploaded (to at most
// 2000px on the long side, as a good-quality JPEG), so they fit the 5 MB
// limits easily and load fast for everyone. Small pictures and GIFs (which
// may be animated) are sent as they are.

export const SHRINK_MAX_SIDE = 2000;
export const SHRINK_OVER_BYTES = 1.5 * 1024 * 1024;

// Whether and how to shrink: { shrink: false } or { shrink: true, width,
// height } (the new size, keeping its shape).
export function shrinkPlan({ width, height, size, type }) {
  if (type === "image/gif") return { shrink: false };
  const longest = Math.max(width, height);
  if (longest <= SHRINK_MAX_SIDE && size <= SHRINK_OVER_BYTES) return { shrink: false };
  const scale = Math.min(1, SHRINK_MAX_SIDE / longest);
  return { shrink: true, width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// Returns the picture ready to upload: the same file, or a smaller JPEG. If
// the browser can't read it, the original comes back (the size check then
// says whether it's still too big).
export async function shrinkImage(file) {
  if (!file?.type?.startsWith("image/") || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const plan = shrinkPlan({ width: bitmap.width, height: bitmap.height, size: file.size, type: file.type });
    if (!plan.shrink) {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = plan.width;
    canvas.height = plan.height;
    const context = canvas.getContext("2d");
    // A white background, so see-through parts of a PNG don't turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, plan.width, plan.height);
    context.drawImage(bitmap, 0, 0, plan.width, plan.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]+$/, "") || "picture"}.jpg`;
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
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
