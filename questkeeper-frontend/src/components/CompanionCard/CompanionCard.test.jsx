import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
