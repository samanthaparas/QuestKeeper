// The api.js functions mix homebrew into SRD/Open5e answers.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./homebrewCache", () => ({ loadHomebrew: vi.fn() }));

import { loadHomebrew } from "./homebrewCache";
import { draftEntryFrom } from "./homebrewForm";
import { cleanHomebrewData } from "./homebrewMappers";
import { loadRaceDetails } from "./srdDetails";
import { mapRaceToSnapshot, mapBackgroundToSnapshot } from "./characterSnapshots";
import {
  getRaces,
  getRaceDetails,
  getRaceTraits,
  getTraitDetails,
  getBackgrounds,
  getBackgroundDetails,
  getClassDetails,
  getSubclassFeatures,
  getFeatureDetails,
  getClasses,
  getSubclassDetails,
  getClassLevel,
  getClassFeatures,
  getClassSpells,
  getFeats,
  getFeatDetails,
} from "./api";

const homebrew = [
  {
    id: "k1",
    category: "class",
    name: "Tinkerer",
    data: {
      hitDie: 8,
      savingThrows: ["con", "int"],
      progression: "half-early",
      spellcastingType: "prepared",
      spellList: "wizard",
      cantripsAtFirst: 2,
      bookClass: "artificer",
      features: [
        { name: "Magical Tinkering", level: 1, description: "Small magic." },
        { name: "Infuse Item", level: 2, description: "Bigger magic." },
      ],
    },
  },
  { id: "k2", category: "subclass", name: "Gearwright", data: { parentClass: "hb_k1" } },
  { id: "r1", category: "race", name: "Owlfolk", data: { traits: [{ name: "Night Eyes" }] } },
  { id: "s1", category: "subrace", name: "Moon Elf", data: { parentRace: "elf" } },
  { id: "b1", category: "background", name: "Tavern Hand", data: {} },
  {
    id: "f1",
    category: "feat",
    name: "Lucky Charm",
    summary: "Reroll one die a day.\n\nUse it after seeing the roll.",
    data: { prerequisite: "Level 4+" },
  },
  {
    id: "c1",
    category: "subclass",
    name: "Dusk Domain",
    data: { parentClass: "cleric", features: [{ name: "Dusk Sight", level: 1 }] },
  },
];

// The backend's answers, by path.
const backend = {
  "/races": [{ index: "elf", name: "Elf" }, { index: "tiefling", name: "Tiefling" }],
  "/races/elf": { index: "elf", name: "Elf", subraces: [{ index: "high-elf", name: "High Elf" }] },
  "/backgrounds": [{ index: "acolyte", name: "Acolyte" }],
  "/backgrounds?edition=2024": [{ index: "sage", name: "Sage" }],
  "/classes/cleric": { index: "cleric", subclasses: [{ index: "life", name: "Life" }] },
  "/classes": [{ index: "cleric", name: "Cleric" }],
  "/feats": [{ index: "grappler", name: "Grappler", edition: "2014" }],
  "/feats?edition=2024": [{ index: "alert", name: "Alert", edition: "2024" }],
  "/classes/wizard/spells": [{ index: "fire-bolt", name: "Fire Bolt", level: 0 }],
};

beforeEach(() => {
  loadHomebrew.mockResolvedValue(homebrew);
  vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
    const path = String(url).replace(/^.*\/api/, "");
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: backend[path] }) });
  });
});

afterEach(() => vi.restoreAllMocks());

