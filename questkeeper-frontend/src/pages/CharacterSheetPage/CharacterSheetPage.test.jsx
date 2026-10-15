import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CharacterSheetPage from "./CharacterSheetPage";
import { getCharacter } from "../../utils/characterStore";
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
vi.mock("../../hooks/useTableTurn", () => ({ useTableTurn: () => null }));

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  getWeapons: vi.fn().mockResolvedValue([]),
  getEquipment: vi.fn().mockResolvedValue([]),
  getMagicItems: vi.fn().mockResolvedValue([]),
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
  const thaumaturgy = (await screen.findByText("Thaumaturgy")).closest("li");
  expect(thaumaturgy).toHaveTextContent("🔒 From your race (Tiefling)");
  expect(within(thaumaturgy).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(within(thaumaturgy).queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();

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
