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
