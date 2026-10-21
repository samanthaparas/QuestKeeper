import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSheetSpellsTab from "./CharacterSheetSpellsTab";

vi.mock("../../utils/api", () => ({
  getSpells: vi.fn().mockResolvedValue([]),
  getSpellDetails: vi.fn(),
}));

const SPELLS = [
  { index: "shield", name: "Shield", level: 1, components: "V, S", prepared: true },
  { index: "sleep", name: "Sleep", level: 1, components: "V, S, M", prepared: false },
  { index: "fire-bolt", name: "Fire Bolt", level: 0, components: "V, S" },
  { index: "misty", name: "Misty Step", level: 2, components: "V", bonusSpell: true },
];

function renderTab(props = {}) {
  const handlers = { onPreparedToggle: vi.fn() };
  render(
    <CharacterSheetSpellsTab
      spellcasting={{
        cantripsKnown: SPELLS.filter((spell) => spell.level === 0),
        spellsKnown: SPELLS.filter((spell) => spell.level > 0),
      }}
      spellcastingAbility="intelligence"
      abilityScore={16}
      proficiencyBonus={2}
      activeSlotLevels={new Set()}
      onSpellSlotChange={vi.fn()}
      onShowSlotLevel={vi.fn()}
      onHideSlotLevel={vi.fn()}
      onSpellAdd={vi.fn()}
      onSpellUpdate={vi.fn()}
      onSpellRemove={vi.fn()}
      onSpellLockToggle={vi.fn()}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("CharacterSheetSpellsTab: prepared spells", () => {
  it("shows how many are prepared out of the limit, and toggles one", async () => {
    const handlers = renderTab({ preparedLimit: { limit: 4, ability: "intelligence" } });

    expect(screen.getByRole("status")).toHaveTextContent("Prepared spells: 1 / 4");
    expect(screen.getByRole("status")).toHaveTextContent("3 more to prepare");

    await userEvent.click(screen.getByRole("button", { name: "Sleep prepared" }));
    expect(handlers.onPreparedToggle).toHaveBeenCalledWith(expect.objectContaining({ index: "sleep" }));
    expect(screen.getByRole("button", { name: "Shield prepared" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Sleep prepared" })).toHaveAttribute("aria-pressed", "false");
  });

  it("gives cantrips and free bonus spells no toggle", () => {
    renderTab({ preparedLimit: { limit: 4, ability: "intelligence" } });
    expect(screen.queryByRole("button", { name: "Fire Bolt prepared" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Misty Step prepared" })).not.toBeInTheDocument();
  });

  it("warns, without blocking, when more are prepared than the limit", () => {
    renderTab({ preparedLimit: { limit: 0, ability: "intelligence" } });
    expect(screen.getByRole("status")).toHaveTextContent("1 over");
  });

  it("shows nothing about preparing for casters who don't prepare", () => {
    renderTab({ preparedLimit: null });
    expect(screen.queryByText(/Prepared spells/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shield prepared" })).not.toBeInTheDocument();
  });
});
