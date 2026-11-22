// The local Supabase the two-browser tests run against. These are the
// standard, public keys every local Supabase uses (from `supabase start`),
// not secrets; they only work on this computer.
export const LOCAL = {
  appPort: 5179,
  supabaseUrl: "http://127.0.0.1:54321",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  serviceKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
};

// The test accounts, made fresh for each run in the local Supabase only.
export const PEOPLE = {
  dm: { email: "dm@e2e.test", password: "local-test-dm-123", name: "Dana the DM" },
  player: { email: "player@e2e.test", password: "local-test-player-123", character: "Rowan" },
  friend: { email: "friend@e2e.test", password: "local-test-friend-123", character: "Wren" },
};
