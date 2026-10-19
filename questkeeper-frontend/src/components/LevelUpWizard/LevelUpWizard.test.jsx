import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The wizard can open the homebrew pop-up, which loads the Supabase client.
// CI has no Supabase settings, so give it a stand-in.
vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

// The player's homebrew list (no entries unless a test gives some).
vi.mock("../../utils/homebrewCache", () => ({
  loadHomebrew: vi.fn().mockResolvedValue([]),
  refreshHomebrew: vi.fn(),
  primeHomebrew: vi.fn(),
}));

// Fake API answers: a Rogue with the SRD Thief and Tome of Heroes' Cat Burglar.
vi.mock("../../utils/api", () => ({
  getFeats: vi.fn().mockResolvedValue([]),
  getFeatDetails: vi.fn(),
  getClassSpells: vi.fn().mockResolvedValue([]),
  getSpellDetails: vi.fn(),
  // Feature look-ups for the Class Choices step. Empty unless a test fills them.
  getClassFeatures: vi.fn().mockResolvedValue([]),
  getFeatureDetails: vi.fn(),
  getRaceTraits: vi.fn().mockResolvedValue([]),
  getSubraceTraits: vi.fn().mockResolvedValue([]),
  getTraitDetails: vi.fn(),
  getClassDetails: vi.fn().mockResolvedValue({
    index: "rogue",
    subclasses: [
      { index: "thief", name: "Thief", source: "SRD 5.1" },
      { index: "toh_cat-burglar", name: "Cat Burglar", source: "Tome of Heroes" },
      {
        index: "book_rogue-swashbuckler",
        name: "Swashbuckler",
        source: "Xanathar's Guide to Everything",
        sourceGroup: "Official books",
      },
    ],
  }),
  getSubclassDetails: vi.fn((index) =>
    Promise.resolve(
      index === "book_rogue-swashbuckler"
        ? {
            index,
            name: "Swashbuckler",
            is_book_entry: true,
            book: "Xanathar's Guide to Everything",
            source: "Xanathar's Guide to Everything",
            summary: "A dashing duelist.",
            link_url: "https://dnd5e.wikidot.com/rogue:swashbuckler",
            class: { index: "rogue", name: "Rogue" },
            can_make_homebrew: true,
          }
        : index === "thief"
        ? { index, name: "Thief", source: "SRD 5.1", subclass_flavor: "Roguish Archetype", desc: ["Steal things."] }
        : {
            index,
            name: "Cat Burglar",
            source: "Tome of Heroes",
            subclass_flavor: "Roguish Archetype",
            desc: ["Climb in through windows."],
          },
    ),
  ),
  getSubclassFeatures: vi.fn((index) =>
    Promise.resolve(
      index === "thief"
        ? [{ index: "fast-hands", name: "Fast Hands" }]
        : [
            { index: "toh_cat-burglar.dodger", name: "Artful Dodger", level: 3 },
            { index: "toh_cat-burglar.eye", name: "Cat's Eye", level: 9 },
          ],
    ),
  ),
}));

import { MemoryRouter } from "react-router-dom";
import LevelUpWizard from "./LevelUpWizard";
import { loadHomebrew } from "../../utils/homebrewCache";
import {
  getFeats,
  getClassFeatures,
  getClassSpells,
  getFeatureDetails,
  getSpellDetails,
} from "../../utils/api";

