import { describe, it, expect, vi, beforeEach } from "vitest";
import { signOut } from "./auth";
import { supabase } from "./supabaseClient";

vi.mock("./supabaseClient", () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
}));

describe("signOut", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signs out this device only, so other devices on the account stay signed in", async () => {
    await signOut();

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
