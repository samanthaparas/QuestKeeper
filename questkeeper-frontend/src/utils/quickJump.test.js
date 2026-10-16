import { describe, it, expect, beforeEach } from "vitest";
import {
  aiResultLink,
  PER_CATEGORY,
  clearRecent,
  loadRecent,
  normalize,
  rankResults,
  saveRecent,
  scoreEntry,
} from "./quickJump";
import { installFakeStorage } from "../test/fakeStorage";

const entry = (label, category = "Spells", extra = {}) => ({
  id: `${category}:${label}`,
  label,
  category,
  to: `/x/${label}`,
  ...extra,
});

describe("normalize", () => {
  it("ignores case, accents and punctuation", () => {
    expect(normalize("Tasha's Hideous  Laughter!")).toBe("tashas hideous laughter");
    expect(normalize("Élan")).toBe("elan");
  });
});

describe("scoreEntry", () => {
  it("ranks exact, then start of name, then start of a word, then inside", () => {
    const exact = scoreEntry(entry("Fire Bolt"), "fire bolt");
    const start = scoreEntry(entry("Fireball"), "fire");
    const word = scoreEntry(entry("Wall of Fire"), "fire");
    const inside = scoreEntry(entry("Campfire Tale"), "fire");
    expect(exact).toBeGreaterThan(start);
    expect(start).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(0);
  });

  it("only matches inside a word for longer searches", () => {
    expect(scoreEntry(entry("Alter Self"), "elf")).toBe(0);
    expect(scoreEntry(entry("Campfire Tale"), "fire")).toBeGreaterThan(0);
  });

  it("matches each typed word against the start of a word", () => {
    expect(scoreEntry(entry("Cure Wounds"), "cu wou")).toBeGreaterThan(0);
    expect(scoreEntry(entry("Cure Wounds"), "zz")).toBe(0);
  });

  it("finds pages by their other words", () => {
    const library = entry("Monster Library", "Pages", { keywords: ["bestiary", "creatures"] });
    expect(scoreEntry(library, "bestiary")).toBeGreaterThan(0);
  });
});

describe("rankResults", () => {
  it("groups matches in category order with a cap per group", () => {
    const spells = Array.from({ length: 9 }, (_, i) => entry(`Fire ${i}`));
    const results = rankResults([...spells, entry("Fire Genasi", "Races"), entry("Fire Fan", "Pages")], "fire");

    expect(results.map((group) => group.category)).toEqual(["Pages", "Races", "Spells"]);
    expect(results.at(-1).entries).toHaveLength(PER_CATEGORY);
    expect(results.at(-1).total).toBe(9);

    // "Show all" lifts the cap for that group.
    const expanded = rankResults(spells, "fire", ["Spells"]);
    expect(expanded[0].entries).toHaveLength(9);
  });

  it("puts the best match first inside a group", () => {
    const [group] = rankResults([entry("Wall of Fire"), entry("Fireball")], "fire");
    expect(group.entries.map((item) => item.label)).toEqual(["Fireball", "Wall of Fire"]);
  });
});

describe("recent picks", () => {
  beforeEach(() => {
    installFakeStorage();
  });

  it("keeps the newest five with no repeats", () => {
    ["A", "B", "C", "D", "E", "F", "B"].forEach((label) => saveRecent(entry(label)));
    expect(loadRecent().map((item) => item.label)).toEqual(["B", "F", "E", "D", "C"]);

    clearRecent();
    expect(loadRecent()).toEqual([]);
  });

  it("ignores saved data it can't read", () => {
    window.localStorage.setItem("qk-quick-jump-recent", "not json");
    expect(loadRecent()).toEqual([]);
  });
});

describe("aiResultLink", () => {
  it("uses the loaded entry's link, or builds one from the id", () => {
    const entries = [{ id: "spell:fireball", to: "/spells?open=fireball" }];
    expect(aiResultLink({ id: "spell:fireball" }, entries)).toBe("/spells?open=fireball");
    expect(aiResultLink({ id: "item:bag-of-holding" })).toBe("/magic-items?open=bag-of-holding");
    expect(aiResultLink({ id: "background:2014:acolyte" })).toBe("/backgrounds?open=acolyte&edition=2014");
    expect(aiResultLink({ id: "unknown:thing" })).toBeNull();
  });
});

