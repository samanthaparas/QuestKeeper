import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompanionCard from "./CompanionCard";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

const wolf = {
  name: "Victory",
  armorClass: 13,
  speed: 40,
  hitPoints: { current: 11, max: 11 },
  attacks: [{ id: "a1", name: "Bite", toHit: 4, damage: "2d4+2", damageType: "Piercing" }],
};

function renderCard(props = {}) {
  const handlers = {
    onHpChange: vi.fn(),
    onAttackAdd: vi.fn(),
    onAttackUpdate: vi.fn(),
    onAttackRemove: vi.fn(),
    onFieldChange: vi.fn(),
    onAbilityChange: vi.fn(),
    onSaveChange: vi.fn(),
    onNotesChange: vi.fn(),
  };
  render(<CompanionCard companion={wolf} {...handlers} {...props} />);
  return handlers;
}

describe("CompanionCard", () => {
  it("shows the companion's HP, AC, speed and attacks", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: "🐾 Victory" })).toBeInTheDocument();
    expect(screen.getByLabelText("Victory's current HP")).toHaveValue(11);
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("40 ft")).toBeInTheDocument();
    expect(screen.getByText("Bite")).toBeInTheDocument();
    expect(screen.getByText("+4")).toBeInTheDocument();
  });

  it("tracks HP", async () => {
    const { onHpChange } = renderCard();
    // The page owns the value, so each keystroke reports the box's new text.
    await userEvent.type(screen.getByLabelText("Victory's current HP"), "{backspace}");
    expect(onHpChange).toHaveBeenLastCalledWith("current", "1");
  });

  it("adds an attack", async () => {
    const { onAttackAdd } = renderCard({ companion: { ...wolf, attacks: [] } });
    expect(screen.getByText(/Add Victory's attacks/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add Attack" }));
    await userEvent.type(screen.getByPlaceholderText("Attack (e.g. Bite)"), "Bite");
    await userEvent.type(screen.getByPlaceholderText("To Hit"), "4");
    await userEvent.type(screen.getByPlaceholderText("Damage (e.g. 2d4+2)"), "2d4+2");
    await userEvent.click(screen.getAllByRole("button", { name: "Add Attack" }).at(-1));

    expect(onAttackAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Bite", damage: "2d4+2" }));
  });

  it("offers a picture upload beside the name, and drops the paw once there's a picture", () => {
    const upload = { userId: "u1", characterId: "c1", onPortraitUpload: vi.fn() };
    renderCard(upload);
    expect(screen.getByRole("button", { name: "Upload a picture of Victory" })).toBeInTheDocument();

    renderCard({ ...upload, companion: { ...wolf, portraitUrl: "https://example.com/v.png" } });
    expect(screen.getByRole("button", { name: "Change Victory's picture" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Victory" })).toBeInTheDocument();
  });

  it("shows the six ability scores with their modifiers, using 10 for any not set yet", () => {
    renderCard({ companion: { ...wolf, abilityScores: { strength: 18, dexterity: 7 } } });
    const strip = screen.getByRole("list", { name: "Victory's ability scores" });
    const items = within(strip).getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual([
      "STR18+4Save +4",
      "DEX7-2Save -2",
      "CON10+0Save +0",
      "INT10+0Save +0",
      "WIS10+0Save +0",
      "CHA10+0Save +0",
    ]);
  });

  it("locks the stats until Edit stats is tapped, then lets them be typed", async () => {
    const user = userEvent.setup();
    const { onAbilityChange, onFieldChange } = renderCard();
    expect(screen.queryByLabelText("Victory's STR score")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "🔒 Edit stats" }));
    await user.type(screen.getByLabelText("Victory's STR score"), "8");
    expect(onAbilityChange).toHaveBeenLastCalledWith("strength", "108");
    await user.type(screen.getByLabelText("Victory's AC"), "4");
    expect(onFieldChange).toHaveBeenLastCalledWith("armorClass", "134");

    // A companion stays on its sheet: there's no way to remove it.
    expect(screen.queryByRole("button", { name: /Remove Victory/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "🔓 Done editing" }));
    expect(screen.queryByLabelText("Victory's STR score")).not.toBeInTheDocument();
  });

  it("adds and removes bulleted notes", async () => {
    const user = userEvent.setup();
    const notes = [{ id: "n1", text: "Wears barding" }];
    const { onNotesChange } = renderCard({ notes });
    expect(screen.getByText("Wears barding")).toBeInTheDocument();

    await user.type(screen.getByLabelText("New note about Victory"), "Flies 90 ft{Enter}");
    expect(onNotesChange).toHaveBeenLastCalledWith([
      notes[0],
      expect.objectContaining({ text: "Flies 90 ft" }),
    ]);

    // Removing waits for "Edit stats", like the other lists' Edit buttons.
    expect(screen.queryByRole("button", { name: "Remove note: Wears barding" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Edit stats/ }));
    await user.click(screen.getByRole("button", { name: "Remove note: Wears barding" }));
    expect(onNotesChange).toHaveBeenLastCalledWith([]);
  });

  it("shows a typed save bonus, and lets it be typed or cleared while editing", async () => {
    const user = userEvent.setup();
    const { onSaveChange } = renderCard({ companion: { ...wolf, savingThrows: { dexterity: 5 } } });
    expect(screen.getByText("Save +5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "🔒 Edit stats" }));
    const dexSave = screen.getByLabelText("Victory's DEX save bonus");
    expect(dexSave).toHaveValue(5);
    await user.clear(dexSave);
    expect(onSaveChange).toHaveBeenLastCalledWith("dexterity", "");
    await user.type(screen.getByLabelText("Victory's WIS save bonus"), "3");
    expect(onSaveChange).toHaveBeenLastCalledWith("wisdom", "3");
  });
});
