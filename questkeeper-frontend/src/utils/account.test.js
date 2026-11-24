import { describe, it, expect, vi, beforeEach } from "vitest";
import { collectMyData, deleteMyAccount, getDisplayName, updateDisplayName, updatePassword } from "./account";
import { supabase } from "./supabaseClient";

const calls = vi.hoisted(() => ({ removed: [], tables: {} }));
vi.mock("./supabaseClient", () => ({
  supabase: {
    auth: { updateUser: vi.fn(), getSession: vi.fn(), signOut: vi.fn().mockResolvedValue({}) },
    rpc: vi.fn(),
    // from(table): a chain that ends in { data } for whatever the test put in calls.tables
    from: vi.fn((table) => {
      const result = () => Promise.resolve(calls.tables[table] ?? { data: [], error: null });
      const chain = { select: () => chain, eq: () => chain, in: () => chain, not: () => chain, then: (resolve, reject) => result().then(resolve, reject) };
      return chain;
    }),
    storage: {
      from: vi.fn((bucket) => ({
        list: vi.fn(async () => ({ data: bucket === "character-portraits" ? [{ name: "c1.png" }] : [] })),
        remove: vi.fn(async (paths) => { calls.removed.push([bucket, ...paths]); return { data: [] }; }),
      })),
    },
  },
}));

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

describe("your data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.removed = [];
    calls.tables = {};
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1", email: "sam@example.com", user_metadata: { display_name: "Sam" } } } } });
  });

  it("gathers the person's characters and more, and says when a part can't be read", async () => {
    calls.tables.characters = { data: [{ id: "c1", data: { name: "Pippa" } }], error: null };
    calls.tables.homebrew_entries = { data: null, error: { message: "nope" } };

    const data = await collectMyData();

    expect(data.account).toEqual({ email: "sam@example.com", displayName: "Sam" });
    expect(data.characters).toHaveLength(1);
    expect(data.homebrew).toEqual({ error: "This part couldn't be read. Try again later." });
    expect(data.tablesYouRun).toEqual([]);
  });

  it("refuses to gather anything when signed out", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(collectMyData()).rejects.toThrow(/signed out/i);
  });

  it("removes their pictures first, then deletes the account and signs this device out", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    calls.tables.table_messages = { data: [{ image_path: "conv1/a.png" }], error: null };
    calls.tables.game_tables = { data: [{ id: "t1" }], error: null };
    calls.tables.table_handouts = { data: [{ image_path: "t1/h1/map.png" }], error: null };

    await deleteMyAccount();

    expect(calls.removed).toContainEqual(["character-portraits", "u1/c1.png"]);
    expect(calls.removed).toContainEqual(["table-message-images", "conv1/a.png"]);
    expect(calls.removed).toContainEqual(["table-handout-images", "t1/h1/map.png"]);
    expect(supabase.rpc).toHaveBeenCalledWith("delete_my_account");
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("keeps the account, and says so, when the deletion is refused", async () => {
    supabase.rpc.mockResolvedValue({ error: { message: "boom" } });
    await expect(deleteMyAccount()).rejects.toThrow(/couldn't be deleted/);
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it("explains when the database function hasn't been added yet", async () => {
    supabase.rpc.mockResolvedValue({ error: { message: "Could not find the function public.delete_my_account" } });
    await expect(deleteMyAccount()).rejects.toThrow(/isn't switched on yet/);
  });
});
