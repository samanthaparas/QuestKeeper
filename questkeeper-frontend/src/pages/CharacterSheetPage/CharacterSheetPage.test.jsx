import { describe, it, expect, vi, afterEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CharacterSheetPage from "./CharacterSheetPage";
import { RETRY_DELAYS } from "../../hooks/useSrdEquipmentLookup";
import { getCharacter } from "../../utils/characterStore";
import { listCharacterTables } from "../../utils/tableStore";
import { getEquipment, getEquipmentDetails } from "../../utils/api";
import { createCharacterSheet } from "../../utils/characterSheet";

// --- Fakes for everything that would talk to the network ---
vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

// jsdom has no <dialog> pop-up support; open and close just flip the flag.
HTMLDialogElement.prototype.showModal = function showModal() {
  this.open = true;
};
HTMLDialogElement.prototype.close = function close() {
  this.open = false;
};

vi.mock("../../utils/characterStore", () => ({
  getCharacter: vi.fn(),
  saveCharacter: vi.fn().mockResolvedValue({}),
}));

// Combat turns come from Supabase and have their own tests; no fight here.
// No fight unless a test sets one (fakeTurn.value).
const fakeTurn = vi.hoisted(() => ({ value: null }));
vi.mock("../../hooks/useTableTurn", () => ({ useTableTurn: () => fakeTurn.value }));

// The banner's Apply button asks the database how much damage there is; here
// it is always 2.
vi.mock("../../utils/tableStore", async (importOriginal) => ({
  ...(await importOriginal()),
  resolveDamageRequest: vi.fn().mockResolvedValue(2),
  listCharacterTables: vi.fn().mockResolvedValue([]),
}));

// The table's handouts and journal have their own tests; stand-ins here.
vi.mock("../../components/TableHandouts/TableHandouts", () => ({
  default: () => <p>Table handouts</p>,
}));
vi.mock("../../components/TableJournal/TableJournal", () => ({
  default: () => <p>Table journal</p>,
}));

// The personal journal's notes live in Supabase; none here.
vi.mock("../../utils/characterJournalStore", () => ({
  listPersonalNotes: vi.fn().mockResolvedValue([]),
  addPersonalNote: vi.fn().mockResolvedValue({}),
  updatePersonalNote: vi.fn().mockResolvedValue(undefined),
  deletePersonalNote: vi.fn().mockResolvedValue(undefined),
  markNoteShared: vi.fn().mockResolvedValue(undefined),
}));

// The player's homebrew: none unless a test puts some in.
const fakeHomebrew = vi.hoisted(() => ({ list: [] }));
vi.mock("../../utils/homebrewCache", () => ({
  loadHomebrew: () => Promise.resolve(fakeHomebrew.list),
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  getWeapons: vi.fn().mockResolvedValue([]),
  getEquipment: vi.fn().mockResolvedValue([]),
  getEquipmentDetails: vi.fn().mockResolvedValue(null),
  getMagicItems: vi.fn().mockResolvedValue([]),
  // Level-up look-ups: no feats or features in these tests.
  getFeats: vi.fn().mockResolvedValue([]),
  getClassFeatures: vi.fn().mockResolvedValue([]),
  getSubclassFeatures: vi.fn().mockResolvedValue([]),
  getRaceTraits: vi.fn().mockResolvedValue([]),
  getSubraceTraits: vi.fn().mockResolvedValue([]),
}));

function makeSheet(overrides = {}) {
  return createCharacterSheet({
    name: "Test Rogue",
    level: 3,
    ...overrides,
  });
}

function renderSheet(sheet) {
  getCharacter.mockResolvedValue(sheet);

  return render(
    <MemoryRouter initialEntries={[`/characters/${sheet.id}`]}>
      <Routes>
        <Route path="/characters/:id" element={<CharacterSheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CharacterSheetPage", () => {
  it("loads the character and shows their name", async () => {
    renderSheet(makeSheet());

    expect(
      await screen.findByRole("heading", { name: "Test Rogue" }),
    ).toBeInTheDocument();
  });

  it("offers to join a table, with this character already picked", async () => {
    const sheet = makeSheet();
    renderSheet(sheet);

    expect(await screen.findByRole("link", { name: "Join a table" })).toHaveAttribute(
      "href",
      `/games?character=${sheet.id}`,
    );
  });

  it("toggles skill proficiency and updates the modifier", async () => {
    const user = userEvent.setup();
    renderSheet(makeSheet());

    const stealthButton = await screen.findByRole("button", {
      name: "Stealth proficiency",
    });
    const row = stealthButton.closest("li");

    expect(stealthButton).toHaveAttribute("aria-pressed", "false");
    expect(within(row).getByText("+0")).toBeInTheDocument();

    await user.click(stealthButton);

    expect(stealthButton).toHaveAttribute("aria-pressed", "true");
    expect(within(row).getByText("+2")).toBeInTheDocument();
  });
});

it("strips leading zeros as you type in a number box", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet({ gold: 0 }));

  const goldInput = await screen.findByLabelText("Gold");
  await user.clear(goldInput);
  await user.type(goldInput, "025");

  expect(goldInput).toHaveValue(25);
});

it("shows a running total next to Hit Points while temp HP is active", async () => {
  const user = userEvent.setup();
  const sheet = makeSheet();
  sheet.combat.hitPoints = { max: 20, current: 16, temporary: 0 };
  renderSheet(sheet);

  const tempInput = await screen.findByLabelText("Temp");
  await user.clear(tempInput);
  await user.type(tempInput, "5");

  expect(screen.getByText(/\+5 = 21/)).toBeInTheDocument();
});

it("a Long Rest clears temp HP", async () => {
  const user = userEvent.setup();
  const sheet = makeSheet();
  sheet.combat.hitPoints = { max: 20, current: 10, temporary: 7 };
  renderSheet(sheet);

  await user.click(await screen.findByRole("button", { name: "Long Rest" }));

  expect(screen.getByLabelText("Temp")).toHaveValue(0);
  expect(screen.queryByText(/\+7 =/)).not.toBeInTheDocument();
});

it("toggles saving throw proficiency with the dot and updates the save bonus", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet());

  // Stats are locked until "Edit stats" is tapped.
  await user.click(await screen.findByRole("button", { name: /Edit stats/ }));
  const proficiency = await screen.findByRole("button", { name: "Strength save proficiency" });
  const strengthSave = screen.getByRole("button", { name: /^Roll Strength save/ });
  expect(proficiency).toHaveAttribute("aria-pressed", "false");
  expect(strengthSave).toHaveTextContent("Save +0");

  await user.click(proficiency);

  expect(proficiency).toHaveAttribute("aria-pressed", "true");
  expect(strengthSave).toHaveTextContent("Save +2");
});

