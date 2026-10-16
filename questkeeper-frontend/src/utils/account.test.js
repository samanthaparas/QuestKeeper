import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDisplayName, updateDisplayName, updatePassword } from "./account";
import { supabase } from "./supabaseClient";

vi.mock("./supabaseClient", () => ({ supabase: { auth: { updateUser: vi.fn() } } }));

describe("account settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the display name, or an empty one", () => {
    expect(getDisplayName({ user_metadata: { display_name: "Sam" } })).toBe("Sam");
    expect(getDisplayName({ user_metadata: {} })).toBe("");
    expect(getDisplayName(null)).toBe("");
  });

  it("trims the display name and keeps it short", async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: { user: {} }, error: null });
    await updateDisplayName(`  ${"a".repeat(60)}  `);
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: { display_name: "a".repeat(40) } }, undefined);
  });

  it("explains when Supabase wants a fresh sign-in first", async () => {
    supabase.auth.updateUser.mockResolvedValue({
      data: {},
      error: { code: "reauthentication_needed", message: "Password update requires reauthentication" },
    });
    await expect(updatePassword("dragon-hoard")).rejects.toThrow(/log out and back in/);
  });
});
