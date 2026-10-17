import { describe, it, expect } from "vitest";
import { cleanHomebrewData } from "./homebrewMappers";
import {
  draftEntryFrom,
  emptyHomebrewForm,
  entryToForm,
  formToEntry,
  validateHomebrewForm,
  previewHomebrew,
} from "./homebrewForm";

describe("homebrewForm", () => {
  it("starts each category with sensible blanks", () => {
    const race = emptyHomebrewForm("race");
    expect(race).toMatchObject({ id: null, category: "race", isShared: true });
    expect(race.data.speed).toBe(30);
    expect(race.data.languages).toBe("Common");
    expect(emptyHomebrewForm("subclass").data.features).toHaveLength(1);
  });

  it("gives each new form its own copy of the blanks", () => {
    const first = emptyHomebrewForm("race");
    first.data.traits.push({ name: "Extra" });
    expect(emptyHomebrewForm("race").data.traits).toHaveLength(1);
  });

  it("loads a saved entry, turning languages back into text", () => {
    const form = entryToForm({
      id: "r1",
      category: "race",
      name: "Owlfolk",
      based_on: null,
      link_url: "https://example.com",
      is_shared: false,
      data: { languages: ["Common", "Auran"], speed: 25 },
    });
    expect(form).toMatchObject({
      id: "r1",
      name: "Owlfolk",
      basedOn: "",
      linkUrl: "https://example.com",
      isShared: false,
    });
    expect(form.data.languages).toBe("Common, Auran");
    expect(form.data.speed).toBe(25);
    // Fields the saved entry didn't have come from the blanks.
    expect(form.data.size).toBe("Medium");
  });

  it("splits typed languages into a list for saving", () => {
    const form = { ...emptyHomebrewForm("race"), name: "Owlfolk" };
    form.data.languages = "Common,  Auran , ";
    expect(formToEntry(form).data.languages).toEqual(["Common", "Auran"]);
  });

  it("explains the first thing to fix", () => {
    const race = emptyHomebrewForm("race");
    expect(validateHomebrewForm(race)).toBe("Give it a name.");
    expect(validateHomebrewForm({ ...race, name: "X", linkUrl: "javascript:alert(1)" })).toMatch(
      /http/,
    );
    expect(validateHomebrewForm({ ...emptyHomebrewForm("subrace"), name: "X" })).toMatch(/race/);
    expect(validateHomebrewForm({ ...emptyHomebrewForm("subclass"), name: "X" })).toMatch(/class/);
    expect(validateHomebrewForm({ ...race, name: "Owlfolk" })).toBe("");
  });

  it("previews the form as the game will see it", () => {
    const form = { ...emptyHomebrewForm("race"), name: "Owlfolk" };
    form.data.abilityBonuses = { wis: 2 };
    form.data.traits = [{ name: "Night Eyes", description: "See in the dark." }];

    const preview = previewHomebrew(form);
    expect(preview).toMatchObject({ name: "Owlfolk", source: "Homebrew", speed: 30 });
    expect(preview.traitDetails[0].name).toBe("Night Eyes");
  });

  it("names unnamed previews so the panel isn't blank", () => {
    expect(previewHomebrew(emptyHomebrewForm("background")).name).toBe(
      "Unnamed Background",
    );
  });
});

describe("homebrew feats", () => {
  it("needs a name and a description, and previews as a feat", () => {
    const feat = emptyHomebrewForm("feat");
    expect(validateHomebrewForm({ ...feat, name: "Lucky Charm" })).toBe("Describe what the feat does.");

    const ready = {
      ...feat,
      name: "Lucky Charm",
      summary: "Reroll one die a day.",
      data: { prerequisite: "Level 4+" },
    };
    expect(validateHomebrewForm(ready)).toBe("");
    expect(previewHomebrew(ready)).toMatchObject({
      name: "Lucky Charm",
      edition: "Homebrew",
      desc: ["Reroll one die a day."],
      prerequisite: "Level 4+",
    });
  });
});

describe("draftEntryFrom", () => {
  const book = {
    name: "Tabaxi",
    book: "Monsters of the Multiverse",
    link_url: "https://dnd5e.wikidot.com/lineage:tabaxi",
    summary: "Curious cat-folk.",
  };

  it("builds a private, flagged draft that survives the same cleaning a save does", () => {
    for (const [category, extra] of [
      ["race", {}],
      ["background", {}],
      ["subclass", { parentClass: "fighter", parentClassName: "Fighter" }],
    ]) {
      const entry = draftEntryFrom(category, book, extra);
      expect(entry).toMatchObject({ category, name: "Tabaxi", isShared: false, summary: "Curious cat-folk." });
      // What homebrewStore does before saving: this threw on a string of languages.
      expect(() => cleanHomebrewData(category, entry.data)).not.toThrow();
      expect(cleanHomebrewData(category, entry.data).needsDetails).toBe(true);
    }
  });

  it("turns the blank race's languages into a list", () => {
    expect(draftEntryFrom("race", book).data.languages).toEqual(["Common"]);
  });
});

