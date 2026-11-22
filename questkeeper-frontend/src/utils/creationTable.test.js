import { describe, it, expect } from "vitest";
import { chooseRulesTable, isBlockedAt, tablesWithRules } from "./creationTable";

const tables = [
  { id: "t1", name: "Breakfast Club", dm_id: "nolan", banned_content: { race: ["Tiefling"], class: ["Warlock"] } },
  { id: "t2", name: "Open Table", dm_id: "nolan", banned_content: {} },
  { id: "t3", name: "My Own Game", dm_id: "me", banned_content: { race: ["Elf"] } },
];

describe("the table a new character is for", () => {
  it("only offers tables you play at that have something not allowed", () => {
    expect(tablesWithRules(tables, "me").map((table) => [table.name, table.count])).toEqual([["Breakfast Club", 2]]);
  });

  it("uses the one table with rules by default, or the last choice", () => {
    const withRules = tablesWithRules(tables, "me");
    expect(chooseRulesTable(withRules, null)?.name).toBe("Breakfast Club");
    expect(chooseRulesTable(withRules, "none")).toBeNull();
    expect(chooseRulesTable(withRules, "t1")?.id).toBe("t1");
  });

  it("knows which options that table doesn't allow, ignoring capitals", () => {
    const [club] = tablesWithRules(tables, "me");
    expect(isBlockedAt(club, "race", { name: "tiefling" })).toBe(true);
    expect(isBlockedAt(club, "race", { name: "Elf" })).toBe(false);
    expect(isBlockedAt(club, "class", { name: "Warlock" })).toBe(true);
    expect(isBlockedAt(null, "race", { name: "Tiefling" })).toBe(false);
  });
});
