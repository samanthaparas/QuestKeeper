import { supabase } from "./supabaseClient";

export function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

// "local" signs out this device only. The default, "global", would sign the
// account out everywhere, which kicks other people (or your phone) out too.
export function signOut() {
  return supabase.auth.signOut({ scope: "local" });
}