it("lets the player retype race, class and background to match a paper sheet", async () => {
  const user = userEvent.setup();
  renderSheet(
    makeSheet({
      race: { id: "human", name: "Human" },
      class: { id: "wizard", name: "Wizard" },
      background: { id: "acolyte", name: "Acolyte" },
    }),
  );

  await user.click(await screen.findByRole("button", { name: /Edit details/ }));

  const classInput = screen.getByLabelText("Class");
  await user.clear(classInput);
  await user.type(classInput, "Artificer");
  const backgroundInput = screen.getByLabelText("Background");
  await user.clear(backgroundInput);
  await user.type(backgroundInput, "Guild Artisan");

  expect(
    screen.getByText(/Level 3 Human Artificer.*Guild Artisan/),
  ).toBeInTheDocument();
});

it("lets a homebrew class choose its own spellcasting ability", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet({ class: { id: "fighter", name: "Artificer" } }));

  expect(screen.queryByRole("tab", { name: "Spells" })).not.toBeInTheDocument();

  await user.click(await screen.findByRole("button", { name: /Edit details/ }));
  await user.selectOptions(
    screen.getByLabelText("Spellcasting ability"),
    "intelligence",
  );

  expect(screen.getByRole("tab", { name: "Spells" })).toBeInTheDocument();
});

it("adds a bonus to all saves, like a Paladin's Aura of Protection", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet());

  const saves = await screen.findAllByRole("button", { name: /^Roll \w+ save/ });
  expect(saves[0]).toHaveTextContent("Save +0");
  await user.click(screen.getByRole("button", { name: /Edit stats/ }));

  const bonus = screen.getByLabelText("Bonus to all saves");
  await user.clear(bonus);
  await user.type(bonus, "3");

  for (const save of screen.getAllByRole("button", { name: /^Roll \w+ save/ })) {
    expect(save).toHaveTextContent("Save +3");
  }
});

it("clicking a skill badge steps through proficient and expertise", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet());

  const badge = await screen.findByRole("button", {
    name: "Stealth proficiency",
  });
  const row = badge.closest("li");

  await user.click(badge);
  expect(badge).toHaveTextContent("P");
  expect(within(row).getByText("+2")).toBeInTheDocument();

  await user.click(badge);
  expect(badge).toHaveTextContent("E");
  expect(within(row).getByText("+4")).toBeInTheDocument();

  await user.click(badge);
  expect(badge).toHaveAttribute("aria-pressed", "false");
  expect(within(row).getByText("+0")).toBeInTheDocument();
});

it("lets a player add a flat bonus to one skill", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet());

  await user.click(await screen.findByRole("button", { name: "Bonuses" }));
  const bonus = screen.getByLabelText("Perception bonus");
  await user.clear(bonus);
  await user.type(bonus, "2");

  const row = bonus.closest("li");
  // The skill's total is its roll button.
  expect(within(row).getByRole("button", { name: "Roll Perception, +2" })).toHaveTextContent("+2");
});

it("shows the AC with a temporary bonus without changing the base AC", async () => {
  const user = userEvent.setup();
  const sheet = makeSheet();
  sheet.combat.armorClass = 21;
  renderSheet(sheet);

  const bonus = await screen.findByLabelText("Temporary AC bonus");
  await user.clear(bonus);
  await user.type(bonus, "2");

  // The bonus box sits beside AC, and the label shows the total.
  expect(screen.getByText(/= 23/)).toBeInTheDocument();
  expect(screen.getByLabelText("Armor Class")).toHaveValue(21);
  expect(bonus).toHaveClass("character-sheet__ac-bonus--on");
});

it("a Short Rest spends Hit Dice to heal and says what happened", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0.5); // d8 -> 5
  const user = userEvent.setup();
  const sheet = makeSheet();
  sheet.abilityScores.constitution = 14; // +2
  sheet.combat.hitPoints = { max: 30, current: 10, temporary: 0 };
  sheet.combat.hitDice = { total: 3, remaining: 3, die: 8 };
  renderSheet(sheet);

  await user.click(await screen.findByRole("button", { name: "Short Rest" }));
  await user.click(screen.getByRole("button", { name: "Roll 1 Hit Die and rest" }));

  expect(screen.getByRole("status")).toHaveTextContent(
    "Short rest done. Rolled 5 (+2 CON each) and healed 7 HP: 10 → 17. 2 Hit Dice left.",
  );
  // The Hit Dice box at the top follows along.
  expect(screen.getByLabelText("Hit dice left")).toHaveValue(2);
  vi.restoreAllMocks();
});

it("a Long Rest gives back Hit Dice and says so", async () => {
  const user = userEvent.setup();
  const sheet = makeSheet();
  sheet.combat.hitDice = { total: 4, remaining: 0, die: 8 };
  renderSheet(sheet);

  await user.click(await screen.findByRole("button", { name: "Long Rest" }));

  expect(screen.getByRole("status")).toHaveTextContent(
    "Long rest done. HP is back to full, you got 2 Hit Dice back, and spell slots and abilities are refilled.",
  );
});

it("locks granted spells and lets the player lock or unlock any spell", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const user = userEvent.setup();
  const sheet = makeSheet({ class: { id: "cleric", name: "Cleric" } });
  sheet.spellcasting = {
    type: "prepared",
    cantripsKnown: [
      { index: "thaumaturgy", name: "Thaumaturgy", level: 0, notes: "", components: "", locked: true, grantedBy: "your race (Tiefling)" },
      { index: "light", name: "Light", level: 0, notes: "", components: "" },
    ],
    spellsKnown: [],
  };
  renderSheet(sheet);

  await user.click(await screen.findByRole("tab", { name: /Spells/ }));
  // In play the row shows where the spell came from, and no buttons.
  const thaumaturgy = (await screen.findByText("Thaumaturgy")).closest("li");
  expect(thaumaturgy).toHaveTextContent("From your race (Tiefling)");
  expect(within(screen.getByText("Light").closest("li")).queryByRole("button", { name: "Lock Light" })).toBeNull();

  // Lock, Unlock, Edit and Remove are behind Edit spells.
  await user.click(screen.getByRole("button", { name: "Edit spells" }));
  // Locked: its details can be corrected, but it can't be removed.
  expect(within(thaumaturgy).getByRole("button", { name: "Edit Thaumaturgy" })).toBeInTheDocument();
  expect(within(thaumaturgy).queryByRole("button", { name: /^Remove / })).not.toBeInTheDocument();

  const light = screen.getByText("Light").closest("li");
  await user.click(within(light).getByRole("button", { name: "Lock Light" }));
  expect(screen.getByText("Light").closest("li")).toHaveTextContent("🔒 Locked");

  await user.click(within(screen.getByText("Thaumaturgy").closest("li")).getByRole("button", { name: "Unlock" }));
  expect(within(screen.getByText("Thaumaturgy").closest("li")).getByRole("button", { name: /^Edit/ })).toBeInTheDocument();
  vi.restoreAllMocks();
});

