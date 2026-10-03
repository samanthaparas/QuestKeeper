import { describe, it, expect, vi } from "vitest";
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
