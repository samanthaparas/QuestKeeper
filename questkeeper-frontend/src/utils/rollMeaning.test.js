import { describe, it, expect } from "vitest";
import { explainRoll, rollType } from "./rollMeaning";

const check = (label, extra = {}) => ({ kind: "check", label, total: 16, natural: 11, bonus: 5, mode: "normal", ...extra });

describe("what a roll means", () => {
  it("tells the kinds of roll apart from their labels", () => {
    expect(rollType(check("Stealth"))).toBe("check");
    expect(rollType(check("Dexterity save"))).toBe("save");
    expect(rollType(check("Death save"))).toBe("deathSave");
    expect(rollType(check("Longbow attack"))).toBe("attack");
    expect(rollType(check("Initiative"))).toBe("initiative");
    expect(rollType({ kind: "damage", label: "Longbow damage" })).toBe("damage");
  });

  it("explains a check against a DC, and the bonus", () => {
    const lines = explainRoll(check("Stealth"));
    expect(lines[0]).toMatch(/compares 16 with a difficulty \(DC\)/);
    expect(lines[1]).toMatch(/The \+5 is your bonus/);
  });

  it("explains an attack against AC, and advantage", () => {
    const lines = explainRoll(check("Longbow attack", { mode: "advantage", rolls: [11, 4] }));
    expect(lines[0]).toMatch(/Armor Class \(AC\)/);
    expect(lines).toContain("With advantage you rolled two d20s and kept the higher one (11).");
  });

  it("explains damage, including a critical hit", () => {
    expect(explainRoll({ kind: "damage", label: "Longbow damage", total: 9, isCrit: true })[0]).toMatch(
      /^9 is how much damage this does: the dice added up \(doubled for a critical hit\)/,
    );
  });

  it("explains a death save without a bonus line", () => {
    const lines = explainRoll(check("Death save", { bonus: 0 }));
    expect(lines[0]).toMatch(/10 or more is a success/);
    expect(lines.some((line) => line.includes("bonus"))).toBe(false);
  });
});
