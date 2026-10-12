import { describe, it, expect } from "vitest";
import { applySuggestions, parsePastedText, splitSections } from "./homebrewPaste";

// Made-up options, laid out the way rules pages usually are.
const RACE = `Mossfolk
Source: Our Campaign Book
Ability Score Increase. Your Wisdom score increases by 2, and your Constitution score increases by 1.
Age. They live about a century.
Size. Mossfolk are about 4 feet tall. Your size is Small.
Speed. Your base walking speed is 25 feet.
Darkvision. You can see in dim light within 60 feet of you.
Soft Step. Moss muffles your footsteps.
Languages. You can speak, read, and write Common and Sylvan, and one other language of your choice.`;

const FLEXIBLE_RACE = `Ability Score Increases. When determining your character's ability scores, increase one score by 2 and increase a different score by 1, or increase three different scores by 1.
Size. You are Medium or Small. You choose the size when you select this race.
Speed. Your walking speed is 30 feet.`;

const BACKGROUND = `Skill Proficiencies: Insight, Religion
Tool Proficiencies: None
Languages: Two of your choice
Equipment: A holy symbol, a prayer book, and a pouch with 15 gp
Feature: Temple Friends
You can ask your temple for help.`;

const SUBCLASS = `Moss Circle
Bonus Proficiencies
3rd-level Moss Circle feature
You learn to tend the moss.
Spore Cloud
6th-level Moss Circle feature
Spores fill the air.
Deep Roots (14th level)
You become hard to move.`;

describe("splitSections", () => {
  it("splits 'Name. text' paragraphs and lone headings", () => {
    const sections = splitSections("Darkvision. You can see.\nSpore Cloud\nSpores fill the air.");
    expect(sections).toEqual([
      { name: "Darkvision", text: "You can see.", inline: true },
      { name: "Spore Cloud", text: "Spores fill the air." },
    ]);
  });
});

describe("parsePastedText", () => {
  it("reads a race's numbers, languages and trait names, but no descriptions", () => {
    const { data, found } = parsePastedText("race", RACE);

    expect(data).toMatchObject({
      size: "Small",
      speed: 25,
      abilityBonuses: { wis: 2, con: 1 },
      languages: "Common, Sylvan",
      languageChoices: 1,
    });
    expect(data.traits).toEqual([
      { name: "Darkvision", description: "" },
      { name: "Soft Step", description: "" },
    ]);
    expect(found.map((line) => line.label)).toEqual([
      "Size",
      "Speed",
      "Ability bonuses",
      "Languages",
      "Traits",
    ]);
  });

  it("turns the newer flexible ability rule into a choice", () => {
    const { data, found } = parsePastedText("race", FLEXIBLE_RACE);

    expect(data.abilityChoice).toMatchObject({ choose: 3, bonus: 1 });
    expect(data.size).toBe("Medium");
    expect(found.find((line) => line.key === "size").value).toMatch(/also allows Small/);
  });

  it("reads a background's skills, languages, gear and feature name", () => {
    const { data } = parsePastedText("background", BACKGROUND);

    expect(data.skills).toEqual(["insight", "religion"]);
    expect(data.languageChoices).toBe(2);
    expect(data.tools).toBeUndefined();
    expect(data.equipment).toMatch(/holy symbol/);
    expect(data.feature).toEqual({ name: "Temple Friends", description: "" });
  });

  it("reads a background's skill pick", () => {
    const { data } = parsePastedText(
      "background",
      "Skill Proficiencies: Arcana, plus one from among History, Nature, or Religion",
    );
    expect(data.skills).toEqual(["arcana"]);
    expect(data.skillChoice).toEqual({ choose: 1, from: ["history", "nature", "religion"] });
  });

  it("reads a subclass's features and their levels", () => {
    const { data } = parsePastedText("subclass", SUBCLASS);

    expect(data.features).toEqual([
      { name: "Bonus Proficiencies", level: 3, description: "" },
      { name: "Spore Cloud", level: 6, description: "" },
      { name: "Deep Roots", level: 14, description: "" },
    ]);
  });

  it("finds nothing in text that isn't rules", () => {
    expect(parsePastedText("race", "hello there").found).toEqual([]);
  });
});

describe("applySuggestions", () => {
  it("only applies the ticked suggestions", () => {
    const parsed = parsePastedText("race", RACE);
    const next = applySuggestions({ speed: 30, size: "Medium", languages: "", languageChoices: 0 }, parsed, [
      "speed",
      "languages",
    ]);

    expect(next).toMatchObject({ speed: 25, size: "Medium", languages: "Common, Sylvan", languageChoices: 1 });
  });

  it("keeps traits the player already wrote and skips repeats", () => {
    const parsed = parsePastedText("race", RACE);
    const next = applySuggestions(
      { traits: [{ name: "Darkvision", description: "Sees in the dark." }, { name: "", description: "" }] },
      parsed,
      ["traits"],
    );
    expect(next.traits).toEqual([
      { name: "Darkvision", description: "Sees in the dark." },
      { name: "Soft Step", description: "" },
    ]);
  });
});
