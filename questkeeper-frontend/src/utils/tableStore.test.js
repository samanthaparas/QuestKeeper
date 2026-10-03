import { describe, it, expect, vi } from "vitest";
import { pickActiveTable } from "./tableStore";

vi.mock("./supabaseClient", () => ({ supabase: {} }));

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