describe("Stats | Skills switch on narrower screens", () => {
  afterEach(() => {
    delete window.matchMedia;
  });

  it("flips the top of the sheet between stats and skills", async () => {
    window.matchMedia = vi.fn((query) => ({
      matches: query.includes("max-width: 1023px"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const user = userEvent.setup();
    renderSheet(makeSheet());

    const toggle = await screen.findByRole("switch", { name: "Show skills" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("heading", { name: "Skills" })).not.toBeInTheDocument();

    // A tap anywhere on the pill flips it, not just on a word.
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument();
    expect(document.querySelector(".character-sheet__vitals")).toHaveClass("character-sheet__vitals--skills");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("heading", { name: "Skills" })).not.toBeInTheDocument();
  });

  it("keeps skills in the side column with no switch on wide screens", async () => {
    renderSheet(makeSheet());

    expect(await screen.findByRole("heading", { name: "Skills" })).toBeInTheDocument();
    // (Inspiration is a switch too, so look for the Stats | Skills one.)
    expect(screen.queryByRole("switch", { name: "Show skills" })).not.toBeInTheDocument();
  });
});

it("labels each attack value so phones can show it without the header row", async () => {
  const sheet = makeSheet();
  sheet.attacks = [{ index: "a1", name: "Javelin", toHit: 10, damage: "1d6+5", damageType: "Piercing", notes: "" }];
  renderSheet(sheet);

  const row = (await screen.findByText("Javelin")).closest(".character-sheet__attacks-row");
  expect(row.style.getPropertyValue("--item-columns")).toContain("minmax(220px, 1fr)");
  expect([...row.querySelectorAll(".character-sheet__attacks-cell")].map((cell) => cell.dataset.label)).toEqual([
    "To Hit",
    "Damage",
    "Type",
  ]);
});

it("switches inspiration on and off, since you only hold one", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet());

  const inspiration = await screen.findByRole("switch", { name: /Inspiration/ });
  expect(inspiration).toHaveAttribute("aria-checked", "false");

  await user.click(inspiration);
  expect(inspiration).toHaveAttribute("aria-checked", "true");

  await user.click(inspiration);
  expect(inspiration).toHaveAttribute("aria-checked", "false");
});

it("treats an older sheet's inspiration count as on", async () => {
  renderSheet(makeSheet({ inspiration: 2 }));
  expect(await screen.findByRole("switch", { name: /Inspiration/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

it("shows the proficiency bonus by the Skills title", async () => {
  renderSheet(makeSheet());
  const heading = await screen.findByRole("heading", { name: "Skills" });
  expect(heading.parentElement).toHaveTextContent("Prof +2");
});

it("keeps Level and a length-limited Subclass in the Edit details pop-up", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet());

  await user.click(await screen.findByRole("button", { name: /Edit details/ }));
  expect(screen.getByLabelText("Level")).toHaveValue(3);
  expect(screen.getByLabelText("Subclass")).toHaveAttribute("maxLength", "32");
});

it("locks stats until Edit stats is tapped, but keeps current HP editable", async () => {
  const user = userEvent.setup();
  const sheet = makeSheet();
  sheet.combat.armorClass = 15;
  sheet.combat.hitPoints = { current: 11, max: 11, temporary: 0 };
  renderSheet(sheet);

  const armorClass = await screen.findByLabelText("Armor Class");
  expect(armorClass).toHaveAttribute("readonly");
  await user.type(armorClass, "9");
  expect(armorClass).toHaveValue(15);
  expect(screen.getByLabelText("Max HP")).toHaveAttribute("readonly");
  expect(screen.getByRole("button", { name: "Strength save proficiency" })).toBeDisabled();

  // Current HP changes all the time in play, so it's never locked.
  const current = screen.getByLabelText("Current HP");
  expect(current).not.toHaveAttribute("readonly");
  await user.clear(current);
  await user.type(current, "9");
  expect(current).toHaveValue(9);

  await user.click(screen.getByRole("button", { name: /Edit stats/ }));
  expect(armorClass).not.toHaveAttribute("readonly");
  await user.click(screen.getByRole("button", { name: /Done editing/ }));
  expect(armorClass).toHaveAttribute("readonly");
});

it("edits details in a pop-up beside the name, not in the Story tab", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet());

  await user.click(await screen.findByRole("tab", { name: "Story" }));
  expect(screen.queryByText("Character Details")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /Edit details/ }));
  expect(screen.getByRole("heading", { name: "Character details" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Done" }));
  expect(screen.queryByRole("heading", { name: "Character details" })).not.toBeInTheDocument();
});

describe("click to roll", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rolls a skill with its bonus and shows the result", async () => {
    const user = userEvent.setup();
    // Every d20 lands on 11.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderSheet(makeSheet());

    await user.click(await screen.findByRole("button", { name: "Roll Stealth, +0" }));
    const result = screen.getByRole("region", { name: "Stealth roll" });
    expect(result).toHaveTextContent("11");
    expect(result).toHaveTextContent("d20 11");
    // Not seated at a table, so the roll stays private.
    expect(result).toHaveTextContent("Only you saw this");
  });

  it("keeps a history of rolls on the Rolls tab, reachable from the roll card", async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    renderSheet(makeSheet());

    await user.click(await screen.findByRole("button", { name: "Roll Stealth, +0" }));
    await user.click(screen.getByRole("button", { name: "See my roll history" }));

    expect(screen.getByRole("heading", { name: "Your rolls" })).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items.some((item) => item.textContent.includes("Stealth") && item.textContent.includes("d20 11"))).toBe(true);
  });

  it("rolls with advantage once, then goes back to normal", async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, "random").mockReturnValueOnce(0.1).mockReturnValueOnce(0.9).mockReturnValue(0.5);
    renderSheet(makeSheet());

    await user.click(await screen.findByRole("radio", { name: "Advantage" }));
    await user.click(screen.getByRole("button", { name: /^Roll Strength check/ }));

    const result = screen.getByRole("region", { name: "Strength check roll" });
    // Rolled a 3 and a 19, kept the 19.
    expect(result).toHaveTextContent("19");
    expect(within(result).getByText("3")).toHaveClass("roll-result__die--dropped");
    expect(screen.getByRole("radio", { name: "Normal" })).toHaveAttribute("aria-checked", "true");
  });

  it("offers critical damage after a natural 20 attack", async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const sheet = makeSheet();
    sheet.attacks = [{ index: "a1", name: "Dagger", toHit: 4, damage: "1d4+2", damageType: "Piercing", notes: "" }];
    renderSheet(sheet);

    await user.click(await screen.findByRole("button", { name: "Roll Dagger attack, +4" }));
    expect(screen.getByRole("region", { name: "Dagger attack roll" })).toHaveTextContent("Natural 20!");

    await user.click(screen.getByRole("button", { name: "Roll critical damage" }));
    // Two d4s (both 4) + 2.
    expect(screen.getByRole("region", { name: "Dagger damage (critical) roll" })).toHaveTextContent("10");
  });
});

