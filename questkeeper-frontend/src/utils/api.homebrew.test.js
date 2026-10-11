// The api.js functions mix homebrew into SRD/Open5e answers.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./homebrewCache", () => ({ loadHomebrew: vi.fn() }));

import { loadHomebrew } from "./homebrewCache";
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
} from "./api";

const homebrew = [
  { id: "r1", category: "race", name: "Owlfolk", data: { traits: [{ name: "Night Eyes" }] } },
  { id: "s1", category: "subrace", name: "Moon Elf", data: { parentRace: "elf" } },
  { id: "b1", category: "background", name: "Tavern Hand", data: {} },
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
    expect(cleric.subclasses.map((subclass) => subclass.name)).toEqual(["Life", "Dusk Domain"]);

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
});
