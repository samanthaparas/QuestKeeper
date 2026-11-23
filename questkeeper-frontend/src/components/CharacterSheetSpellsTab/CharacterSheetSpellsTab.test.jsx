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
  { index: "bless", name: "Bless", level: 1, components: "V, S, M", prepared: false, concentration: true },
  { index: "haste", name: "Haste", level: 3, components: "V, S, M", prepared: false, concentration: true },
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

  describe("concentration spells", () => {
    it("starts concentrating in one tap when nothing is held", async () => {
      const onConcentrate = vi.fn();
      renderTab({ concentratingOn: "", onConcentrate });
      await userEvent.click(screen.getByRole("button", { name: "Concentrate on Bless" }));
      expect(onConcentrate).toHaveBeenCalledWith("Bless");
    });

    it("asks before ending the spell you're already holding, and Keep leaves it alone", async () => {
      const onConcentrate = vi.fn();
      renderTab({ concentratingOn: "Bless", onConcentrate });

      await userEvent.click(screen.getByRole("button", { name: "Concentrate on Haste" }));
      expect(onConcentrate).not.toHaveBeenCalled();
      expect(screen.getByRole("group", { name: "Switch concentration to Haste?" })).toHaveTextContent(
        "You're concentrating on Bless. Casting Haste ends it.",
      );

      await userEvent.click(screen.getByRole("button", { name: "Keep Bless" }));
      expect(onConcentrate).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Concentrate on Haste" }));
      await userEvent.click(screen.getByRole("button", { name: "Switch to Haste" }));
      expect(onConcentrate).toHaveBeenCalledWith("Haste");
    });

    it("shows a quiet tag, not a button, on the spell already held", () => {
      renderTab({ concentratingOn: "bless", onConcentrate: vi.fn() });
      expect(screen.queryByRole("button", { name: "Concentrate on Bless" })).not.toBeInTheDocument();
      expect(screen.getByText("🎯 Concentrating")).toBeInTheDocument();
    });

    it("has no button on spells that don't need concentration", () => {
      renderTab({ onConcentrate: vi.fn() });
      expect(screen.queryByRole("button", { name: "Concentrate on Shield" })).not.toBeInTheDocument();
    });
  });
});

describe("CharacterSheetSpellsTab: favourite spells", () => {
  it("pins a starred spell above the level groups, and stars on tap", async () => {
    const onFavoriteToggle = vi.fn();
    renderTab({
      onFavoriteToggle,
      spellcasting: {
        cantripsKnown: SPELLS.filter((spell) => spell.level === 0),
        spellsKnown: SPELLS.filter((spell) => spell.level > 0).map((spell) =>
          spell.index === "haste" ? { ...spell, favorite: true } : spell,
        ),
      },
    });

    // The first group heading (the Show menu has a "♥ Favourites" choice too).
    const favourites = document.querySelector(".character-sheet__list-group");
    expect(favourites).toHaveTextContent("♥ Favourites");
    const haste = screen.getByRole("button", { name: "Favourite Haste" });
    const fireBolt = screen.getByRole("button", { name: "Favourite Fire Bolt" });
    // Haste (level 3) now comes before the cantrips.
    expect(favourites.compareDocumentPosition(haste) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(haste.compareDocumentPosition(fireBolt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(haste).toHaveAttribute("aria-pressed", "true");
    // The heart is a drawing shared with the inventory: filled when pinned,
    // an outline when not, hidden from screen readers (the button is named).
    expect(haste.querySelector('svg[data-icon="favorite"]')).toHaveAttribute("data-filled", "true");
    expect(fireBolt.querySelector('svg[data-icon="favorite"]')).not.toHaveAttribute("data-filled");
    expect(fireBolt.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    await userEvent.click(fireBolt);
    expect(onFavoriteToggle).toHaveBeenCalledWith(expect.objectContaining({ index: "fire-bolt" }));
  });
});

// The inventory moved its Edit and Delete under each item's Manage; the
// Spells list keeps its own "Edit spells" mode with pencil and trash.
describe("CharacterSheetSpellsTab: its own Edit mode is unchanged", () => {
  it("shows pencil and trash only after Edit spells, and has no Manage", async () => {
    renderTab({ onSpellUpdate: vi.fn(), onSpellRemove: vi.fn(), onSpellAdd: vi.fn() });
    expect(screen.queryByRole("button", { name: /^Manage / })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Edit Fire Bolt$/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Edit spells" }));
    expect(screen.getByRole("button", { name: /^Edit Fire Bolt$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Remove Fire Bolt$/ })).toBeInTheDocument();
  });
});
