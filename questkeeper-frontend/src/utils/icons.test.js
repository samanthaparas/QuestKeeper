import { describe, it, expect } from "vitest";
import {
  getRaceIcon,
  getClassIcon,
  getBackgroundIcon,
  getSpellSchoolIcon,
  getSpellEffectIcon,
  getUiIcon,
} from "./icons";
import { BOOK_RACES } from "./bookRaces";
import { BOOK_BACKGROUNDS } from "./bookBackgrounds";

describe("getRaceIcon", () => {
  it("resolves every published-book race", () => {
    for (const race of BOOK_RACES) {
      expect(getRaceIcon(race.index), race.name).toBeTruthy();
    }
  });

  it("resolves all Tome of Heroes races and shares Minotaur art", () => {
    for (const id of ["alseid", "catfolk", "darakhul", "derro", "drow", "erina", "gearforged", "minotaur", "mushroomfolk", "satarre"]) {
      expect(getRaceIcon(`toh_${id}`), id).toBeTruthy();
    }
    expect(getRaceIcon("toh_minotaur")).toBe(getRaceIcon("book_minotaur"));
  });

  it("resolves a known race id", () => {
    expect(getRaceIcon("half-elf")).toBeTruthy();
  });

  it("normalizes a display-cased name", () => {
    expect(getRaceIcon("Half-Elf")).toBe(getRaceIcon("half-elf"));
  });

  it("returns undefined for an unknown id", () => {
    expect(getRaceIcon("not-a-race")).toBeUndefined();
  });
});

describe("getClassIcon", () => {
  it("resolves a known class id", () => {
    expect(getClassIcon("wizard")).toBeTruthy();
  });
});

describe("getBackgroundIcon", () => {
  it("resolves every published-book background", () => {
    for (const background of BOOK_BACKGROUNDS) {
      expect(getBackgroundIcon(background.index), background.name).toBeTruthy();
    }
  });

  it("resolves curated sources and preserves existing artwork", () => {
    for (const id of ["toh_innkeeper", "tdcs_elemental-warden", "open5e_con-artist"]) {
      expect(getBackgroundIcon(id), id).toBeTruthy();
    }
    expect(getBackgroundIcon("book_criminal")).toBe(getBackgroundIcon("criminal"));
    expect(getBackgroundIcon("not-a-background")).toBeUndefined();
  });

  it("normalizes a spaced display name", () => {
    expect(getBackgroundIcon("Guild Artisan")).toBe(
      getBackgroundIcon("guild-artisan"),
    );
  });
});

describe("getSpellSchoolIcon", () => {
  it("resolves a known school id", () => {
    expect(getSpellSchoolIcon("evocation")).toBeTruthy();
  });
});

describe("getSpellEffectIcon", () => {
  it("resolves a known effect id", () => {
    expect(getSpellEffectIcon("healing")).toBeTruthy();
  });
});

describe("getUiIcon", () => {
  it("resolves a known ui icon id", () => {
    expect(getUiIcon("dice")).toBeTruthy();
  });
});