describe("api with homebrew", () => {
  it("mixes homebrew races into the list alphabetically", async () => {
    const notBooks = (await getRaces()).filter((race) => !race.index.startsWith("book_"));
    expect(notBooks.map((race) => race.name)).toEqual(["Elf", "Owlfolk", "Tiefling"]);
  });

  it("adds the published-book races, answered without the backend", async () => {
    const races = await getRaces();
    expect(races.find((race) => race.name === "Tabaxi")).toMatchObject({
      index: "book_tabaxi",
      sourceGroup: "Official books",
    });
    vi.mocked(fetch).mockClear();
    expect(await getRaceDetails("book_tabaxi")).toMatchObject({ name: "Tabaxi", is_book_entry: true });
    expect(await getRaceTraits("book_tabaxi")).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers homebrew IDs without calling the backend", async () => {
    const race = await getRaceDetails("hb_r1");
    expect(race).toMatchObject({ name: "Owlfolk", source: "Homebrew" });
    expect(await getRaceTraits("hb_r1")).toEqual([
      { index: "hb_r1.night-eyes", name: "Night Eyes" },
    ]);
    expect((await getTraitDetails("hb_r1.night-eyes")).name).toBe("Night Eyes");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("adds homebrew subraces to an SRD race", async () => {
    const elf = await getRaceDetails("elf");
    expect(elf.subraces.map((subrace) => subrace.name)).toEqual(["High Elf", "Moon Elf"]);
  });

  it("adds homebrew backgrounds to the 2014 list only", async () => {
    const notBooks = (await getBackgrounds()).filter((item) => !item.index.startsWith("book_"));
    expect(notBooks.map((item) => item.name)).toEqual(["Acolyte", "Tavern Hand"]);
    expect((await getBackgrounds("2024")).map((item) => item.name)).toEqual(["Sage"]);
  });

  it("adds the published-book backgrounds to the 2014 list, even logged out", async () => {
    loadHomebrew.mockResolvedValue([]);
    const list = await getBackgrounds();
    const folkHero = list.find((item) => item.name === "Folk Hero");
    expect(folkHero).toMatchObject({
      index: "book_folk-hero",
      source: "Player's Handbook (2014)",
      sourceGroup: "Official books",
    });
    expect(folkHero.preview).toMatch(/ordinary person/);
    // Alphabetical with everything else.
    expect(list.findIndex((item) => item.name === "Acolyte")).toBeLessThan(
      list.findIndex((item) => item.name === "Anthropologist"),
    );
  });

  it("answers book background details without calling the backend", async () => {
    const entry = await getBackgroundDetails("book_city-watch");
    expect(entry).toMatchObject({ name: "City Watch", is_book_entry: true });
    expect(fetch).not.toHaveBeenCalled();
    await expect(getBackgroundDetails("book_nope")).rejects.toThrow(/not found/);
  });

  it("adds homebrew subclasses to their class, with their features", async () => {
    const cleric = await getClassDetails("cleric");
    const notBooks = cleric.subclasses.filter((subclass) => !subclass.index.startsWith("book_"));
    expect(notBooks.map((subclass) => subclass.name)).toEqual(["Life", "Dusk Domain"]);

    const [feature] = await getSubclassFeatures("hb_c1");
    expect(feature).toMatchObject({ name: "Dusk Sight", level: 1 });
    expect((await getFeatureDetails(feature.index)).subclass.name).toBe("Dusk Domain");
  });

  it("fails clearly for a homebrew ID you can't see", async () => {
    await expect(getRaceDetails("hb_gone")).rejects.toThrow(/not found/);
  });

  it("still works logged out (no homebrew)", async () => {
    loadHomebrew.mockResolvedValue([]);
    const notBooks = (await getRaces()).filter((race) => !race.index.startsWith("book_"));
    expect(notBooks.map((race) => race.name)).toEqual(["Elf", "Tiefling"]);
  });

  it("adds the book classes and book subclasses, answered without the backend", async () => {
    expect((await getClasses()).map((item) => item.name)).toEqual(["Artificer", "Blood Hunter", "Cleric", "Tinkerer"]);
    const cleric = await getClassDetails("cleric");
    expect(cleric.subclasses.map((subclass) => subclass.name)).toContain("Twilight Domain");

    vi.mocked(fetch).mockClear();
    expect((await getClassDetails("book_artificer")).name).toBe("Artificer");
    expect((await getSubclassDetails("book_cleric-twilight-domain")).book).toBe("Tasha's Cauldron of Everything");
    expect(await getSubclassFeatures("book_cleric-twilight-domain")).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers a homebrew class's details, levels, features and spells", async () => {
    const tinkerer = await getClassDetails("hb_k1");
    expect(tinkerer).toMatchObject({ name: "Tinkerer", hit_die: 8, caster_progression: "half-early" });
    // Its own homebrew subclass, plus the book Artificer's subclasses.
    const names = tinkerer.subclasses.map((subclass) => subclass.name);
    expect(names).toContain("Gearwright");
    expect(names).toContain("Armorer");

    const levelOne = await getClassLevel("hb_k1", 1);
    expect(levelOne.features.map((feature) => feature.name)).toEqual(["Magical Tinkering"]);
    expect(levelOne.spellcasting).toMatchObject({ cantrips_known: 2, spell_slots_level_1: 2 });

    expect((await getClassFeatures("hb_k1")).map((feature) => feature.level)).toEqual([1, 2]);
    expect((await getFeatureDetails("hb_k1.infuse-item-2")).desc).toEqual(["Bigger magic."]);
    // Uses the Wizard's spell list.
    expect(await getClassSpells("hb_k1")).toEqual([{ index: "fire-bolt", name: "Fire Bolt", level: 0 }]);
  });

  it("adds homebrew feats to the 2014 feat list only, marked as Homebrew", async () => {
    const legacy = await getFeats();
    expect(legacy.map((feat) => feat.name)).toEqual(["Grappler", "Lucky Charm"]);
    expect(legacy.find((feat) => feat.name === "Lucky Charm")).toMatchObject({
      index: "hb_f1",
      edition: "Homebrew",
    });
    expect((await getFeats("2024")).map((feat) => feat.name)).toEqual(["Alert"]);
  });

  it("answers a homebrew feat's details without the backend", async () => {
    vi.mocked(fetch).mockClear();
    expect(await getFeatDetails("hb_f1", "Homebrew")).toMatchObject({
      name: "Lucky Charm",
      edition: "Homebrew",
      desc: ["Reroll one die a day.", "Use it after seeing the roll."],
      prerequisite: "Level 4+",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("drafts made with Pick it now, add details later", () => {
  // What creation does: save the draft, reload it by ID, turn it into a pick.
  const book = { name: "Tabaxi", book: "MPMM", link_url: "https://dnd5e.wikidot.com/lineage:tabaxi", summary: "Curious." };
  const saved = (category, id) => {
    const entry = draftEntryFrom(category, book);
    return { id, category, name: entry.name, based_on: entry.basedOn, link_url: entry.linkUrl, summary: entry.summary, data: cleanHomebrewData(category, entry.data) };
  };

  it("loads a draft race and background and makes a character pick from each", async () => {
    loadHomebrew.mockResolvedValue([saved("race", "d1"), saved("background", "d2")]);

    const race = await loadRaceDetails("hb_d1");
    expect(mapRaceToSnapshot(race)).toMatchObject({ id: "hb_d1", name: "Tabaxi" });

    const background = await getBackgroundDetails("hb_d2");
    expect(mapBackgroundToSnapshot(background)).toMatchObject({ id: "hb_d2", name: "Tabaxi" });
  });
});

