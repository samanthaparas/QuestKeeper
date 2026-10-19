import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSheetFeaturesTab from "./CharacterSheetFeaturesTab";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

vi.mock("../../utils/api", () => ({
  getFeats: vi.fn().mockResolvedValue([]),
  getFeatDetails: vi.fn(),
  getClassFeatures: vi.fn().mockResolvedValue([
    { index: "divine-sense", name: "Divine Sense" },
    { index: "aura-of-protection", name: "Aura of Protection" },
  ]),
  getSubclassFeatures: vi.fn(),
  getRaceTraits: vi.fn().mockResolvedValue([]),
  getSubraceTraits: vi.fn(),
  getTraitDetails: vi.fn(),
  getBackgroundDetails: vi.fn().mockResolvedValue({
    name: "Charlatan",
    feature: { name: "False Identity", desc: ["You have a second identity."] },
  }),
  getFeatureDetails: vi.fn((index) =>
    Promise.resolve(
      index === "divine-sense"
        ? {
            name: "Divine Sense",
            level: 1,
            class: { name: "Paladin" },
            desc: ["Detect fiends."],
          }
        : {
            name: "Aura of Protection",
            level: 6,
            class: { name: "Paladin" },
            desc: ["Add Charisma to saves."],
          },
    ),
  ),
}));

