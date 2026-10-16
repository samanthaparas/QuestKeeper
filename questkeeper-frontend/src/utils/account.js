// Account settings: display name, email and password, all kept by Supabase
// Auth. The display name lives in the account's user_metadata.

import { supabase } from "./supabaseClient";

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
