import { describe, it, expect, vi } from "vitest";
import { readCheck, runDbChecks } from "./dbCheck";

vi.mock("./supabaseClient", () => ({ supabase: {} }));

describe("the database check", () => {
  it("reads whether a SQL file has run from the database's answer", () => {
    expect(readCheck(null)).toBe("ok");
    // The function is there and refused the made-up table.
    expect(readCheck({ code: "P0001", message: "You are not at this table" })).toBe("ok");
    expect(readCheck({ code: "42501" })).toBe("ok");
    // Not in the database yet.
    expect(readCheck({ code: "PGRST202" })).toBe("missing");
    expect(readCheck({ code: "42703" })).toBe("missing");
    expect(readCheck({ code: "PGRST205" })).toBe("missing");
    // No signal, or something else: can't tell.
    expect(readCheck({ code: "08006" })).toBe("unknown");
  });

  it("runs each check and says which files still need running", async () => {
    const results = await runDbChecks([
      { file: "a.sql", what: "A", run: async () => ({ error: null }) },
      { file: "b.sql", what: "B", run: async () => ({ error: { code: "PGRST202" } }) },
      { file: "c.sql", what: "C", run: async () => { throw new Error("offline"); } },
    ]);
    expect(results.map((result) => [result.file, result.status])).toEqual([
      ["a.sql", "ok"],
      ["b.sql", "missing"],
      ["c.sql", "unknown"],
    ]);
  });
});