// A level 2 Rogue, so the next level (3) includes the subclass step.
const rogue = {
  name: "Vex",
  level: 2,
  class: { id: "rogue", name: "Rogue", hitDie: 8 },
  abilityScores: {
    strength: 10,
    dexterity: 16,
    constitution: 12,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
  combat: {
    hitPoints: { max: 15, current: 15, temporary: 0 },
    hitDice: { total: 2, remaining: 2, die: 8 },
    hpHistory: [],
  },
};

async function reachSubclassStep() {
  render(
    <MemoryRouter>
      <LevelUpWizard sheet={rogue} onComplete={vi.fn()} onCancel={vi.fn()} />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("button", { name: /Take Average/ }));
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
}

describe("LevelUpWizard subclass step", () => {
  it("lists every subclass with its source", async () => {
    await reachSubclassStep();

    expect(await screen.findByRole("radio", { name: /Thief/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Cat Burglar/ })).toBeInTheDocument();
    expect(screen.getByText("Tome of Heroes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose a subclass" })).toBeDisabled();
  });

  it("shows the picked subclass's description and features by level", async () => {
    await reachSubclassStep();
    await userEvent.click(await screen.findByRole("radio", { name: /Cat Burglar/ }));

    expect(await screen.findByText("Climb in through windows.")).toBeInTheDocument();
    expect(screen.getByText("Artful Dodger (level 3)")).toBeInTheDocument();
    expect(screen.getByText("Cat's Eye (level 9)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose Cat Burglar" })).toBeEnabled();
  });

  it("switches details when a different subclass is picked", async () => {
    await reachSubclassStep();
    await userEvent.click(await screen.findByRole("radio", { name: /Cat Burglar/ }));
    await screen.findByText("Climb in through windows.");

    await userEvent.click(screen.getByRole("radio", { name: /Thief/ }));

    expect(await screen.findByText("Steal things.")).toBeInTheDocument();
    expect(screen.queryByText("Climb in through windows.")).not.toBeInTheDocument();
    expect(screen.getByText("Fast Hands")).toBeInTheDocument();
  });

  it("offers 'Make it as homebrew' instead of Choose for a book subclass", async () => {
    await reachSubclassStep();
    await userEvent.click(await screen.findByRole("radio", { name: /Swashbuckler/ }));

    expect(await screen.findByText("A dashing duelist.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make it as homebrew" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Choose / })).not.toBeInTheDocument();
  });
});

// A Ranger's spell step: how many picks, and the optional swap.
const rangerSpells = [
  { index: "hunters-mark", name: "Hunter's Mark", level: 1 },
  { index: "cure-wounds", name: "Cure Wounds", level: 1 },
  { index: "goodberry", name: "Goodberry", level: 1 },
  { index: "fog-cloud", name: "Fog Cloud", level: 1 },
  { index: "pass-without-trace", name: "Pass without Trace", level: 2 },
];

function makeRanger(level, spellsKnown) {
  return {
    ...rogue,
    name: "QA Ranger",
    level,
    class: { id: "ranger", name: "Ranger", hitDie: 10, spellcastingType: "known" },
    spellcasting: { type: "known", cantripsKnown: [], spellsKnown },
  };
}

async function reachSpellStep(sheet, onComplete = vi.fn()) {
  getClassFeatures.mockResolvedValue([]);
  getClassSpells.mockResolvedValue(rangerSpells);
  getSpellDetails.mockImplementation((index) =>
    Promise.resolve({ index, name: index, components: ["V"] }),
  );
  render(
    <MemoryRouter>
      <LevelUpWizard sheet={sheet} onComplete={onComplete} onCancel={vi.fn()} />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("button", { name: /Take Average/ }));
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  // Rangers make a class choice at 2 and 6 first. With no feature data it
  // says it couldn't load them, and Next goes on.
  const step = await screen.findByRole("heading", { name: /^(Class Choices|Spells)$/ });
  if (step.textContent === "Class Choices") {
    await screen.findByText(/Couldn't load this level's choices/);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
  }
}

