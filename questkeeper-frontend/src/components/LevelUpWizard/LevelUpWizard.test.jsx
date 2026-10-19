import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The wizard can open the homebrew pop-up, which loads the Supabase client.
// CI has no Supabase settings, so give it a stand-in.
vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

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
import {
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

    const pick = await screen.findByLabelText("Favored Enemy (2 types): enemy type");
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
