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
    expect((await getRaces()).map((race) => race.name)).toEqual(["Elf", "Owlfolk", "Tiefling"]);
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
    expect((await getBackgrounds()).map((item) => item.name)).toEqual([
      "Acolyte",
      "Tavern Hand",
    ]);
    expect((await getBackgrounds("2024")).map((item) => item.name)).toEqual(["Sage"]);
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
    expect((await getRaces()).map((race) => race.name)).toEqual(["Elf", "Tiefling"]);
  });
});
