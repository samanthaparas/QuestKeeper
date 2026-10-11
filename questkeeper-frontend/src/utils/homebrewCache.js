// The signed-in player's homebrew, loaded once and reused by every page
// (pickers, reference pages, level-up, the sheet). api.js reads it so that
// homebrew shows up wherever SRD and Open5e options do.
//
// Logged out, or before the homebrew migration has been run, this is simply
// an empty list, so nothing else breaks.

let cached = null; // { userId, promise }

async function currentUserId() {
  // Loaded only when needed, so code that never touches homebrew (and its
  // tests) doesn't have to start the Supabase client.
  const { supabase } = await import("./supabaseClient");
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export async function loadHomebrew() {
  const userId = await currentUserId().catch(() => null);
  if (!userId) return [];

  // Reuse the saved list unless someone else has logged in since.
  if (cached?.userId === userId) return cached.promise;

  const { listVisibleHomebrew } = await import("./homebrewStore");
  const promise = listVisibleHomebrew().catch((error) => {
    console.warn("Homebrew unavailable:", error?.message ?? error);
    cached = null; // try again next time
    return [];
  });
  cached = { userId, promise };
  return promise;
}

// Call after saving, deleting, or accepting an invite so the next lookup
// sees the change.
export function refreshHomebrew() {
  cached = null;
}

// The My Homebrew page already has the full list; share it instead of
// fetching again.
export function primeHomebrew(userId, entries) {
  cached = { userId, promise: Promise.resolve(entries) };
}
