import { describe, it, expect } from "vitest";
import {
  normalizeItemName,
  findSrdMatches,
  formatSpellDetails,
  formatFeatDetails,
} from "./srdDetails";

describe("normalizeItemName", () => {
  it("ignores capitals and extra spaces", () => {
    expect(normalizeItemName("  Fire   Bolt ")).toBe("fire bolt");
  });

  it("drops a trailing quantity like x20", () => {
    expect(normalizeItemName("Arrows x20")).toBe("arrows");
  });

  it("treats curly and straight apostrophes the same", () => {
    expect(normalizeItemName("Explorer’s Pack")).toBe("explorer's pack");
  });

  it("returns an empty string for a missing name", () => {
    expect(normalizeItemName(undefined)).toBe("");
  });
});

describe("findSrdMatches", () => {
  const entries = [
    { index: "grappler", name: "Grappler", edition: "2014" },
    { index: "grappler", name: "Grappler", edition: "2024" },
    { index: "alert", name: "Alert", edition: "2024" },
  ];

  it("matches regardless of capitals and spacing", () => {
    expect(findSrdMatches(" alert ", entries)).toEqual([entries[2]]);
  });

  it("returns every edition that has the name", () => {
    expect(findSrdMatches("Grappler", entries)).toHaveLength(2);
  });

  it("does not match partial names", () => {
    expect(findSrdMatches("Grapple", entries)).toEqual([]);
  });

  it("returns nothing for a blank name", () => {
    expect(findSrdMatches("   ", entries)).toEqual([]);
  });
});

describe("formatSpellDetails", () => {
  const spell = {
    name: "Test Blast",
    level: 3,
    school: { name: "Evocation" },
    casting_time: "1 action",
    range: "150 feet",
    components: ["V", "S", "M"],
    material: "a pinch of ash",
    duration: "Instantaneous",
    concentration: false,
    ritual: false,
    desc: ["First paragraph.", "Second paragraph."],
    higher_level: ["More damage at higher slots."],
  };

  it("labels a leveled spell with its level and school", () => {
    expect(formatSpellDetails(spell).kind).toBe("3rd-level Evocation");
  });

  it("labels a cantrip as a cantrip", () => {
    expect(formatSpellDetails({ ...spell, level: 0 }).kind).toBe(
      "Evocation cantrip",
    );
  });

  it("adds the material to the components", () => {
    expect(formatSpellDetails(spell).facts).toContainEqual({
      label: "Components",
      value: "V, S, M (a pinch of ash)",
    });
  });

  it("prefixes the duration for concentration spells", () => {
    const facts = formatSpellDetails({
      ...spell,
      concentration: true,
      duration: "Up to 1 minute",
    }).facts;

    expect(facts).toContainEqual({
      label: "Duration",
      value: "Concentration, up to 1 minute",
    });
  });

  it("leaves out Ritual when the spell isn't one", () => {
    const labels = formatSpellDetails(spell).facts.map((fact) => fact.label);
    expect(labels).not.toContain("Ritual");
  });

  it("puts the higher-level text after the description", () => {
    expect(formatSpellDetails(spell).paragraphs).toEqual([
      "First paragraph.",
      "Second paragraph.",
      "At Higher Levels. More damage at higher slots.",
    ]);
  });

  it("defaults to the 2014 edition when none is given", () => {
    expect(formatSpellDetails(spell).edition).toBe("2014");
  });
});

describe("formatFeatDetails", () => {
  it("formats a 2014 feat's ability prerequisite", () => {
    const details = formatFeatDetails({
      name: "Grappler",
      edition: "2014",
      prerequisites: [{ ability_score: { name: "STR" }, minimum_score: 13 }],
      desc: ["You gain these benefits:", "- A benefit."],
    });

    expect(details.kind).toBe("Feat");
    expect(details.facts).toEqual([{ label: "Prerequisite", value: "STR 13" }]);
    expect(details.paragraphs).toEqual([
      "You gain these benefits:",
      "- A benefit.",
    ]);
  });

  it("formats a 2024 feat's type, level prerequisite, and bold headings", () => {
    const details = formatFeatDetails({
      name: "Grappler",
      edition: "2024",
      type: "general",
      prerequisites: { minimum_level: 4 },
      prerequisite_options: { desc: "Strength or Dexterity 13+" },
      description: "You gain these benefits.\n**Punch and Grab.** A benefit.",
    });

    expect(details.kind).toBe("General Feat");
    expect(details.facts).toEqual([
      { label: "Prerequisite", value: "Level 4+, Strength or Dexterity 13+" },
    ]);
    expect(details.paragraphs).toEqual([
      "You gain these benefits.",
      "Punch and Grab. A benefit.",
    ]);
  });

  it("turns a hyphenated feat type into words", () => {
    expect(
      formatFeatDetails({ name: "Archery", type: "fighting-style" }).kind,
    ).toBe("Fighting Style Feat");
  });

  it("leaves out Prerequisite when there isn't one", () => {
    expect(
      formatFeatDetails({ name: "Alert", desc: ["A benefit."] }).facts,
    ).toEqual([]);
  });
});
