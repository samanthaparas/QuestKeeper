import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SpellsPage from "./SpellsPage";
import { getSpells } from "../utils/api";
import { SPELLS_PAGE_SIZE } from "../utils/spellFilters";

vi.mock("../utils/api", () => ({
  getSpells: vi.fn(),
  getSpellDetails: vi.fn(() => new Promise(() => {})),
}));

const wizard = { index: "wizard", name: "Wizard" };
const cleric = { index: "cleric", name: "Cleric" };
const evocation = { index: "evocation", name: "Evocation" };
const conjuration = { index: "conjuration", name: "Conjuration" };

const fewSpells = [
  {
    index: "acid-splash",
    name: "Acid Splash",
    level: 0,
    school: conjuration,
    classes: [wizard],
  },
  {
    index: "fireball",
    name: "Fireball",
    level: 3,
    school: evocation,
    classes: [wizard],
  },
  {
    index: "guiding-bolt",
    name: "Guiding Bolt",
    level: 1,
    school: evocation,
    classes: [cleric],
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <SpellsPage />
    </MemoryRouter>,
  );
}

describe("SpellsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSpells.mockResolvedValue(fewSpells);
  });

  it("shows each spell's level and school on its card", async () => {
    renderPage();

    expect(await screen.findByText("Level 3 · Evocation")).toBeInTheDocument();
    expect(screen.getByText("Cantrip · Conjuration")).toBeInTheDocument();
    expect(screen.getByText("3 spells")).toBeInTheDocument();
  });

  it("narrows the list by level, class and school, and clears the filters", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fireball");

    await user.selectOptions(screen.getByLabelText("Class"), "wizard");
    expect(screen.queryByText("Guiding Bolt")).not.toBeInTheDocument();
    expect(screen.getByText("2 of 3 spells match")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("School"), "evocation");
    expect(screen.getByText("Fireball")).toBeInTheDocument();
    expect(screen.queryByText("Acid Splash")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Level"), "0");
    expect(screen.getByText(/No spells found/)).toHaveTextContent(
      "or clear the filters",
    );

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Guiding Bolt")).toBeInTheDocument();
    expect(screen.getByText("3 spells")).toBeInTheDocument();
  });

  it("hides the class and school filters when the list only has levels", async () => {
    getSpells.mockResolvedValue([{ index: "aid", name: "Aid", level: 2 }]);
    renderPage();

    expect(await screen.findByLabelText("Level")).toBeInTheDocument();
    expect(screen.queryByLabelText("Class")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("School")).not.toBeInTheDocument();
  });

  it("shows the list a page at a time", async () => {
    const manySpells = Array.from({ length: SPELLS_PAGE_SIZE + 5 }, (_, i) => ({
      index: `spell-${i}`,
      name: `Spell ${String(i).padStart(2, "0")}`,
      level: 1,
      school: evocation,
      classes: [wizard],
    }));
    getSpells.mockResolvedValue(manySpells);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Spell 00");
    expect(
      screen.queryByText(`Spell ${SPELLS_PAGE_SIZE}`),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Show 5 more (5 left)" }),
    );
    expect(
      screen.getByText(`Spell ${SPELLS_PAGE_SIZE + 4}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /more/ }),
    ).not.toBeInTheDocument();
  });
});
