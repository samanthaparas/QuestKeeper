import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSheetInventoryTab from "./CharacterSheetInventoryTab";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../hooks/useSrdEquipmentLookup", () => ({
  useSrdEquipmentLookup: () => ({ findMatches: () => [], loadDetails: vi.fn() }),
}));

const EQUIPMENT = [
  { index: "i1", name: "Chain Mail", quantity: 1, proficient: true },
  { index: "i2", name: "Pouch", quantity: 1 },
  { index: "i3", name: "Helm of Teleportation", quantity: 1, attuned: true },
];

function renderTab(props = {}) {
  const handlers = {
    onEquipmentAdd: vi.fn(),
    onEquipmentUpdate: vi.fn(),
    onEquipmentRemove: vi.fn(),
    onEquipmentAttuneToggle: vi.fn(),
    onEquipmentProficientToggle: vi.fn(),
  };
  render(<CharacterSheetInventoryTab equipment={EQUIPMENT} {...handlers} {...props} />);
  return handlers;
}

describe("CharacterSheetInventoryTab", () => {
  it("puts attuned items at the top", () => {
    renderTab();

    const names = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(names[0]).toContain("Helm of Teleportation");
    expect(names[1]).toContain("Chain Mail");
    expect(names[2]).toContain("Pouch");
  });

  it("uses a P toggle for proficiency and a star for attunement", async () => {
    const handlers = renderTab();

    expect(screen.getByRole("button", { name: "Proficient with Chain Mail" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const attune = screen.getByRole("button", { name: "Attuned to Pouch" });
    expect(attune).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(attune);
    expect(handlers.onEquipmentAttuneToggle).toHaveBeenCalledWith("i2", undefined);
    await userEvent.click(screen.getByRole("button", { name: "Proficient with Pouch" }));
    expect(handlers.onEquipmentProficientToggle).toHaveBeenCalledWith("i2", undefined);
  });
});