function renderTab(props = {}) {
  const handlers = { onFeaturesAddMany: vi.fn() };
  render(
    <CharacterSheetFeaturesTab
      classId="paladin"
      level={3}
      features={[]}
      feats={[]}
      proficiencies={[]}
      languages=""
      size="Medium"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("CharacterSheetFeaturesTab: add from class and race", () => {
  it("ticks the features the character has reached and adds them in one go", async () => {
    const { onFeaturesAddMany } = renderTab();

    await userEvent.click(
      screen.getByRole("button", { name: "Add from my class and race" }),
    );

    const sense = await screen.findByRole("checkbox", { name: /Divine Sense/ });
    const aura = screen.getByRole("checkbox", { name: /Aura of Protection/ });
    expect(sense).toBeChecked();
    expect(aura).not.toBeChecked();

    await userEvent.click(aura);
    await userEvent.click(
      screen.getByRole("button", { name: "Add 2 features" }),
    );

    // Each one remembers where it came from (here, the Paladin class).
    expect(onFeaturesAddMany).toHaveBeenCalledWith([
      {
        name: "Divine Sense",
        description: "Detect fiends.",
        source: { type: "class", id: "paladin", key: "feature:divine-sense", level: 1 },
        choices: [],
      },
      {
        name: "Aura of Protection",
        description: "Add Charisma to saves.",
        source: { type: "class", id: "paladin", key: "feature:aura-of-protection", level: 6 },
        choices: [],
      },
    ]);
  });

  it("shows features already on the sheet as added and leaves them unticked", async () => {
    renderTab({
      features: [{ index: "f1", name: "Divine Sense", description: "" }],
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Add from my class and race" }),
    );

    const sense = await screen.findByRole("checkbox", { name: /Divine Sense/ });
    expect(sense).toBeDisabled();
    expect(sense).not.toBeChecked();
    expect(screen.getByText(/already on your sheet/)).toBeInTheDocument();
  });
});

describe("CharacterSheetFeaturesTab: choices and setup", () => {
  const favoredEnemy = {
    index: "f1",
    name: "Favored Enemy (1 type)",
    description: "",
    choices: [
      { key: "enemy_type_options", label: "Enemy type", choose: 1, options: ["beasts", "undead"], picked: [] },
    ],
  };

  it("asks for a feature's pick and saves it, without choosing for the player", async () => {
    const onFeatureChoose = vi.fn();
    renderTab({ features: [favoredEnemy], onFeatureChoose, featureEntries: [] });

    const select = screen.getByLabelText("Enemy type for Favored Enemy (1 type)");
    expect(select).toHaveValue("");
    expect(screen.getByText("Not chosen yet")).toBeInTheDocument();

    await userEvent.selectOptions(select, "undead");
    expect(onFeatureChoose).toHaveBeenCalledWith("f1", [
      expect.objectContaining({ key: "enemy_type_options", picked: ["undead"] }),
    ]);
  });

  it("shows the pick beside the name once made", () => {
    renderTab({
      features: [{ ...favoredEnemy, choices: [{ ...favoredEnemy.choices[0], picked: ["undead"] }] }],
      featureEntries: [],
    });
    expect(screen.getByText("Favored Enemy (1 type): Undead")).toBeInTheDocument();
  });

  it("offers the background's missing feature with a button", async () => {
    const { onFeaturesAddMany } = renderTab({
      background: { id: "hb_charlatan", name: "Charlatan", feature: "False Identity" },
      featureEntries: [],
    });

    await userEvent.click(await screen.findByRole("button", { name: "Add False Identity" }));
    expect(onFeaturesAddMany).toHaveBeenCalledWith([
      expect.objectContaining({ name: "False Identity", source: expect.objectContaining({ type: "background" }) }),
    ]);
  });

  it("lists the setup choices left", () => {
    renderTab({
      featureEntries: [],
      setupTasks: [
        { key: "language:race", label: "Choose 1 more language (your race)" },
        { key: "feature:f1", label: "Choose for Favored Enemy (1 type)" },
      ],
    });
    expect(screen.getByText("Character setup: 2 choices left")).toBeInTheDocument();
    expect(screen.getByText("Choose 1 more language (your race)")).toBeInTheDocument();
  });
});

describe("CharacterSheetFeaturesTab: homebrew feature damage", () => {
  const strikes = {
    name: "Dreadful Strikes",
    level: 3,
    damage: [
      { level: 3, dice: "1d4", type: "psychic" },
      { level: 11, dice: "1d6", type: "psychic" },
    ],
    damageNote: "Once per creature per turn",
  };
  const features = [{ index: "ds", name: "Dreadful Strikes", description: "" }];

  it("shows the dice for the character's level, with when it applies and a roll button", () => {
    renderTab({ classId: "ranger", level: 10, features, homebrewFeatureDamage: [strikes] });
    expect(screen.getByText("Extra damage: 1d4 psychic · Once per creature per turn")).toBeInTheDocument();
    // Outside a sheet with a roller the roll button is just its text.
    expect(screen.getByText("🎲 1d4")).toBeInTheDocument();
  });

  it("goes up to 1d6 at level 11", () => {
    renderTab({ classId: "ranger", level: 11, features, homebrewFeatureDamage: [strikes] });
    expect(screen.getByText("Extra damage: 1d6 psychic · Once per creature per turn")).toBeInTheDocument();
    expect(screen.getByText("🎲 1d6")).toBeInTheDocument();
  });
});

describe("CharacterSheetFeaturesTab: sort and show", () => {
  const features = [
    { index: "f1", name: "Darkvision", description: "", source: { type: "race", id: "elf", level: 1 } },
    { index: "f2", name: "Spellcasting", description: "", source: { type: "class", id: "ranger", level: 2 } },
    { index: "f3", name: "Dreadful Strikes", description: "", source: { type: "subclass", id: "hb_fw1", level: 3 } },
    { index: "f4", name: "Favored Foe", description: "" },
    { index: "f5", name: "Lucky Charm", description: "" },
  ];
  const optionalFeatures = [{ key: "favoredFoe", grants: [{ name: "Favored Foe", level: 1 }] }];
  const groupedRows = (title) =>
    [...screen.getByRole("heading", { name: title }).closest("section").querySelectorAll("li")].map((row) =>
      row.classList.contains("character-sheet__list-group") ? `# ${row.textContent}` : row.textContent.split("▸")[0],
    );

  it("groups features by where they're from, and sorts them by level", async () => {
    window.localStorage.clear();
    renderTab({ classId: "ranger", level: 5, features, optionalFeatures });
    await userEvent.selectOptions(screen.getByLabelText("Sort Features"), "origin");
    expect(groupedRows("Features")).toEqual([
      "# Class",
      "Spellcasting",
      "# Subclass",
      "Dreadful Strikes",
      "# Tasha's option",
      "Favored Foe",
      "# Race",
      "Darkvision",
      "# Other",
      "Lucky Charm",
    ]);
    await userEvent.selectOptions(screen.getByLabelText("Sort Features"), "level");
    expect(groupedRows("Features").slice(0, 3)).toEqual(["Darkvision", "Spellcasting", "Dreadful Strikes"]);
    await userEvent.selectOptions(screen.getByLabelText("Show Features"), "origin:Subclass");
    expect(groupedRows("Features")).toEqual(["Dreadful Strikes"]);
    window.localStorage.clear();
  });

  it("groups proficiencies by kind, guessed from their names", async () => {
    window.localStorage.clear();
    renderTab({
      proficiencies: [
        { index: "p1", name: "Longbows" },
        { index: "p2", name: "Light Armor" },
        { index: "p3", name: "Thieves' Tools" },
        { index: "p4", name: "Shields" },
      ],
    });
    await userEvent.selectOptions(screen.getByLabelText("Sort Proficiencies"), "kind");
    expect(groupedRows("Proficiencies")).toEqual([
      "# Armor",
      "Light Armor",
      "Shields",
      "# Weapons",
      "Longbows",
      "# Tools",
      "Thieves' Tools",
    ]);
    window.localStorage.clear();
  });
});
