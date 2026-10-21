import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSummaryCard from "./CharacterSummaryCard";
import { getSpellDetails, getSpells } from "../../utils/api";

vi.mock("../../utils/api", () => ({
  getSpells: vi.fn(),
  getSpellDetails: vi.fn(),
}));

const SHEET = {
  name: "Pippa",
  level: 3,
  race: { name: "Half-Elf" },
  class: { name: "Wizard", spellcastingAbility: "intelligence" },
  abilityScores: { intelligence: 16 },
  combat: { hitPoints: { current: 10, max: 10, temporary: 0 } },
  spellcasting: {
    cantripsKnown: [{ index: "fire-bolt", name: "Fire Bolt", level: 0, components: "V, S", notes: "" }],
    spellsKnown: [
      {
        index: "shield",
        name: "Shield",
        level: 1,
        components: "V, S",
        notes: "Reaction, +5 AC until my next turn\nAlso stops Magic Missile",
      },
    ],
  },
  equipment: [
    { id: "e1", name: "Wand of Secrets", quantity: 1, description: "Pings when a hidden door is within 60 ft" },
    { id: "e2", name: "Rope", quantity: 1 },
  ],
  features: [{ id: "f1", name: "Arcane Recovery", description: "Once a day on a short rest, get slots back" }],
  feats: [],
};

// jsdom has no <dialog> pop-up of its own.
HTMLDialogElement.prototype.showModal ??= function showModal() {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function close() {
  this.removeAttribute("open");
};

describe("CharacterSummaryCard: reading a player's spells, items and features", () => {
  beforeEach(() => {
    getSpells.mockReset().mockResolvedValue([{ index: "shield", name: "Shield", level: 1 }]);
    getSpellDetails.mockReset().mockResolvedValue({
      name: "Shield",
      level: 1,
      school: { name: "Abjuration" },
      casting_time: "1 reaction",
      range: "Self",
      components: ["V", "S"],
      duration: "1 round",
      desc: ["An invisible barrier of magical force appears."],
    });
  });

  it("opens a spell to show the player's own note and its components", async () => {
    render(<CharacterSummaryCard sheet={SHEET} />);
    expect(screen.queryByRole("region", { name: "Shield details" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Shield" }));

    const panel = screen.getByRole("region", { name: "Shield details" });
    // (Rules words like AC are wrapped so they explain themselves on hover.)
    expect(panel).toHaveTextContent("Reaction, +5 AC until my next turn");
    expect(panel).toHaveTextContent("Also stops Magic Missile");
    expect(panel).toHaveTextContent("Components: V, S");
    // Nothing was fetched yet: the rules text loads only on request.
    expect(getSpells).not.toHaveBeenCalled();
  });

  it("says so when the player wrote no note on a spell", async () => {
    render(<CharacterSummaryCard sheet={SHEET} />);
    await userEvent.click(screen.getByRole("button", { name: "Fire Bolt" }));
    expect(screen.getByText("No note from the player on this spell.")).toBeInTheDocument();
  });

  it("loads the full spell text only when asked", async () => {
    render(<CharacterSummaryCard sheet={SHEET} />);
    await userEvent.click(screen.getByRole("button", { name: "Shield" }));
    await userEvent.click(screen.getByRole("button", { name: "Full spell text" }));

    expect(await screen.findByText("An invisible barrier of magical force appears.")).toBeInTheDocument();
    expect(getSpellDetails).toHaveBeenCalledWith("shield");
  });

  it("opens an item or feature to show the player's note, and leaves plain ones plain", async () => {
    render(<CharacterSummaryCard sheet={SHEET} />);

    expect(screen.getByText("Rope").closest(".character-summary__entry")).toBeNull();
    const wand = screen.getByText("Wand of Secrets").closest(".character-summary__entry");
    expect(wand).not.toBeNull();
    expect(wand).toHaveTextContent("Pings when a hidden door is within 60 ft");

    const feature = screen.getByText("Arcane Recovery").closest(".character-summary__entry");
    expect(feature).toHaveTextContent("Once a day on a short rest, get slots back");
  });
});
