import { describe, it, expect, vi, beforeEach } from "vitest";
import { signOut } from "./auth";
import { supabase } from "./supabaseClient";
import { readDestination, rememberDestination } from "./continueAfterLogin";
import { installFakeStorage } from "../test/fakeStorage";

vi.mock("./supabaseClient", () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
}));

describe("signOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFakeStorage();
  });

  it("signs out this device only, so other devices on the account stay signed in", async () => {
    await signOut();

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("forgets where this device was headed, so the next account doesn't inherit it", async () => {
    rememberDestination({ from: "/games", fromState: { code: "ABC123" } });
    await signOut();
    expect(readDestination()).toBeNull();
  });
});