describe("spell slot and resource pips", () => {
  it("spends a spell slot with a tap", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet({ class: { id: "wizard", name: "Wizard", spellcastingType: "prepared", spellcastingAbility: "intelligence" } });
    sheet.spellcasting = {
      type: "prepared",
      cantripsKnown: [],
      spellsKnown: [],
      spellSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => ({ level, max: level === 1 ? 4 : 0, current: level === 1 ? 4 : 0 })),
    };
    renderSheet(sheet);

    await user.click(await screen.findByRole("tab", { name: "Spells" }));
    expect(screen.getByRole("group", { name: "Level 1 spell slots: 4 of 4 left" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /Spend one/ })[0]);
    expect(screen.getByRole("group", { name: "Level 1 spell slots: 3 of 4 left" })).toBeInTheDocument();
  });

  it("uses pips for a few uses and a number box for a big pool", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet();
    sheet.resources = [
      { id: "r1", name: "Channel Divinity", max: 2, current: 2, resetOn: "short", notes: "" },
      { id: "r2", name: "Lay on Hands", max: 75, current: 60, resetOn: "long", notes: "" },
    ];
    renderSheet(sheet);

    await user.click(await screen.findByRole("tab", { name: "Resources" }));
    expect(screen.getByRole("group", { name: "Channel Divinity: 2 of 2 left" })).toBeInTheDocument();
    expect(screen.getByLabelText("Lay on Hands left")).toHaveValue(60);
  });
});

