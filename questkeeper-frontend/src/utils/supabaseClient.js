import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A password-reset email link arrives as ".../#access_token=...&type=recovery".
// Supabase reads and clears that on start-up, so note it here first, before
// the client is created: AuthProvider uses it to show the "choose a new
// password" form.
export const openedFromRecoveryLink =
  typeof window !== "undefined" && /[#&]type=recovery\b/.test(window.location.hash);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