describe("LevelUpWizard spell step", () => {
  it("asks a level 1 Ranger for two new spells", async () => {
    await reachSpellStep(makeRanger(1, []));

    const first = await screen.findByLabelText("New spell 1");
    const second = screen.getByLabelText("New spell 2");
    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toBeDisabled();

    await userEvent.selectOptions(first, "hunters-mark");
    // A spell picked in one box isn't offered in the other.
    expect(within(second).queryByRole("option", { name: /Hunter's Mark/ })).toBeNull();
    await userEvent.selectOptions(second, "cure-wounds");
    expect(next).toBeEnabled();
    // Level 2 Rangers only have level 1 slots.
    expect(within(first).queryByRole("option", { name: /Pass without Trace/ })).toBeNull();
  });

  // Level 6, not 4, so there's no Ability Score Improvement step in the way.
  it("lets a level 5 Ranger swap a spell when there's nothing new to learn", async () => {
    const onComplete = vi.fn();
    await reachSpellStep(
      makeRanger(5, [
        { index: "hunters-mark", name: "Hunter's Mark", level: 1 },
        { index: "cure-wounds", name: "Cure Wounds", level: 1 },
        { index: "goodberry", name: "Goodberry", level: 1 },
        { index: "fog-cloud", name: "Fog Cloud", level: 1 },
      ]),
      onComplete,
    );

    expect(await screen.findByText(/No new spells for a Ranger at level 6/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/New spell/)).toBeNull();

    await userEvent.click(screen.getByRole("checkbox", { name: /Swap one spell you know/ }));
    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText("Forget"), "cure-wounds");
    await userEvent.selectOptions(screen.getByLabelText("Learn instead"), "pass-without-trace");
    await userEvent.click(next);

    expect(await screen.findByText("Swapped Cure Wounds for Pass without Trace")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Confirm & Finish/ }));
    const names = onComplete.mock.calls[0][0].spellcasting.spellsKnown.map((s) => s.name);
    expect(names).toEqual(["Hunter's Mark", "Goodberry", "Fog Cloud", "Pass without Trace"]);
  });

  it("takes a typed-in book spell for a pick, and it counts like any other", async () => {
    const onComplete = vi.fn();
    await reachSpellStep(makeRanger(1, []), onComplete);

    await userEvent.selectOptions(await screen.findByLabelText("New spell 1"), "__book__");
    await userEvent.selectOptions(screen.getByLabelText("New spell 2"), "hunters-mark");
    const next = screen.getByRole("button", { name: "Next" });
    // Not done until it has a name.
    expect(next).toBeDisabled();

    // A level 2 Ranger can only cast level 1 spells.
    const levels = within(screen.getByLabelText("Spell level")).getAllByRole("option");
    expect(levels.map((option) => option.textContent)).toEqual(["Level 1"]);

    await userEvent.type(screen.getByLabelText("Spell name"), "Ensnaring Strike");
    await userEvent.type(screen.getByLabelText("Components (optional)"), "V");
    expect(next).toBeEnabled();

    // A link that isn't a web link is turned away.
    const link = screen.getByLabelText("Book link (optional)");
    await userEvent.type(link, "javascript:alert(1)");
    expect(screen.getByText(/Links need to start with http/)).toBeInTheDocument();
    expect(next).toBeDisabled();
    await userEvent.clear(link);
    await userEvent.type(link, "https://example.com/ensnaring-strike");
    await userEvent.click(next);

    expect(
      await screen.findByText("New spells: Ensnaring Strike (book), Hunter's Mark"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Confirm & Finish/ }));
    const known = onComplete.mock.calls[0][0].spellcasting.spellsKnown;
    const book = known.find((spell) => spell.name === "Ensnaring Strike");
    expect(book).toMatchObject({
      level: 1,
      components: "V",
      link: "https://example.com/ensnaring-strike",
    });
    expect(book.index).toBeTruthy();
    expect(book.bonusSpell).toBeUndefined();
  });

  it("won't take a book spell that's already on the sheet", async () => {
    await reachSpellStep(makeRanger(1, [
      { index: "abc", name: "Ensnaring Strike", level: 1 },
    ]));

    await userEvent.selectOptions(await screen.findByLabelText("New spell"), "__book__");
    await userEvent.type(screen.getByLabelText("Spell name"), "ensnaring strike");
    expect(screen.getByText(/is already on your sheet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("lets the swap learn a book spell instead", async () => {
    const onComplete = vi.fn();
    await reachSpellStep(
      makeRanger(5, [
        { index: "hunters-mark", name: "Hunter's Mark", level: 1 },
        { index: "cure-wounds", name: "Cure Wounds", level: 1 },
        { index: "goodberry", name: "Goodberry", level: 1 },
        { index: "fog-cloud", name: "Fog Cloud", level: 1 },
      ]),
      onComplete,
    );

    await userEvent.click(
      await screen.findByRole("checkbox", { name: /Swap one spell you know/ }),
    );
    await userEvent.selectOptions(screen.getByLabelText("Forget"), "cure-wounds");
    await userEvent.selectOptions(screen.getByLabelText("Learn instead"), "__book__");
    // A level 6 Ranger casts up to level 2.
    const levels = within(screen.getByLabelText("Spell level")).getAllByRole("option");
    expect(levels.map((option) => option.textContent)).toEqual(["Level 1", "Level 2"]);
    await userEvent.type(screen.getByLabelText("Spell name"), "Absorb Elements");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(
      await screen.findByText("Swapped Cure Wounds for Absorb Elements (book)"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Confirm & Finish/ }));
    const names = onComplete.mock.calls[0][0].spellcasting.spellsKnown.map((s) => s.name);
    expect(names).toEqual(["Hunter's Mark", "Goodberry", "Fog Cloud", "Absorb Elements"]);
  });
});

// Class Choices: fake SRD features, shaped like the SRD API's answers.
const fakeFeatures = {
  "favored-enemy-2-types": {
    index: "favored-enemy-2-types",
    name: "Favored Enemy (2 types)",
    level: 6,
    class: { name: "Ranger" },
    desc: ["Choose one more favored enemy."],
    feature_specific: {
      enemy_type_options: {
        choose: 1,
        type: "string",
        from: { options: ["undead", "fey"] },
      },
    },
  },
  "paladin-fighting-style": {
    index: "paladin-fighting-style",
    name: "Fighting Style",
    level: 2,
    class: { name: "Paladin" },
    desc: ["You adopt a style of fighting."],
    feature_specific: {
      subfeature_options: {
        choose: 1,
        type: "feature",
        from: {
          options: [
            { item: { index: "paladin-fighting-style-defense", name: "Fighting Style: Defense" } },
            { item: { index: "paladin-fighting-style-dueling", name: "Fighting Style: Dueling" } },
          ],
        },
      },
    },
  },
  "paladin-fighting-style-defense": {
    index: "paladin-fighting-style-defense",
    name: "Fighting Style: Defense",
    level: 2,
    parent: { name: "Fighting Style" },
    class: { name: "Paladin" },
    desc: ["+1 to AC while wearing armor."],
  },
  "paladin-fighting-style-dueling": {
    index: "paladin-fighting-style-dueling",
    name: "Fighting Style: Dueling",
    level: 2,
    parent: { name: "Fighting Style" },
    class: { name: "Paladin" },
    desc: ["+2 damage with a one-handed weapon."],
  },
  "rogue-expertise-2": {
    index: "rogue-expertise-2",
    name: "Expertise",
    level: 6,
    class: { name: "Rogue" },
    desc: ["Double your proficiency bonus for two skills."],
    feature_specific: {
      expertise_options: {
        choose: 2,
        type: "proficiency",
        from: {
          options: ["acrobatics", "insight", "perception", "stealth"].map((skill) => ({
            option_type: "reference",
            item: { index: `skill-${skill}` },
          })),
        },
      },
    },
  },
  "eldritch-invocations": {
    index: "eldritch-invocations",
    name: "Eldritch Invocations",
    level: 2,
    class: { name: "Warlock" },
    desc: ["You learn invocations."],
    feature_specific: {
      invocations: [
        { index: "eldritch-invocation-agonizing-blast" },
        { index: "eldritch-invocation-thirsting-blade" },
        { index: "eldritch-invocation-lifedrinker" },
      ],
    },
  },
  "eldritch-invocation-agonizing-blast": {
    index: "eldritch-invocation-agonizing-blast",
    name: "Eldritch Invocation: Agonizing Blast",
    level: 2,
    parent: { name: "Eldritch Invocations" },
    class: { name: "Warlock" },
    prerequisites: [{ type: "spell", spell: "/api/2014/spells/eldritch-blast" }],
    desc: ["Add CHA to Eldritch Blast damage."],
  },
  "eldritch-invocation-thirsting-blade": {
    index: "eldritch-invocation-thirsting-blade",
    name: "Eldritch Invocation: Thirsting Blade",
    level: 5,
    parent: { name: "Eldritch Invocations" },
    class: { name: "Warlock" },
    prerequisites: [
      { type: "level", level: 5 },
      { type: "feature", feature: "/api/2014/features/pact-of-the-blade" },
    ],
    desc: ["Attack twice with your pact weapon."],
  },
  "eldritch-invocation-lifedrinker": {
    index: "eldritch-invocation-lifedrinker",
    name: "Eldritch Invocation: Lifedrinker",
    level: 12,
    parent: { name: "Eldritch Invocations" },
    class: { name: "Warlock" },
    prerequisites: [{ type: "level", level: 12 }],
    desc: ["Extra necrotic damage."],
  },
};

function makeCharacter(classId, className, level, extra = {}) {
  return {
    ...rogue,
    name: `QA ${className}`,
    level,
    class: { id: classId, name: className, hitDie: 10 },
    features: [],
    ...extra,
  };
}

async function reachClassChoices(sheet, featureIndexes, onComplete = vi.fn()) {
  getClassFeatures.mockResolvedValue(featureIndexes.map((index) => ({ index, name: index })));
  // Unknown features (the fake subclass lists) fail, and are skipped.
  getFeatureDetails.mockImplementation((index) =>
    fakeFeatures[index] ? Promise.resolve(fakeFeatures[index]) : Promise.reject(new Error("none")),
  );
  render(
    <MemoryRouter>
      <LevelUpWizard sheet={sheet} onComplete={onComplete} onCancel={vi.fn()} />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("button", { name: /Take Average/ }));
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(await screen.findByRole("heading", { name: "Class Choices" })).toBeInTheDocument();
}

const paladinFeatures = [
  "paladin-fighting-style",
  "paladin-fighting-style-defense",
  "paladin-fighting-style-dueling",
];

describe("LevelUpWizard class choices step", () => {
  it("asks a level 2 Paladin for a Fighting Style and saves it with its text", async () => {
    const onComplete = vi.fn();
    await reachClassChoices(makeCharacter("paladin", "Paladin", 1), paladinFeatures, onComplete);

    const style = await screen.findByLabelText("Fighting Style");
    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toBeDisabled();
    await userEvent.selectOptions(style, "feature:paladin-fighting-style-defense");
    // The picked style's SRD text shows so the player can compare.
    expect(screen.getByText("+1 to AC while wearing armor.")).toBeInTheDocument();
    await userEvent.click(next);

    expect(await screen.findByText(/Class choices: Fighting Style: Defense/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Confirm & Finish/ }));
    const [feature] = onComplete.mock.calls[0][0].features;
    expect(feature).toMatchObject({
      name: "Fighting Style: Defense",
      description: "+1 to AC while wearing armor.",
    });
  });

  it("takes a typed-in book Fighting Style with a link and no book text", async () => {
    const onComplete = vi.fn();
    await reachClassChoices(makeCharacter("paladin", "Paladin", 1), paladinFeatures, onComplete);

    await userEvent.selectOptions(await screen.findByLabelText("Fighting Style"), "__book__");
    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^Name/), "Blind Fighting");
    const link = screen.getByLabelText("Book link (optional)");
    await userEvent.type(link, "javascript:alert(1)");
    expect(screen.getByText(/Links need to start with http/)).toBeInTheDocument();
    expect(next).toBeDisabled();
    await userEvent.clear(link);
    await userEvent.type(link, "https://example.com/blind-fighting");
    await userEvent.click(next);

    expect(
      await screen.findByText(/Class choices: Fighting Style: Blind Fighting \(book\)/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Confirm & Finish/ }));
    const [feature] = onComplete.mock.calls[0][0].features;
    expect(feature).toMatchObject({
      name: "Fighting Style: Blind Fighting",
      description: "",
      link: "https://example.com/blind-fighting",
    });
  });

  it("gives a level 6 Rogue Expertise in two skills they're proficient in", async () => {
    const onComplete = vi.fn();
    await reachClassChoices(
      makeCharacter("rogue", "Rogue", 5, {
        skills: { stealth: true, perception: true, acrobatics: true },
        skillExpertise: { stealth: true },
        class: { id: "rogue", name: "Rogue", hitDie: 8, subclass: { id: "thief", name: "Thief" } },
      }),
      ["rogue-expertise-2"],
      onComplete,
    );

    const first = await screen.findByLabelText("Expertise 1");
    // Only proficient skills without Expertise yet; Insight isn't trained.
    expect(within(first).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Choose one",
      "Acrobatics",
      "Perception",
    ]);
    await userEvent.selectOptions(first, "perception");
    const second = screen.getByLabelText("Expertise 2");
    expect(within(second).queryByRole("option", { name: "Perception" })).toBeNull();
    await userEvent.selectOptions(second, "acrobatics");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    await userEvent.click(await screen.findByRole("button", { name: /Confirm & Finish/ }));
    expect(onComplete.mock.calls[0][0].skillExpertise).toEqual({
      stealth: true,
      perception: true,
      acrobatics: true,
    });
  });

  it("asks a level 5 Warlock for one new invocation, hiding ones for higher levels", async () => {
    await reachClassChoices(
      makeCharacter("warlock", "Warlock", 4, {
        features: [{ index: "x", name: "Eldritch Invocation: Agonizing Blast" }],
        class: { id: "warlock", name: "Warlock", hitDie: 8, subclass: { id: "fiend", name: "The Fiend" } },
      }),
      [
        "eldritch-invocations",
        "eldritch-invocation-agonizing-blast",
        "eldritch-invocation-thirsting-blade",
        "eldritch-invocation-lifedrinker",
      ],
    );

    // The Player's Handbook: 2 invocations known at level 4, 3 at level 5.
    const pick = await screen.findByLabelText("Eldritch Invocations");
    expect(screen.queryByLabelText("Eldritch Invocations 2")).toBeNull();
    const labels = within(pick).getAllByRole("option").map((option) => option.textContent);
    expect(labels).toEqual([
      "Choose one",
      "Eldritch Invocation: Thirsting Blade (needs Pact Of The Blade)",
      "Book option instead (type it in)",
    ]);
  });

  it("lets a Ranger skip Favored Enemy when the table uses a book replacement", async () => {
    const onComplete = vi.fn();
    getClassSpells.mockResolvedValue(rangerSpells);
    await reachClassChoices(
      {
        ...makeRanger(5, [
          { index: "hunters-mark", name: "Hunter's Mark", level: 1 },
          { index: "cure-wounds", name: "Cure Wounds", level: 1 },
          { index: "goodberry", name: "Goodberry", level: 1 },
          { index: "fog-cloud", name: "Fog Cloud", level: 1 },
        ]),
        features: [],
      },
      ["favored-enemy-2-types"],
      onComplete,
    );

    const pick = await screen.findByLabelText("Favored Enemy: choose one enemy type");
    await userEvent.selectOptions(pick, "__skip__");
    expect(screen.getByText(/This feature won't be added/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    // The spell step (a swap is optional), then the review.
    await screen.findByRole("heading", { name: "Spells" });
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByText("Class choices: Favored Enemy (2 types): skipped"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Confirm & Finish/ }));
    const [finished, extra] = onComplete.mock.calls[0];
    expect(finished.features).toEqual([]);
    expect(extra).toEqual({ skippedFeatures: ["Favored Enemy (2 types)"] });
  });

  it("lets the player go on if the choices can't be loaded", async () => {
    await reachClassChoices(makeCharacter("paladin", "Paladin", 1), []);
    expect(await screen.findByText(/Couldn't load this level's choices/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Class choices: none made")).toBeInTheDocument();
  });
});