describe("conditions on the sheet", () => {
  it("marks a condition, and the roll bar offers disadvantage for it", async () => {
    const user = userEvent.setup();
    renderSheet(makeSheet());

    await user.click(await screen.findByRole("button", { name: "+ Condition" }));
    await user.click(screen.getByRole("button", { name: /^Poisoned/ }));

    expect(screen.getByText(/Poisoned: disadvantage on attack rolls and ability checks\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use Disadvantage" }));
    expect(screen.getByRole("radio", { name: "Disadvantage" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("death saves and concentration", () => {
  afterEach(() => vi.restoreAllMocks());

  it("takes a death save from real dice: type the d20 number and it counts", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet();
    sheet.combat.hitPoints = { max: 20, current: 0, temporary: 0 };
    renderSheet(sheet);

    const panel = await screen.findByRole("region", { name: "Death saves" });
    await user.click(screen.getByRole("radio", { name: "I roll real dice" }));
    await user.click(within(panel).getByRole("button", { name: "Roll death save" }));

    // The app asks for the number instead of rolling.
    expect(within(panel).queryByText(/Rolled/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Type the number on your d20/), "6");
    await user.click(screen.getByRole("button", { name: "Use my roll" }));

    expect(within(panel).getByText("Rolled 6: a failure.")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Failures 1" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows death saves at 0 HP, rolls one, and clears them once healed", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet();
    sheet.combat.hitPoints = { max: 20, current: 0, temporary: 0 };
    renderSheet(sheet);

    const panel = await screen.findByRole("region", { name: "Death saves" });
    vi.spyOn(Math, "random").mockReturnValue(0.7); // d20 -> 15
    await user.click(within(panel).getByRole("button", { name: "Roll death save" }));
    expect(within(panel).getByText("Rolled 15: a success.")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Successes 1" })).toHaveAttribute("aria-pressed", "true");

    const hp = screen.getByLabelText("Current HP");
    await user.clear(hp);
    await user.type(hp, "5");
    expect(screen.queryByRole("region", { name: "Death saves" })).not.toBeInTheDocument();

    await user.clear(hp);
    const again = await screen.findByRole("region", { name: "Death saves" });
    expect(within(again).getByRole("button", { name: "Successes 1" })).toHaveAttribute("aria-pressed", "false");
  });

  it("is stable after three successes", async () => {
    const sheet = makeSheet();
    sheet.combat.hitPoints = { max: 20, current: 0, temporary: 0 };
    sheet.deathSaves = { successes: 3, failures: 1 };
    renderSheet(sheet);

    expect(await screen.findByText(/^Stable\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Roll death save" })).not.toBeInTheDocument();
  });

  it("tracks concentration and asks for a CON save after damage", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet();
    sheet.combat.hitPoints = { max: 30, current: 30, temporary: 0 };
    renderSheet(sheet);

    await user.click(await screen.findByRole("button", { name: "+ Concentrating" }));
    await user.type(screen.getByLabelText("Spell you're concentrating on"), "Bless");
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByText(/: Bless/)).toBeInTheDocument();

    const hp = screen.getByLabelText("Current HP");
    await user.tripleClick(hp);
    await user.keyboard("6");
    expect(screen.getByRole("status")).toHaveTextContent("Make a CON save, DC 12, to keep Bless.");

    vi.spyOn(Math, "random").mockReturnValue(0); // d20 -> 1, a failure
    await user.click(screen.getByRole("button", { name: /Roll CON save/ }));
    expect(screen.queryByText(/: Bless/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Concentrating" })).toBeInTheDocument();
  });
});

describe("condition timers on the sheet", () => {
  afterEach(() => {
    fakeTurn.value = null;
  });

  // A three-person fight in turn order: a monster, then this character, then
  // another monster. `current` is whose turn it is ("a", "me" or "b").
  function fightWith({ round, current }) {
    const combatants = [
      { id: "a", name: "Goblin", kind: "monster", initiative: 20, created_at: "1" },
      { id: "me", name: "Test", kind: "player", initiative: 15, created_at: "2" },
      { id: "b", name: "Ogre", kind: "monster", initiative: 10, created_at: "3" },
    ];
    return {
      table: { id: "t1", name: "Test night", round, current_combatant_id: current },
      tableName: "Test night",
      activeTables: [],
      switchTable: () => {},
      endTurn: () => {},
      round,
      combatants,
      now: null,
      next: null,
      upcoming: [],
      myCombatant: combatants[1],
      isMyTurn: current === "me",
      latestEvent: null,
      damageRequests: [],
      refresh: () => {},
    };
  }

  it("takes a round off timed conditions when your own turn ends, and says when one wears off", async () => {
    const sheet = makeSheet();
    sheet.conditions = [{ key: "poisoned", rounds: 1 }, { key: "frightened", rounds: 3 }];
    // One of this character's turns had already been counted; the turn has now
    // moved past it again (round 2, on the last monster).
    sheet.roundSeen = { tableId: "t1", turns: 1 };
    fakeTurn.value = fightWith({ round: 2, current: "b" });
    renderSheet(sheet);

    expect(await screen.findByText("⏱ Poisoned has ended (the rounds ran out).")).toBeInTheDocument();
    expect(screen.getByText("⏱ 2 rounds")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Poisoned" })).not.toBeInTheDocument();
  });

  it("doesn't count a round until your own turn has ended", async () => {
    const sheet = makeSheet();
    sheet.conditions = [{ key: "frightened", rounds: 3 }];
    sheet.roundSeen = { tableId: "t1", turns: 1 };
    // Round 2, but the first monster is still up: this character hasn't had
    // (or finished) its turn this round, so nothing is counted.
    fakeTurn.value = fightWith({ round: 2, current: "a" });
    renderSheet(sheet);

    expect(await screen.findByText("⏱ 3 rounds")).toBeInTheDocument();
  });

  it("doesn't count down when a new fight starts back at round 1", async () => {
    const sheet = makeSheet();
    sheet.conditions = [{ key: "frightened", rounds: 3 }];
    sheet.roundSeen = { tableId: "t1", turns: 6 };
    fakeTurn.value = fightWith({ round: 1, current: "a" });
    renderSheet(sheet);

    expect(await screen.findByText("⏱ 3 rounds")).toBeInTheDocument();
  });

  it("ends a timed concentration spell at the end of your own turn, not at the end of the round", async () => {
    const sheet = makeSheet();
    sheet.concentration = { spell: "Bless", rounds: 2 };
    sheet.roundSeen = { tableId: "t1", turns: 1 };

    // Two rounds on, the first monster is up and this character's turn hasn't
    // come around yet: one of the two rounds is used, so Bless is still going.
    fakeTurn.value = fightWith({ round: 3, current: "a" });
    const { unmount } = renderSheet(sheet);
    expect(await screen.findByText("⏱ 1 round")).toBeInTheDocument();
    unmount();

    // Once this character's turn has ended, it runs out.
    fakeTurn.value = fightWith({ round: 3, current: "b" });
    renderSheet(sheet);
    expect(await screen.findByText("⏱ Bless has ended (the rounds ran out).")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Concentrating" })).toBeInTheDocument();
  });

  it("gives concentration a 10-round timer with ⏱", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet();
    sheet.concentration = { spell: "Bless" };
    renderSheet(sheet);

    await user.click(await screen.findByRole("button", { name: "Set how many rounds Bless lasts" }));
    expect(screen.getByText("⏱ 10 rounds")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "One less round of Bless" }));
    expect(screen.getByText("⏱ 9 rounds")).toBeInTheDocument();
  });
});

it("shows the Hit Dice left over the total, and a Short Rest lowers what's left", async () => {
  const user = userEvent.setup();
  const sheet = makeSheet();
  sheet.combat.hitPoints = { max: 20, current: 10, temporary: 0 };
  sheet.combat.hitDice = { total: 3, die: 8, remaining: 3 };
  renderSheet(sheet);

  const left = await screen.findByLabelText("Hit dice left");
  expect(left).toHaveValue(3);
  expect(screen.getByLabelText("Hit dice total")).toHaveValue(3);

  await user.clear(left);
  await user.type(left, "9");
  expect(left).toHaveValue(3); // can't be more than the total
});

describe("damage from the DM at 0 HP", () => {
  afterEach(() => {
    fakeTurn.value = null;
  });

  it("counts as a failed death save, and says so", async () => {
    const sheet = makeSheet();
    sheet.combat.hitPoints = { max: 20, current: 0, temporary: 0 };
    sheet.deathSaves = { successes: 1, failures: 0 };
    fakeTurn.value = {
      table: { id: "t1", name: "Test night", round: 1 },
      tableName: "Test night",
      activeTables: [],
      switchTable: () => {},
      endTurn: () => {},
      round: 1,
      combatants: [],
      now: null,
      next: null,
      upcoming: [],
      myCombatant: null,
      isMyTurn: false,
      latestEvent: null,
      damageRequests: [{ id: "r1", source: "Goblin", amount: 2 }],
      refresh: () => {},
    };
    renderSheet(sheet);

    await userEvent.click(await screen.findByRole("button", { name: "Apply 2 damage" }));

    expect(await screen.findByText(/already at 0 HP, so that's a failed death save/)).toBeInTheDocument();
    expect(screen.getByText("Taking damage at 0 HP counts as a failed death save.")).toBeInTheDocument();
  });
});

describe("help on the sheet", () => {
  afterEach(() => {
    delete window.matchMedia;
  });

  it("keeps the explanations out of the middle, behind a Help button on smaller screens", async () => {
    const user = userEvent.setup();
    renderSheet(makeSheet());

    const help = await screen.findByRole("button", { name: "? Help" });
    expect(help).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("What do these boxes mean?")).not.toBeInTheDocument();

    await user.click(help);
    expect(help).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("region", { name: "Help with the sheet" });
    expect(within(panel).getByText("What do these boxes mean?")).toBeInTheDocument();
    expect(within(panel).getByText("New to dice? What does this mean?")).toBeInTheDocument();
    expect(within(panel).getByText(/20-sided die/)).toBeInTheDocument();

    await user.click(help);
    expect(screen.queryByRole("region", { name: "Help with the sheet" })).not.toBeInTheDocument();
  });

  it("puts both explanations in the side panel on wide screens, with no Help button", async () => {
    window.matchMedia = vi.fn((query) => ({
      matches: query.includes("min-width: 1300px"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    renderSheet(makeSheet());

    const side = await screen.findByRole("complementary", { name: "Portrait and quick controls" });
    expect(within(side).getByText("What do these boxes mean?")).toBeInTheDocument();
    expect(within(side).getByText("New to dice? What does this mean?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "? Help" })).not.toBeInTheDocument();
  });

  it("shows the setup choices still to make as a count on the Features tab", async () => {
    const sheet = makeSheet();
    sheet.languages = "Common\nChoose 1 more (Half-Elf)";
    renderSheet(sheet);

    expect(await screen.findByRole("tab", { name: "Features (1 choice left)" })).toBeInTheDocument();
  });
});

describe("The Journal tab", () => {
  afterEach(() => {
    listCharacterTables.mockResolvedValue([]);
    window.localStorage?.clear?.();
  });

  it("is the character's own private journal when there's no table", async () => {
    const user = userEvent.setup();
    renderSheet(makeSheet());

    await user.click(await screen.findByRole("tab", { name: "Journal" }));

    expect(screen.getByRole("heading", { name: "My journal" })).toBeInTheDocument();
    expect(screen.getByText(/Only you can read them/)).toBeInTheDocument();
    // One tab, no switch, nothing about tables.
    expect(screen.queryByRole("tab", { name: "Journal & Handouts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Which journal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bring notes into/ })).not.toBeInTheDocument();
  });

  it("at a table, is one tab with a switch between the table's journal and my private notes", async () => {
    listCharacterTables.mockResolvedValue([{ id: "t1", name: "Friday Game", session_number: 2 }]);
    const user = userEvent.setup();
    renderSheet(makeSheet());

    await user.click(await screen.findByRole("tab", { name: "Journal & Handouts" }));
    // There is only one journal tab, not two.
    expect(screen.queryByRole("tab", { name: "My Journal" })).not.toBeInTheDocument();

    // It opens on the table's journal and handouts.
    expect(screen.getByText("Table handouts")).toBeInTheDocument();
    expect(screen.getByText("Table journal")).toBeInTheDocument();

    const switcher = screen.getByRole("group", { name: "Which journal" });
    await user.click(within(switcher).getByRole("button", { name: "My private notes" }));
    expect(screen.getByRole("heading", { name: "My journal" })).toBeInTheDocument();
    expect(screen.queryByText("Table journal")).not.toBeInTheDocument();

    await user.click(within(switcher).getByRole("button", { name: /journal & handouts/ }));
    expect(screen.getByText("Table journal")).toBeInTheDocument();
  });
});

describe("armor look-up when the rules server is slow", () => {
  afterEach(() => {
    vi.useRealTimers();
    getEquipment.mockResolvedValue([]);
    getEquipmentDetails.mockResolvedValue(null);
  });

  it("tries again on its own, so worn armor isn't lost for good", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // The server is asleep at first, then wakes up.
    let asleep = true;
    getEquipment.mockImplementation(async () => {
      if (asleep) throw new Error("waking up");
      return [{ index: "leather-armor", name: "Leather Armor" }];
    });
    getEquipmentDetails.mockResolvedValue({ index: "leather-armor", name: "Leather Armor", armor_category: "Light", armor_class: { base: 11, dex_bonus: true } });
    const sheet = makeSheet();
    sheet.equipment = [{ index: "i1", name: "Leather Armor", quantity: 1 }];
    renderSheet(sheet);

    await screen.findByRole("tab", { name: "Inventory" });
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("tab", { name: "Inventory" }));
    // Not recognised as armor yet...
    expect(screen.queryByRole("button", { name: "Wearing Leather Armor" })).not.toBeInTheDocument();

    // ...but once the server is awake, the next retry finds it and the shield button appears.
    asleep = false;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RETRY_DELAYS[0] + 100);
    });
    expect(await screen.findByRole("button", { name: "Wearing Leather Armor" })).toBeInTheDocument();
  });
});


describe("level-up keeps the sheet's own numbers current", () => {
  afterEach(() => {
    getEquipment.mockResolvedValue([]);
    getEquipmentDetails.mockResolvedValue(null);
  });

  it("raises an auto AC when an Ability Score Improvement raises Dexterity", async () => {
    const user = userEvent.setup();
    getEquipment.mockResolvedValue([{ index: "leather-armor", name: "Leather Armor" }]);
    getEquipmentDetails.mockResolvedValue({
      index: "leather-armor",
      name: "Leather Armor",
      armor_category: "Light",
      armor_class: { base: 11, dex_bonus: true },
    });
    const sheet = makeSheet();
    sheet.class = { id: "fighter", name: "Fighter", hitDie: 10 };
    sheet.abilityScores = { ...sheet.abilityScores, dexterity: 16 };
    sheet.acMode = "auto";
    sheet.combat.armorClass = 14;
    sheet.initiativeMode = "auto";
    sheet.combat.initiative = 3;
    sheet.combat.initiativeBonus = 0;
    sheet.equipment = [{ index: "i1", name: "Leather Armor", quantity: 1, equipped: true }];
    renderSheet(sheet);
    expect(await screen.findByLabelText("Armor Class")).toHaveValue(14);

    await user.click(screen.getByRole("button", { name: "Level Up" }));
    await user.click(await screen.findByRole("button", { name: /Take Average/ }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(await screen.findByRole("button", { name: "+2 to One Ability" }));
    await user.selectOptions(screen.getByRole("combobox"), "dexterity");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(await screen.findByRole("button", { name: /Confirm & Finish/ }));
    await user.click(await screen.findByRole("button", { name: "Continue" }));

    // Leather armor: 11 + DEX modifier, now +4.
    expect(await screen.findByLabelText("Armor Class")).toHaveValue(15);
    // Initiative follows the new Dexterity too (+3 -> +4).
    expect(screen.getByRole("spinbutton", { name: "Initiative" })).toHaveValue(4);
  });
});

describe("out-of-date numbers and optional class features", () => {
  afterEach(() => {
    getEquipment.mockResolvedValue([]);
    getEquipmentDetails.mockResolvedValue(null);
    vi.restoreAllMocks();
  });

  // Pippa's sheet as it was saved: levelled to 6 before AC and attacks
  // followed level-ups, with Archery.
  function stalePippa() {
    getEquipment.mockResolvedValue([
      { index: "leather-armor", name: "Leather Armor" },
      { index: "longbow", name: "Longbow" },
    ]);
    getEquipmentDetails.mockImplementation((index) =>
      Promise.resolve(
        index === "leather-armor"
          ? { index, name: "Leather Armor", armor_category: "Light", armor_class: { base: 11, dex_bonus: true } }
          : {
              index,
              name: "Longbow",
              weapon_category: "Martial",
              weapon_range: "Ranged",
              damage: { damage_dice: "1d8", damage_type: { name: "Piercing" } },
              properties: [],
            },
      ),
    );
    const sheet = makeSheet({ level: 6 });
    sheet.class = { id: "ranger", name: "Ranger", hitDie: 10 };
    sheet.abilityScores = { ...sheet.abilityScores, dexterity: 18 };
    sheet.acMode = "auto";
    sheet.combat.armorClass = 14;
    sheet.proficiencies = [{ index: "p1", name: "Martial Weapons" }];
    sheet.features = [{ index: "f1", name: "Fighting Style: Archery", description: "" }];
    sheet.equipment = [
      { index: "i1", name: "Leather Armor", quantity: 1, equipped: true },
      { index: "i2", name: "Longbow", quantity: 1 },
    ];
    sheet.attacks = [{ index: "a1", name: "Longbow", toHit: 5, damage: "1d8+3", damageType: "Piercing", notes: "" }];
    return sheet;
  }

  it("offers to update stale AC and attack numbers, and changes them only when asked", async () => {
    const user = userEvent.setup();
    renderSheet(stalePippa());

    const notice = await screen.findByText("3 numbers are out of date");
    const box = notice.closest("[role='status']");
    expect(within(box).getByText(/AC 14 → 15/)).toBeInTheDocument();
    expect(within(box).getByText("Longbow: +5 / 1d8+3 → +9 / 1d8+4")).toBeInTheDocument();
    expect(screen.getByLabelText("Armor Class")).toHaveValue(14);

    await user.click(within(box).getByRole("button", { name: "Update" }));
    expect(screen.getByLabelText("Armor Class")).toHaveValue(15);
    expect(screen.queryByText(/out of date/)).not.toBeInTheDocument();
  });

  it("keeps the player's numbers when they say so", async () => {
    const user = userEvent.setup();
    renderSheet(stalePippa());
    const box = (await screen.findByText("3 numbers are out of date")).closest("[role='status']");
    await user.click(within(box).getByRole("button", { name: "Keep mine" }));
    expect(screen.queryByText(/out of date/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Armor Class")).toHaveValue(14);
  });

  it("switches a Ranger to Favored Foe only after the player confirms", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet({ level: 6 });
    sheet.class = { id: "ranger", name: "Ranger", hitDie: 10 };
    sheet.features = [
      { index: "f1", name: "Favored Enemy (1 type)", description: "" },
      { index: "f2", name: "Favored Enemy (2 types)", description: "" },
    ];
    renderSheet(sheet);
    await user.click(await screen.findByRole("tab", { name: /Features/ }));

    // Folded to one line until tapped.
    const panel = screen.getByText(/Optional class features \(Tasha's\)/).closest("details");
    expect(panel.open).toBe(false);
    expect(screen.getByText(/not using any/)).toBeInTheDocument();
    await user.click(screen.getByText(/Optional class features \(Tasha's\)/));
    expect(panel.open).toBe(true);

    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Use Favored Foe" }));
    expect(confirm.mock.calls[0][0]).toContain("Comes off: Favored Enemy (1 type), Favored Enemy (2 types)");
    expect(screen.getByText("Favored Enemy (1 type)")).toBeInTheDocument();

    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Use Favored Foe" }));
    expect(screen.queryByText("Favored Enemy (1 type)")).not.toBeInTheDocument();
    // Its row in the list (the panel's heading says it too).
    expect(document.querySelector(".character-sheet__resource-name")?.textContent).toBe("Favored Foe");
    // At level 6 the extra damage is a d6.
    expect(screen.getByText("Extra damage: 1d6 · Needs concentration; once per turn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop using Favored Foe" })).toBeInTheDocument();
    expect(screen.getByText(/Optional class features \(Tasha's\) · 1 in use/)).toBeInTheDocument();
  });
});

describe("homebrew subclass bonus spells on an existing character", () => {
  afterEach(() => {
    fakeHomebrew.list = [];
  });

  it("offers to add the ones already passed, and adds them once outside spells known", async () => {
    const user = userEvent.setup();
    fakeHomebrew.list = [
      {
        id: "fw1",
        category: "subclass",
        name: "Fey Wanderer",
        data: {
          parentClass: "ranger",
          features: [],
          spells: [
            { name: "Charm Person", level: 3, spellLevel: 1 },
            { name: "Misty Step", level: 5, spellLevel: 2 },
            { name: "Dispel Magic", level: 9, spellLevel: 3 },
          ],
        },
      },
    ];
    const sheet = makeSheet({ level: 6 });
    sheet.class = { id: "ranger", name: "Ranger", hitDie: 10, subclass: { id: "hb_fw1", name: "Fey Wanderer" } };
    sheet.spellcasting = {
      type: "known",
      cantripsKnown: [],
      spellsKnown: [{ index: "g", name: "Goodberry", level: 1, notes: "", components: "" }],
    };
    renderSheet(sheet);

    const box = (await screen.findByText("Fey Wanderer spells to sort out")).closest("[role='status']");
    expect(within(box).getByText("Not on your sheet yet: Charm Person, Misty Step")).toBeInTheDocument();
    await user.click(within(box).getByRole("button", { name: "Add them" }));
    expect(screen.queryByText("Fey Wanderer spells to sort out")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Spells" }));
    expect(screen.getAllByText("Charm Person")).toHaveLength(1);
    expect(screen.getAllByText(/From Fey Wanderer/)).toHaveLength(2);
  });
});

describe("Roving's speed on a sheet switched on before the fix", () => {
  it("offers Speed 30 → 35 and changes it only on Update", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet({ level: 6 });
    sheet.class = { id: "ranger", name: "Ranger", hitDie: 10 };
    sheet.optionalFeatures = { deftExplorer: true };
    sheet.speed = 35; // where the old version put it
    sheet.combat.speed = 30;
    sheet.features = [{ index: "r", name: "Deft Explorer: Roving", description: "" }];
    renderSheet(sheet);

    const box = (await screen.findByText("1 number is out of date")).closest("[role='status']");
    expect(within(box).getByText("Speed 30 → 35 ft (from Deft Explorer: Roving)")).toBeInTheDocument();
    expect(screen.getByLabelText("Speed")).toHaveValue(30);
    await user.click(within(box).getByRole("button", { name: "Update" }));
    expect(screen.getByLabelText("Speed")).toHaveValue(35);
    expect(screen.queryByText(/out of date/)).not.toBeInTheDocument();
  });
});

describe("compact Spells tab", () => {
  it("shows spellcasting numbers on one line, slots as chips, and Max/Hide only while editing", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet({ class: { id: "wizard", name: "Wizard", spellcastingType: "prepared", spellcastingAbility: "intelligence" } });
    sheet.spellcasting = {
      type: "prepared",
      cantripsKnown: [],
      spellsKnown: [],
      spellSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => ({
        level,
        max: level === 1 ? 4 : level === 2 ? 2 : 0,
        current: level === 1 ? 3 : level === 2 ? 2 : 0,
      })),
    };
    renderSheet(sheet);
    await user.click(await screen.findByRole("tab", { name: "Spells" }));

    expect(screen.getByText("Save DC")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Spell attack/ })).toBeInTheDocument();
    // "1st ●●●○ 3/4": the count is short, the screen reader label is full.
    expect(screen.getByRole("group", { name: "Level 1 spell slots: 3 of 4 left" })).toBeInTheDocument();
    expect(screen.getByText("3/4")).toBeInTheDocument();
    expect(screen.queryByText("Max")).toBeNull();
    expect(screen.queryByRole("button", { name: /Hide level/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Edit slots" }));
    expect(screen.getAllByText("Max").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Hide level 2 slots" }));
    expect(screen.queryByRole("group", { name: /Level 2 spell slots/ })).toBeNull();
    // Hidden levels can be brought back while editing.
    await user.click(screen.getByRole("button", { name: "+ Level 2" }));
    expect(screen.getByRole("group", { name: "Level 2 spell slots: 2 of 2 left" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("button", { name: "+ Level 2" })).toBeNull();
  });
});

describe("calm spell list", () => {
  it("sorts by level then A to Z, with the level first and no buttons until Edit spells", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet({ class: { id: "ranger", name: "Ranger", spellcastingType: "known", spellcastingAbility: "wisdom" } });
    sheet.spellcasting = {
      type: "known",
      cantripsKnown: [{ index: "c", name: "Druidcraft", level: 0, notes: "", components: "V, S" }],
      spellsKnown: [
        { index: "s", name: "Silence", level: 2, notes: "", components: "V, S" },
        { index: "g", name: "Goodberry", level: 1, notes: "", components: "V, S, M" },
        { index: "a", name: "absorb Elements", level: 1, notes: "", components: "S" },
        { index: "cp", name: "Charm Person", level: 1, notes: "", components: "", locked: true, grantedBy: "Fey Wanderer" },
      ],
    };
    renderSheet(sheet);
    await user.click(await screen.findByRole("tab", { name: "Spells" }));

    const rows = [...document.querySelectorAll(".character-sheet__resource-list li")].filter((row) =>
      row.querySelector(".character-sheet__spell-level-pill"),
    );
    expect(rows.map((row) => row.querySelector(".character-sheet__spell-level-pill").textContent)).toEqual([
      "Cantrip",
      "Lv 1",
      "Lv 1",
      "Lv 1",
      "Lv 2",
    ]);
    expect(rows.map((row) => row.querySelector(".character-sheet__resource-name").textContent)).toEqual([
      "Druidcraft",
      "absorb Elements",
      "Charm Person",
      "Goodberry",
      "Silence",
    ]);
    // Calm in play: a source tag, components as text, no buttons.
    expect(rows[2]).toHaveTextContent("From Fey Wanderer");
    expect(screen.queryByRole("button", { name: /^Lock / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit Goodberry/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Edit spells" }));
    expect(screen.getByRole("button", { name: "Lock Goodberry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Goodberry" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("button", { name: "Edit Goodberry" })).toBeNull();
  });
});

describe("Edit buttons on the other lists", () => {
  it("keeps pencils and trash hidden on Resources and Features lists until their Edit is tapped", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet();
    sheet.resources = [{ id: "r1", name: "Favored Foe", max: 3, current: 3, resetOn: "long", notes: "" }];
    sheet.features = [{ index: "f1", name: "Darkvision", description: "" }];
    sheet.feats = [{ index: "ft1", name: "Alert" }];
    sheet.proficiencies = [{ index: "p1", name: "Light Armor" }];
    renderSheet(sheet);

    await user.click(await screen.findByRole("tab", { name: "Resources" }));
    expect(screen.queryByRole("button", { name: "Edit Favored Foe" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Edit resources" }));
    expect(screen.getByRole("button", { name: "Edit Favored Foe" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Features/ }));
    for (const [label, item] of [
      ["Edit features", "Darkvision"],
      ["Edit feats", "Alert"],
      ["Edit proficiencies", "Light Armor"],
    ]) {
      expect(screen.queryByRole("button", { name: `Remove ${item}` })).toBeNull();
      await user.click(screen.getByRole("button", { name: label }));
      expect(screen.getByRole("button", { name: `Remove ${item}` })).toBeInTheDocument();
    }
  });
});

describe("roll bar during level-up", () => {
  it("steps aside while levelling up and comes back on the sheet", async () => {
    const user = userEvent.setup();
    renderSheet(makeSheet());
    expect(await screen.findByText(/Tap a number to roll it/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Level Up" }));
    expect(screen.queryByText(/Tap a number to roll it/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByText(/Tap a number to roll it/)).toBeInTheDocument();
  });
});

describe("editing in place", () => {
  it("opens a feature's edit form in its own row, with Save and Cancel right there", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet();
    sheet.features = [
      { index: "f1", name: "Darkvision", description: "See in the dark." },
      { index: "f2", name: "Beguiling Twist", description: "Old text." },
    ];
    renderSheet(sheet);
    await user.click(await screen.findByRole("tab", { name: /Features/ }));
    await user.click(screen.getByRole("button", { name: "Edit features" }));
    await user.click(screen.getByRole("button", { name: "Edit Beguiling Twist" }));

    // The form is where the row was (Darkvision is still a normal row above).
    const form = document.querySelector(".character-sheet__inline-edit");
    expect(form).toBeInTheDocument();
    expect(within(form).getByDisplayValue("Beguiling Twist")).toBeInTheDocument();
    expect(form.previousElementSibling).toHaveTextContent("Darkvision");
    // Nothing to scroll up for: no Save Changes up by Add Feature.
    expect(screen.getAllByRole("button", { name: "Save Changes" })).toHaveLength(1);

    const description = within(form).getByDisplayValue("Old text.");
    await user.clear(description);
    await user.type(description, "New text.");
    await user.click(within(form).getByRole("button", { name: "Save Changes" }));
    expect(document.querySelector(".character-sheet__inline-edit")).toBeNull();
    expect(screen.getByText("Beguiling Twist")).toBeInTheDocument();

    // Cancel leaves it unchanged.
    await user.click(screen.getByRole("button", { name: "Edit Darkvision" }));
    await user.click(within(document.querySelector(".character-sheet__inline-edit")).getByRole("button", { name: "Cancel" }));
    expect(document.querySelector(".character-sheet__inline-edit")).toBeNull();
  });
});

describe("Initiative on an older sheet", () => {
  it("offers Initiative +3 -> +5 for a stale number and changes it only on Update", async () => {
    const user = userEvent.setup();
    const sheet = makeSheet({ level: 8 });
    sheet.abilityScores = { ...sheet.abilityScores, dexterity: 20 };
    sheet.combat.initiative = 3;
    renderSheet(sheet);

    const box = (await screen.findByText(/out of date/)).closest("[role='status']");
    expect(within(box).getByText("Initiative +3 → +5 (from your Dexterity)")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Initiative" })).toHaveValue(3);
    await user.click(within(box).getByRole("button", { name: "Update" }));
    expect(screen.getByRole("spinbutton", { name: "Initiative" })).toHaveValue(5);
    expect(screen.queryByText(/out of date/)).not.toBeInTheDocument();
  });
});
