import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSheetInventoryTab from "./CharacterSheetInventoryTab";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
// What the SRD item look-up says (a test can change it).
const lookup = vi.hoisted(() => ({
  value: { findMatches: () => [], loadDetails: () => {}, status: "ready", retry: () => {} },
}));
vi.mock("../../hooks/useSrdEquipmentLookup", () => ({
  useSrdEquipmentLookup: () => lookup.value,
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
  it("groups items by category, guessed from the name, under small headings", () => {
    renderTab();

    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows[0]).toBe("Armor & shields");
    expect(rows[1]).toContain("Chain Mail");
    expect(rows[2]).toBe("Worn items");
    expect(rows[3]).toContain("Helm of Teleportation");
    expect(rows[4]).toBe("Gear & tools");
    expect(rows[5]).toContain("Pouch");
  });

  it("puts attuned items at the top when sorted in the order added", async () => {
    window.localStorage.clear();
    renderTab();
    await userEvent.selectOptions(screen.getByLabelText("Sort Inventory"), "added");

    const names = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(names[0]).toContain("Helm of Teleportation");
    expect(names[1]).toContain("Chain Mail");
    expect(names[2]).toContain("Pouch");
    window.localStorage.clear();
  });

  it("uses a picked category over the guess, and filters to one category", async () => {
    window.localStorage.clear();
    renderTab({
      equipment: [
        ...EQUIPMENT,
        { index: "i4", name: "Croissant", quantity: 2 },
        { index: "i5", name: "Potion of Healing", quantity: 3 },
        { index: "i6", name: "Silver locket", quantity: 1 },
        { index: "i7", name: "Lucky rock", quantity: 1, category: "treasure" },
      ],
    });
    await userEvent.selectOptions(screen.getByLabelText("Show Inventory"), "category:consumables");
    let rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows[0]).toBe("Consumables");
    expect(rows.slice(1).map((row) => row.split(" x")[0])).toEqual(["Croissant", "Potion of Healing"]);
    expect(screen.getByText("2 of 7")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Show Inventory"), "category:treasure");
    rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toEqual(["Treasure & keepsakes", expect.stringContaining("Lucky rock"), expect.stringContaining("Silver locket")]);
    window.localStorage.clear();
  });

  it("keeps the pencil and trash buttons behind an Edit button", async () => {
    renderTab();

    expect(screen.queryByRole("button", { name: "Edit Pouch" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("button", { name: "Edit Pouch" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Pouch" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("button", { name: "Remove Pouch" })).not.toBeInTheDocument();
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

  it("says so when the item details can't be looked up, with a way to try again", async () => {
    const retry = vi.fn();
    lookup.value = { findMatches: () => [], loadDetails: () => {}, status: "failed", retry };
    renderTab();

    expect(screen.getByRole("status")).toHaveTextContent("Couldn't look up item details right now");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });

  it("stays quiet when the look-up worked", () => {
    lookup.value = { findMatches: () => [], loadDetails: () => {}, status: "ready", retry: () => {} };
    renderTab();
    expect(screen.queryByText(/Couldn't look up item details/)).not.toBeInTheDocument();
  });
});
