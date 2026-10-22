import { describe, it, expect } from "vitest";
import { addBan, bannedChoicesOf, cleanBanned, countBanned, groupBanned, isBanned, removeBan } from "./contentRules";

describe("cleanBanned", () => {
  it("keeps only known kinds, tidies names and drops repeats", () => {
    expect(
      cleanBanned({
        race: ["  Tiefling ", "tiefling", "", null, "Dhampir"],
        spell: ["Wish"],
        weapon: ["Longsword"],
      }),
    ).toEqual({ race: ["Tiefling", "Dhampir"], spell: ["Wish"] });
  });

  it("copes with nothing or nonsense", () => {
    expect(cleanBanned(undefined)).toEqual({});
    expect(cleanBanned({ race: "Tiefling" })).toEqual({});
  });
});

describe("adding, removing and asking", () => {
  it("adds without repeating, removes without caring about capital letters", () => {
    let banned = addBan({}, "race", "Tiefling");
    banned = addBan(banned, "race", "tiefling");
    banned = addBan(banned, "spell", "Wish");
    expect(banned).toEqual({ race: ["Tiefling"], spell: ["Wish"] });
    expect(countBanned(banned)).toBe(2);
    expect(isBanned(banned, "race", "TIEFLING")).toBe(true);
    expect(isBanned(banned, "class", "Tiefling")).toBe(false);

    expect(removeBan(banned, "race", "tiefling")).toEqual({ spell: ["Wish"] });
  });
});

describe("bannedChoicesOf", () => {
  const sheet = {
    race: { id: "elf", name: "High Elf", subrace: { id: "high-elf", name: "High Elf" } },
    class: { name: "Wizard" },
    background: { name: "Charlatan" },
    feats: [{ name: "Lucky" }, "Alert"],
    spellcasting: {
      cantripsKnown: [{ name: "Fire Bolt" }],
      spellsKnown: [{ name: "Wish" }, { name: "Shield" }],
    },
  };

  it("finds every banned thing the character uses, by kind", () => {
    const banned = { class: ["Wizard"], spell: ["Wish"], feat: ["lucky"], background: ["Noble"] };
    expect(bannedChoicesOf(sheet, banned)).toEqual([
      { kind: "class", label: "class", name: "Wizard" },
      { kind: "feat", label: "feat", name: "lucky" },
      { kind: "spell", label: "spell", name: "Wish" },
    ]);
  });

  it("matches a race by its name, its subrace, or its base race", () => {
    expect(bannedChoicesOf(sheet, { race: ["High Elf"] })).toHaveLength(1);
    expect(bannedChoicesOf(sheet, { race: ["Elf"] })).toEqual([{ kind: "race", label: "race", name: "Elf" }]);
    expect(bannedChoicesOf(sheet, { race: ["Dwarf"] })).toEqual([]);
  });

  it("finds nothing when nothing is banned or there is no sheet", () => {
    expect(bannedChoicesOf(sheet, {})).toEqual([]);
    expect(bannedChoicesOf(null, { race: ["Elf"] })).toEqual([]);
  });
});

describe("groupBanned", () => {
  it("lists the kinds that have something, with plain labels", () => {
    expect(groupBanned({ spell: ["Wish"], race: ["Tiefling"] })).toEqual([
      { key: "race", label: "Races", names: ["Tiefling"] },
      { key: "spell", label: "Spells", names: ["Wish"] },
    ]);
    expect(groupBanned({})).toEqual([]);
  });
});