describe("LevelUpWizard ability score step", () => {
  it("shows no empty feat box before a feat is picked", async () => {
    const { container } = render(
      <MemoryRouter>
        <LevelUpWizard
          sheet={makeCharacter("fighter", "Fighter", 3)}
          onComplete={vi.fn()}
          onCancel={vi.fn()}
        />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Take Average/ }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(await screen.findByRole("button", { name: "Take a Feat" }));

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(container.querySelector(".level-up-wizard__feat-card")).toBeNull();
  });
});

describe("LevelUpWizard setup reminders", () => {
  it("lists choices still open from earlier on the first step, without blocking", async () => {
    render(
      <MemoryRouter>
        <LevelUpWizard
          sheet={makeCharacter("fighter", "Fighter", 3)}
          onComplete={vi.fn()}
          onCancel={vi.fn()}
          setupTasks={[
            { key: "language:race", label: "Choose 1 more language (your race)" },
            { key: "feature:1", label: "Choose the enemy type for Favored Enemy (1 type) (from level 1)" },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Still open from earlier \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Favored Enemy \(1 type\) \(from level 1\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Take Average/ }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    // Gone after the first step, and levelling went on.
    expect(screen.queryByText(/Still open from earlier/)).toBeNull();
    expect(await screen.findByText("Ability Score Improvement")).toBeInTheDocument();
  });
});

describe("LevelUpWizard Back, review and spell preview", () => {
  it("goes back without losing the HP roll or choices, and applies them once", async () => {
    const onComplete = vi.fn();
    getClassFeatures.mockResolvedValue([]);
    const sheet = makeCharacter("fighter", "Fighter", 3);
    render(
      <MemoryRouter>
        <LevelUpWizard sheet={sheet} onComplete={onComplete} onCancel={vi.fn()} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Take Average/ }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(await screen.findByRole("button", { name: "+2 to One Ability" }));
    await userEvent.selectOptions(screen.getByRole("combobox"), "strength");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Review Level 4")).toBeInTheDocument();

    // Back to the ability step: +2 Strength is still picked.
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("combobox")).toHaveValue("strength");
    // Back to HP: the average is still taken, and there's no Back on step 1.
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText(/Took average of/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();

    // Forward again and finish: everything is applied once.
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(await screen.findByRole("button", { name: /Confirm & Finish/ }));
    const finished = onComplete.mock.calls[0][0];
    expect(finished.level).toBe(4);
    expect(finished.abilityScores.strength).toBe(sheet.abilityScores.strength + 2);
    expect(finished.combat.hitPoints.max).toBe(sheet.combat.hitPoints.max + 6 + 1);
    expect(finished.combat.hpHistory).toHaveLength(1);
  });

  it("lists what the new level brings on its own, apart from the player's choices", async () => {
    await reachSpellStep(
      makeRanger(4, [
        { index: "hunters-mark", name: "Hunter's Mark", level: 1 },
        { index: "cure-wounds", name: "Cure Wounds", level: 1 },
        { index: "goodberry", name: "Goodberry", level: 1 },
      ]),
    );
    await userEvent.selectOptions(await screen.findByLabelText("New spell"), "pass-without-trace");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Your choices")).toBeInTheDocument();
    expect(screen.getByText("Comes with level 5")).toBeInTheDocument();
    expect(await screen.findByText("Proficiency bonus: +2 → +3")).toBeInTheDocument();
    expect(screen.getByText(/Spell slots: .*level 2: 0 → 2/)).toBeInTheDocument();
  });

  it("previews a spell's level, school, concentration and components", async () => {
    await reachSpellStep(makeRanger(1, []));
    getSpellDetails.mockImplementation((index) =>
      Promise.resolve({
        index,
        name: "Hunter's Mark",
        level: 1,
        school: { name: "Divination" },
        concentration: true,
        components: ["V"],
        desc: ["Mark a creature."],
        casting_time: "1 bonus action",
        range: "90 feet",
        duration: "Concentration, up to 1 hour",
      }),
    );
    await userEvent.selectOptions(await screen.findByLabelText("New spell 1"), "hunters-mark");
    expect(await screen.findByText("Level 1 · Divination · Concentration")).toBeInTheDocument();
    expect(screen.getByText(/Components:/).parentElement).toHaveTextContent("Components: V");
    expect(screen.getByText("Mark a creature.")).toBeInTheDocument();
  });
});

describe("LevelUpWizard feats for a 2014 character", () => {
  it("lists 2014 and homebrew feats only, never 2024 ones like Epic Boons", async () => {
    getFeats.mockClear();
    getFeats.mockResolvedValue([
      { index: "grappler", name: "Grappler", edition: "2014" },
      { index: "hb_1", name: "Sharpshooter (my version)", edition: "Homebrew" },
      { index: "boon-of-fate", name: "Boon of Fate", edition: "2024" },
    ]);
    render(
      <MemoryRouter>
        <LevelUpWizard sheet={makeCharacter("fighter", "Fighter", 3)} onComplete={vi.fn()} onCancel={vi.fn()} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Take Average/ }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(await screen.findByRole("button", { name: "Take a Feat" }));

    // Only the 2014 list is asked for.
    expect(getFeats.mock.calls.every((call) => call[0] !== "2024")).toBe(true);
    const names = within(screen.getByRole("combobox")).getAllByRole("option").map((option) => option.textContent);
    expect(names).toEqual(["Choose a feat", "Grappler (2014 SRD)", "Sharpshooter (my version) (Homebrew)"]);
    expect(screen.getByText(/make it as homebrew on the Feats page/)).toBeInTheDocument();
    getFeats.mockResolvedValue([]);
  });
});

describe("LevelUpWizard review: a homebrew subclass at level 11", () => {
  // A Fey Wanderer like Pippa's, with the two level 11 changes filled in.
  const feyWanderer = {
    id: "fw1",
    category: "subclass",
    name: "Fey Wanderer",
    data: {
      parentClass: "ranger",
      features: [
        {
          name: "Dreadful Strikes",
          level: 3,
          description: "",
          damage: [
            { level: 3, dice: "1d4", type: "psychic" },
            { level: 11, dice: "1d6", type: "psychic" },
          ],
        },
        { name: "Fey Reinforcements", level: 11, description: "" },
      ],
      spells: [{ name: "Summon Fey", level: 11, spellLevel: 3, source: "Fey Reinforcements", freeCast: true }],
    },
  };

  async function reviewLevel(level) {
    loadHomebrew.mockResolvedValue([feyWanderer]);
    // A full list for the old level (5 at 9, 6 at 10), so only one is new.
    const known = Array.from({ length: level - 5 }, (_, i) => ({ index: `k${i}`, name: `Known ${i}`, level: 1 }));
    const sheet = makeRanger(level - 1, known);
    sheet.class = { ...sheet.class, subclass: { id: "hb_fw1", name: "Fey Wanderer" } };
    await reachSpellStep(sheet);
    const pick = screen.queryByLabelText("New spell");
    if (pick) await userEvent.selectOptions(pick, "pass-without-trace");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Comes with level " + level);
  }

  it("says Dreadful Strikes goes from 1d4 to 1d6, and Summon Fey comes from Fey Reinforcements", async () => {
    await reviewLevel(11);
    expect(await screen.findByText("Dreadful Strikes damage: 1d4 → 1d6 psychic")).toBeInTheDocument();
    expect(
      screen.getByText(/Summon Fey \(Fey Reinforcements, 1 free cast per long rest\)/),
    ).toBeInTheDocument();
    loadHomebrew.mockResolvedValue([]);
  });

  it("says nothing about the damage on a level where it doesn't change", async () => {
    await reviewLevel(10);
    await screen.findByText("Your choices");
    expect(screen.queryByText(/Dreadful Strikes damage/)).toBeNull();
    expect(screen.queryByText(/Summon Fey/)).toBeNull();
    loadHomebrew.mockResolvedValue([]);
  });
});
