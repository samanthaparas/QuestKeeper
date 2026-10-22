import { describe, it, expect, vi, beforeEach } from "vitest";
import { cancelAttack, dealDamage, pickActiveTable } from "./tableStore";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("./supabaseClient", () => ({ supabase: { rpc } }));

const original = { id: "t-old", name: "Sam's Silly Garden Chase" };
const newest = { id: "t-new", name: "Final Fight Practice" };

describe("pickActiveTable", () => {
  it("follows the most recently joined table by default", () => {
    const { table, sorted } = pickActiveTable([original, newest], ["t-new", "t-old"]);

    expect(table.id).toBe("t-new");
    expect(sorted.map((entry) => entry.id)).toEqual(["t-new", "t-old"]);
  });

  it("does not depend on the order the tables came back in", () => {
    expect(pickActiveTable([newest, original], ["t-new", "t-old"]).table.id).toBe("t-new");
    expect(pickActiveTable([original, newest], ["t-new", "t-old"]).table.id).toBe("t-new");
  });

  it("follows the table the player chose, even an older one", () => {
    expect(pickActiveTable([original, newest], ["t-new", "t-old"], "t-old").table.id).toBe("t-old");
  });

  it("falls back to the newest when the chosen table is no longer in combat", () => {
    expect(pickActiveTable([newest], ["t-new", "t-old"], "t-old").table.id).toBe("t-new");
  });

  it("works with a single table", () => {
    expect(pickActiveTable([original], ["t-old"]).table.id).toBe("t-old");
  });
});

describe("dealDamage", () => {
  beforeEach(() => rpc.mockReset());
  const parts = [
    { amount: 8, type: "piercing", source: "The Darling Deceiver" },
    { amount: 3, type: "fire", source: "Elemental Weapon" },
  ];

  it("sends the damage types with the total (never the sources)", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await dealDamage("t1", 11, parts);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("deal_damage", {
      p_table_id: "t1",
      p_amount: 11,
      p_parts: [
        { amount: 8, type: "piercing" },
        { amount: 3, type: "fire" },
      ],
    });
  });

  it("sends just the total for a number typed by hand, as before", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await dealDamage("t1", 8, null);
    expect(rpc).toHaveBeenCalledWith("deal_damage", { p_table_id: "t1", p_amount: 8 });
  });

  it("falls back to the total when the database hasn't been updated yet", async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST202", message: "Could not find the function" } })
      .mockResolvedValueOnce({ data: null, error: null });
    await dealDamage("t1", 11, parts);
    expect(rpc).toHaveBeenLastCalledWith("deal_damage", { p_table_id: "t1", p_amount: 11 });
  });

  it("passes on any other problem (it's not your turn) without trying again", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "It is not your turn" } });
    await expect(dealDamage("t1", 11, parts)).rejects.toMatchObject({ message: "It is not your turn" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe("cancelAttack", () => {
  beforeEach(() => rpc.mockReset());

  it("asks the server to let the unfinished attack go", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await cancelAttack("t1");
    expect(rpc).toHaveBeenCalledWith("cancel_attack", { p_table_id: "t1" });
  });

  it("says in plain words when the database update hasn't been run yet", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "not found" } });
    await expect(cancelAttack("t1")).rejects.toThrow(/isn't set up yet/);
  });

  it("passes the server's own reason through", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "It is not your turn" } });
    await expect(cancelAttack("t1")).rejects.toMatchObject({ message: "It is not your turn" });
  });
});

describe("dmLog with an activity kind", () => {
  it("sends the kind, and falls back to a plain line if the database doesn't have kinds yet", async () => {
    const { supabase } = await import("./supabaseClient");
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: "no such parameter p_kind" } })
      .mockResolvedValueOnce({ data: null, error: null });
    supabase.rpc = rpc;
    const { dmLog } = await import("./tableStore");
    await dmLog("t1", "📜 The DM shared a handout: Map", "handout");
    expect(rpc).toHaveBeenNthCalledWith(1, "dm_log", { p_table_id: "t1", p_message: "📜 The DM shared a handout: Map", p_kind: "handout" });
    expect(rpc).toHaveBeenNthCalledWith(2, "dm_log", { p_table_id: "t1", p_message: "📜 The DM shared a handout: Map" });
  });
});
