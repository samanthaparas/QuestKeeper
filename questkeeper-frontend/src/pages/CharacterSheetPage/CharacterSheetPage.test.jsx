import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CharacterSheetPage from "./CharacterSheetPage";
import { getCharacter } from "../../utils/characterStore";
import { createCharacterSheet } from "../../utils/characterSheet";

// --- Fakes for everything that would talk to the network ---
vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

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

it("toggles saving throw proficiency and updates the save bonus", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet());

  const strengthSave = (
    await screen.findAllByRole("button", { name: /^Save/ })
  )[0];
  expect(strengthSave).toHaveAttribute("aria-pressed", "false");
  expect(strengthSave).toHaveTextContent("Save +0");

  await user.click(strengthSave);

  expect(strengthSave).toHaveAttribute("aria-pressed", "true");
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

  await user.click(await screen.findByRole("tab", { name: "Story" }));

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

  await user.click(await screen.findByRole("tab", { name: "Story" }));
  await user.selectOptions(
    screen.getByLabelText("Spellcasting ability"),
    "intelligence",
  );

  expect(screen.getByRole("tab", { name: "Spells" })).toBeInTheDocument();
});

it("adds a bonus to all saves, like a Paladin's Aura of Protection", async () => {
  const user = userEvent.setup();
  renderSheet(makeSheet());

  const saves = await screen.findAllByRole("button", { name: /^Save/ });
  expect(saves[0]).toHaveTextContent("Save +0");

  const bonus = screen.getByLabelText("Bonus to all saves");
  await user.clear(bonus);
  await user.type(bonus, "3");

  for (const save of screen.getAllByRole("button", { name: /^Save/ })) {
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
  expect(within(row).getByText("+2", { selector: "span" })).toBeInTheDocument();
});

it("shows the AC with a temporary bonus without changing the base AC", async () => {
  const user = userEvent.setup();
  const sheet = makeSheet();
  sheet.combat.armorClass = 21;
  renderSheet(sheet);

  const bonus = await screen.findByLabelText("Temporary AC bonus");
  await user.clear(bonus);
  await user.type(bonus, "2");

  expect(screen.getByText(/\+2 = 23/)).toBeInTheDocument();
  expect(screen.getByLabelText(/^AC/)).toHaveValue(21);
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
  expect(within(screen.getByText("Thaumaturgy").closest("li")).getByRole("button", { name: "Edit" })).toBeInTheDocument();
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
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
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
