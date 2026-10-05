import { describe, it, expect } from "vitest";
import {
  ALL,
  EMPTY_SPELL_FILTERS,
  describeSpellListing,
  filterSpells,
  getSpellFilterOptions,
  hasActiveSpellFilters,
} from "./spellFilters";

const wizard = { index: "wizard", name: "Wizard" };
const cleric = { index: "cleric", name: "Cleric" };
const evocation = { index: "evocation", name: "Evocation" };
const conjuration = { index: "conjuration", name: "Conjuration" };

const spells = [
  {
    index: "acid-splash",
    name: "Acid Splash",
    level: 0,
    school: conjuration,
    classes: [wizard],
  },
  {
    index: "fireball",
    name: "Fireball",
    level: 3,
    school: evocation,
    classes: [wizard],
  },
  {
    index: "guiding-bolt",
    name: "Guiding Bolt",
    level: 1,
    school: evocation,
    classes: [cleric],
  },
  {
    index: "cure-wounds",
    name: "Cure Wounds",
    level: 1,
    school: evocation,
    classes: [cleric],
  },
];

function names(list) {
  return list.map((spell) => spell.name);
}

describe("describeSpellListing", () => {
  it("names the level and school", () => {
    expect(describeSpellListing(spells[1])).toBe("Level 3 · Evocation");
  });

  it("calls level 0 a cantrip", () => {
    expect(describeSpellListing(spells[0])).toBe("Cantrip · Conjuration");
  });

  it("shows just the level when the school is missing", () => {
    expect(describeSpellListing({ name: "Aid", level: 2 })).toBe("Level 2");
  });
});

describe("getSpellFilterOptions", () => {
  it("offers each level, class and school once, in order", () => {
    const options = getSpellFilterOptions(spells);

    expect(options.levels).toEqual([
      { value: "0", label: "Cantrips" },
      { value: "1", label: "Level 1" },
      { value: "3", label: "Level 3" },
    ]);
    expect(options.classes).toEqual([
      { value: "cleric", label: "Cleric" },
      { value: "wizard", label: "Wizard" },
    ]);
    expect(options.schools).toEqual([
      { value: "conjuration", label: "Conjuration" },
      { value: "evocation", label: "Evocation" },
    ]);
  });

  it("offers no class or school choices when the list only has levels", () => {
    const options = getSpellFilterOptions([{ name: "Aid", level: 2 }]);

    expect(options.levels).toHaveLength(1);
    expect(options.classes).toEqual([]);
    expect(options.schools).toEqual([]);
  });
});

describe("filterSpells", () => {
  it("returns everything with no filters", () => {
    expect(filterSpells(spells, EMPTY_SPELL_FILTERS)).toHaveLength(4);
  });

  it("filters by level, including cantrips", () => {
    expect(
      names(filterSpells(spells, { ...EMPTY_SPELL_FILTERS, level: "0" })),
    ).toEqual(["Acid Splash"]);
  });

  it("filters by class", () => {
    expect(
      names(
        filterSpells(spells, { ...EMPTY_SPELL_FILTERS, classIndex: "cleric" }),
      ),
    ).toEqual(["Guiding Bolt", "Cure Wounds"]);
  });

  it("filters by school", () => {
    expect(
      names(
        filterSpells(spells, { ...EMPTY_SPELL_FILTERS, school: "conjuration" }),
      ),
    ).toEqual(["Acid Splash"]);
  });

  it("combines filters with the name search", () => {
    const filters = {
      query: " cure ",
      level: "1",
      classIndex: "cleric",
      school: "evocation",
    };
    expect(names(filterSpells(spells, filters))).toEqual(["Cure Wounds"]);
  });
});

describe("hasActiveSpellFilters", () => {
  it("ignores the search text", () => {
    expect(
      hasActiveSpellFilters({ ...EMPTY_SPELL_FILTERS, query: "fire" }),
    ).toBe(false);
  });

  it("is true once any dropdown is set", () => {
    expect(
      hasActiveSpellFilters({ ...EMPTY_SPELL_FILTERS, school: "evocation" }),
    ).toBe(true);
    expect(hasActiveSpellFilters({ ...EMPTY_SPELL_FILTERS, level: ALL })).toBe(
      false,
    );
  });
});
