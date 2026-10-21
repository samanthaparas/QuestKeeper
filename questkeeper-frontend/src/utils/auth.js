import { supabase } from "./supabaseClient";
import { clearDestination } from "./continueAfterLogin";

export function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

// "local" signs out this device only. The default, "global", would sign the
// account out everywhere, which kicks other people (or your phone) out too.
// It also forgets any "carry on after signing in" note, so the next person
// to sign in on this device isn't sent where you were headed.
export function signOut() {
  clearDestination();
  return supabase.auth.signOut({ scope: "local" });
}

// Emails a link that opens QuestKeeper so they can choose a new password.
// The link goes back to the site's front door with no "#/route": Supabase adds
// the sign-in details after a "#", which would clash with the "#/route"
// addresses this app uses. (The address has to be on Supabase's allowed
// redirect list.)
export function requestPasswordReset(email) {
  const back = `${window.location.origin}${window.location.pathname}`;
  return supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: back });
}

// "Remember my email" keeps only the email on this device (never the
// password; the browser's own password manager handles that).
const EMAIL_KEY = "qk-remembered-email";

export function getRememberedEmail() {
  try {
    return window.localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return ""; // storage blocked (private window)
  }
}

export function setRememberedEmail(email) {
  try {
    if (email) window.localStorage.setItem(EMAIL_KEY, email.trim());
    else window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    // Not saved; they just type it next time.
  }
}
