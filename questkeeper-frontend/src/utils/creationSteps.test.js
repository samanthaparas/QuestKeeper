import { describe, it, expect } from "vitest";
import { getGroupStatus, getVisibleSteps, getReviewIssues } from "./creationSteps";
import { getRaceFixedCantrip } from "./characterSheet";

const ALL_STEPS = ["name", "race", "subrace", "class", "review"];

describe("getGroupStatus", () => {
  it("is upcoming before the group's steps are reached", () => {
    const group = { label: "Ancestry", steps: ["race", "subrace"] };
    expect(getGroupStatus(group, ALL_STEPS, 0)).toBe("upcoming");
  });

  it("is current while inside any of the group's steps", () => {
    const group = { label: "Ancestry", steps: ["race", "subrace"] };
    expect(getGroupStatus(group, ALL_STEPS, 1)).toBe("current");
    expect(getGroupStatus(group, ALL_STEPS, 2)).toBe("current");
  });

  it("is complete once past all of the group's steps", () => {
    const group = { label: "Ancestry", steps: ["race", "subrace"] };
    expect(getGroupStatus(group, ALL_STEPS, 3)).toBe("complete");
  });

  it("handles a single-step group", () => {
    const group = { label: "Review", steps: ["review"] };
    expect(getGroupStatus(group, ALL_STEPS, 3)).toBe("upcoming");
    expect(getGroupStatus(group, ALL_STEPS, 4)).toBe("current");
  });

  it("returns upcoming if none of the group's steps exist in allSteps", () => {
    const group = { label: "Ghost", steps: ["notAStep"] };
    expect(getGroupStatus(group, ALL_STEPS, 2)).toBe("upcoming");
  });
});

describe("getVisibleSteps", () => {
  const withSubraces = { subraces: [{ index: "high-elf" }] };

  it("hides every optional step for a plain race and a non-caster", () => {
    expect(
      getVisibleSteps({
        raceRaw: { subraces: [] },
        subrace: null,
        characterClass: { id: "fighter" },
      }),
    ).toEqual([
      "name",
      "race",
      "class",
      "background",
      "classSkills",
      "abilities",
      "review",
    ]);
  });

  it("shows the subrace step only when the race has subraces", () => {
    expect(getVisibleSteps({ raceRaw: withSubraces })).toContain("subrace");
    expect(getVisibleSteps({ raceRaw: { subraces: [] } })).not.toContain(
      "subrace",
    );
  });

  it("shows the free cantrip step only for High Elf", () => {
    expect(
      getVisibleSteps({ raceRaw: withSubraces, subrace: { id: "high-elf" } }),
    ).toContain("subraceCantrip");
    expect(
      getVisibleSteps({ raceRaw: withSubraces, subrace: { id: "hill-dwarf" } }),
    ).not.toContain("subraceCantrip");
  });

  it("shows the subclass step only for classes that pick one at level 1", () => {
    expect(getVisibleSteps({ characterClass: { id: "cleric" } })).toContain(
      "subclass",
    );
    expect(getVisibleSteps({ characterClass: { id: "bard" } })).not.toContain(
      "subclass",
    );
  });

  it("shows the spells step only for classes with level 1 spells", () => {
    expect(getVisibleSteps({ characterClass: { id: "wizard" } })).toContain(
      "classSpells",
    );
    expect(
      getVisibleSteps({ characterClass: { id: "paladin" } }),
    ).not.toContain("classSpells");
    expect(getVisibleSteps({ characterClass: { id: "rogue" } })).not.toContain(
      "classSpells",
    );
  });

  it("puts background before skills so granted skills can be greyed out", () => {
    const steps = getVisibleSteps({ characterClass: { id: "bard" } });
    expect(steps.indexOf("background")).toBeLessThan(
      steps.indexOf("classSkills"),
    );
  });
});

describe("getRaceFixedCantrip", () => {
  it("gives Tiefling Thaumaturgy and nobody else a fixed cantrip", () => {
    expect(getRaceFixedCantrip("tiefling")?.index).toBe("thaumaturgy");
    expect(getRaceFixedCantrip("human")).toBeNull();
  });
});

describe("getReviewIssues", () => {
  const complete = {
    steps: ["name", "race", "class", "background", "classSkills", "abilities", "review"],
    race: { id: "human" },
    characterClass: { id: "fighter", skillChoice: { choose: 2 } },
    background: { id: "acolyte" },
    classSkills: [{ index: "athletics" }, { index: "history" }],
    abilityScores: { strength: 15 },
  };

  it("finds nothing when the character is complete", () => {
    expect(getReviewIssues(complete)).toEqual([]);
  });

  it("points at the step that fixes each gap", () => {
    const issues = getReviewIssues({
      ...complete,
      steps: [...complete.steps, "subrace", "classSpells"],
      subrace: null,
      classSkills: [{ index: "athletics" }],
      spellChoices: null,
      abilityScores: null,
    });

    expect(issues.map((issue) => issue.step)).toEqual(["subrace", "classSkills", "classSpells", "abilities"]);
    expect(issues.find((issue) => issue.step === "classSkills").message).toBe("Choose 1 more skill");
  });

  it("asks for a background's own skill pick until it is made", () => {
    const innkeeper = { id: "toh_innkeeper", name: "Innkeeper", skillChoice: { choose: 1 } };

    expect(getReviewIssues({ ...complete, background: innkeeper })).toEqual([
      { step: "classSkills", message: "Choose your Innkeeper skill" },
    ]);
    expect(
      getReviewIssues({ ...complete, background: innkeeper, backgroundSkills: [{ index: "persuasion" }] }),
    ).toEqual([]);
  });

  it("does not ask for steps that do not apply to this character", () => {
    expect(getReviewIssues({ ...complete, spellChoices: null }).map((issue) => issue.step)).not.toContain(
      "classSpells",
    );
  });
});

describe("the Gear step", () => {
  it("appears after Abilities only when the class or background has gear choices", () => {
    const withGear = getVisibleSteps({ characterClass: { id: "fighter" }, hasEquipmentChoices: true });
    expect(withGear.slice(-3)).toEqual(["abilities", "equipment", "review"]);
    expect(getVisibleSteps({ characterClass: { id: "fighter" } })).not.toContain("equipment");
  });

  it("is listed on Review until the gear is chosen", () => {
    const steps = ["equipment", "review"];
    const base = { steps, race: {}, characterClass: {}, background: {}, abilityScores: {} };

    expect(getReviewIssues(base)).toEqual([{ step: "equipment", message: "Choose your starting gear" }]);
    expect(getReviewIssues({ ...base, equipmentChosen: true })).toEqual([]);
  });
});
