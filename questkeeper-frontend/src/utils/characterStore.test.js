import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveCharacter, saveCharacterOrder, sortByListPosition, deleteCharacter } from "./characterStore";
import { supabase } from "./supabaseClient";

const single = vi.fn();
const upsert = vi.fn(() => ({ select: () => ({ single }) }));
const eq = vi.fn();
const update = vi.fn(() => ({ eq }));
const deletedRows = vi.fn();
const remove = vi.fn(() => ({ eq: () => ({ select: deletedRows }) }));

vi.mock("./supabaseClient", () => ({
  supabase: {
    auth: { getSession: vi.fn(), getUser: vi.fn() },
    from: vi.fn(() => ({ upsert, update, delete: remove })),
  },
}));

describe("saveCharacter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    single.mockResolvedValue({
      data: { id: "c1", data: { name: "Dangit" }, updated_at: "2026-10-03T00:00:00Z" },
      error: null,
    });
  });

  it("uses the saved session to find the owner, without calling the login service", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    const saved = await saveCharacter({ id: "c1", name: "Dangit" });

    expect(supabase.auth.getUser).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "c1", user_id: "u1" }));
    expect(saved.name).toBe("Dangit");
  });

  it("gives a clear error instead of crashing when signed out", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(saveCharacter({ id: "c1", name: "Dangit" })).rejects.toThrow(/signed out/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("refuses to save someone else's character, and never hands it to the saver", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "dm-1" } } } });

    await expect(saveCharacter({ id: "c1", name: "Dangit", ownerId: "player-1" })).rejects.toMatchObject({
      code: "not_owner",
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("saves the owner's own character without putting ownerId into the saved data", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });

    await saveCharacter({ id: "c1", name: "Dangit", ownerId: "u1" });

    const row = upsert.mock.calls[0][0];
    expect(row.user_id).toBe("u1");
    expect(row.data).not.toHaveProperty("ownerId");
  });
});

describe("saveCharacter and list order", () => {
  it("keeps the list position out of the sheet's saved data", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    single.mockResolvedValue({
      data: { id: "c1", data: { name: "Dangit" }, updated_at: "2026-10-03T00:00:00Z", list_position: 2 },
      error: null,
    });

    const saved = await saveCharacter({ id: "c1", name: "Dangit", listPosition: 2 });

    expect(upsert.mock.calls[0][0].data).not.toHaveProperty("listPosition");
    expect(saved.listPosition).toBe(2);
  });
});

describe("sortByListPosition", () => {
  it("puts characters the player hasn't placed yet first, then the chosen order", () => {
    const list = [
      { id: "newest", listPosition: null },
      { id: "b", listPosition: 1 },
      { id: "a", listPosition: 0 },
      { id: "new", listPosition: null },
    ];

    expect(sortByListPosition(list).map((sheet) => sheet.id)).toEqual(["newest", "new", "a", "b"]);
    expect(list[1].id).toBe("b");
  });
});

describe("saveCharacterOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("numbers the characters from the top and leaves the rest of each row alone", async () => {
    eq.mockResolvedValue({ error: null });

    await saveCharacterOrder(["billie", "pippa"]);

    expect(update).toHaveBeenCalledWith({ list_position: 0 });
    expect(update).toHaveBeenCalledWith({ list_position: 1 });
    expect(eq).toHaveBeenCalledWith("id", "billie");
    expect(eq).toHaveBeenCalledWith("id", "pippa");
  });

  it("reports a failure so the page can say so", async () => {
    eq.mockResolvedValue({ error: new Error("column does not exist") });

    await expect(saveCharacterOrder(["billie"])).rejects.toThrow(/column/);
  });
});

describe("deleteCharacter", () => {
  it("succeeds when the row was really deleted", async () => {
    deletedRows.mockResolvedValue({ data: [{ id: "grog" }], error: null });

    await expect(deleteCharacter("grog")).resolves.toBeUndefined();
  });

  it("treats a delete that removed nothing as a failure, so it isn't silent", async () => {
    deletedRows.mockResolvedValue({ data: [], error: null });

    await expect(deleteCharacter("grog")).rejects.toThrow(/wasn't deleted/);
  });
});
