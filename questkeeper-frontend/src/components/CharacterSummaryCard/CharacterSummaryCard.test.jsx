import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
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
    // Only the short reading is fetched; the full rules text waits for the button.
    expect(await screen.findByText("An invisible barrier of magical force appears.")).toBeInTheDocument();
    expect(getSpellDetails).toHaveBeenCalledTimes(1);
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

    // The short reading in the box, and the full text in the dialog.
    expect(await screen.findAllByText("An invisible barrier of magical force appears.")).toHaveLength(2);
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

  it("flags a character that uses something the table doesn't allow, and says nothing otherwise", async () => {
    const { rerender } = render(<CharacterSummaryCard sheet={SHEET} />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();

    rerender(<CharacterSummaryCard sheet={SHEET} bannedChoices={[{ kind: "spell", label: "spell", name: "Shield" }]} />);
    // The warning sits in the Attacks and spells header and opens with its button.
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /review flagged choices/ }));
    expect(screen.getByRole("note")).toHaveTextContent("⚠ Uses options not allowed at this table: Shield (spell)");
  });
});

describe("CharacterSummaryCard: the overview layout", () => {
  // jsdom doesn't know :focus-visible; say that whatever has the keyboard shows it.
  const realMatches = Element.prototype.matches;
  beforeAll(() => {
    Element.prototype.matches = function matches(selector) {
      return selector === ":focus-visible" ? this === document.activeElement : realMatches.call(this, selector);
    };
  });
  afterAll(() => {
    Element.prototype.matches = realMatches;
  });

  const FULL = {
    ...SHEET,
    race: { name: "Dragonborn" },
    background: { name: "Acolyte" },
    skills: { acrobatics: true },
    savingThrows: { dexterity: true },
    abilityScores: { strength: 10, dexterity: 16, constitution: 14, intelligence: 16, wisdom: 12, charisma: 10 },
    languages: "Common, Draconic",
    combat: { hitPoints: { current: 22, max: 24, temporary: 3 }, armorClass: 12, speed: 30, initiative: 3 },
    conditions: [{ key: "poisoned" }],
    concentration: { spell: "Bless", rounds: 8 },
    attacks: [{ name: "Dagger", toHit: 5, damage: "1d4+3", damageType: "piercing", notes: "Melee Weapon · Finesse, Light, Thrown (20/60)\nKept in my boot" }],
  };

  it("shows who they are, their numbers and their status in the header", () => {
    render(<CharacterSummaryCard sheet={FULL} />);
    expect(screen.getByText("Level 3 · Dragonborn · Wizard · Acolyte")).toBeInTheDocument();
    expect(screen.getByText("22/24", { exact: false })).toHaveTextContent("+3 temp");
    expect(screen.getByRole("img", { name: "Armor class 12" })).toBeInTheDocument();
    expect(screen.getByText("30 ft")).toBeInTheDocument();
    expect(screen.getByText("Initiative").parentElement).toHaveTextContent("+3");
    expect(screen.getByText("Poisoned")).toBeInTheDocument();
    expect(screen.getByText(/Concentrating: Bless/)).toBeInTheDocument();
  });

  it("lists all eighteen skills and the six saves, marking what they're proficient in", () => {
    render(<CharacterSummaryCard sheet={FULL} />);
    const skills = screen.getByRole("region", { name: "Skills and saves" });
    expect(within(skills).getAllByRole("listitem")).toHaveLength(18 + 6);
    // Dex 16 (+3) with proficiency +2 at level 3.
    expect(screen.getByText("Acrobatics").closest("li")).toHaveTextContent("+5");
    expect(screen.getByText("Acrobatics").closest("li")).toHaveTextContent("(proficient)");
    expect(screen.getByText("Athletics").closest("li")).toHaveTextContent("+0");
    expect(within(screen.getByRole("list", { name: "Saving throws" })).getByText(/DEX/).closest("li")).toHaveTextContent("+5");
  });

  it("shows passive scores with languages and senses under them", () => {
    render(<CharacterSummaryCard sheet={FULL} />);
    const box = screen.getByRole("region", { name: "Passive scores, languages and senses" });
    expect(within(box).getByText("Perception").closest("li")).toHaveTextContent("11");
    expect(within(box).getByText("Investigation").closest("li")).toHaveTextContent("13");
    expect(within(box).getByText("Common, Draconic")).toBeInTheDocument();
  });

  it("reads an attack on hover or focus, with the player's note, and keeps it open on click", async () => {
    render(<CharacterSummaryCard sheet={FULL} />);
    const attack = screen.getByRole("button", { name: /Dagger/ });
    expect(attack).toHaveTextContent("+5");
    expect(attack).toHaveTextContent("1d4+3");

    await userEvent.hover(attack);
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Kept in my boot");
    expect(tip).toHaveTextContent("Melee Weapon");
    await userEvent.unhover(attack);
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());

    await userEvent.click(attack);
    await userEvent.unhover(attack);
    expect(screen.getByRole("region", { name: "Dagger details" })).toHaveTextContent("Kept in my boot");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Dagger details" })).not.toBeInTheDocument();
  });

  it("lets the pointer move from a spell into its box without closing it", async () => {
    render(<CharacterSummaryCard sheet={FULL} />);
    const spell = screen.getByRole("button", { name: "Shield" });
    await userEvent.hover(spell);
    const box = screen.getByRole("tooltip");
    await userEvent.unhover(spell);
    await userEvent.hover(box);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    // Leaving the box for good does close it.
    await userEvent.unhover(box);
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("reaches Full spell text from the keyboard, and Escape closes the box and returns to the spell", async () => {
    render(<CharacterSummaryCard sheet={FULL} />);
    const spell = screen.getByRole("button", { name: "Shield" });
    // Tab until the spell has the keyboard (the page has other buttons before it).
    for (let i = 0; i < 20 && document.activeElement !== spell; i += 1) await userEvent.tab();
    expect(spell).toHaveFocus();
    // The earlier spell's box closes as the keyboard leaves it; this one's stays.
    const readingBoxes = () => document.querySelectorAll(".character-summary__peek");
    await waitFor(() => expect(readingBoxes()).toHaveLength(1));

    // Tab goes into the box (past any rule-word buttons in the player's note) to Full spell text.
    const fullText = screen.getByRole("button", { name: "Full spell text" });
    for (let i = 0; i < 6 && document.activeElement !== fullText; i += 1) await userEvent.tab();
    expect(fullText).toHaveFocus();
    // The box stays while the keyboard is inside it.
    expect(readingBoxes()).toHaveLength(1);

    await userEvent.keyboard("{Escape}");
    expect(readingBoxes()).toHaveLength(0);
    expect(spell).toHaveFocus();
  });

  it("keeps the rules text and the player's note apart, and fetches the full text only on request", async () => {
    render(<CharacterSummaryCard sheet={FULL} />);
    await userEvent.click(screen.getByRole("button", { name: "Shield" }));
    const box = screen.getByRole("region", { name: "Shield details" });
    expect(within(box).getByText("Rules (SRD)")).toBeInTheDocument();
    expect(within(box).getByText("Player's note")).toBeInTheDocument();
    expect(await within(box).findByText("An invisible barrier of magical force appears.")).toBeInTheDocument();
    // Only the short reading so far (and it is kept for next time): the full text is one request later.
    const before = getSpellDetails.mock.calls.length;
    await userEvent.click(within(box).getByRole("button", { name: "Full spell text" }));
    await waitFor(() => expect(getSpellDetails.mock.calls.length).toBe(before + 1));
  });

  it("draws weapon icons from the app's own pictures, and leaves them out of the reading order", () => {
    const sheet = { ...FULL, attacks: [FULL.attacks[0], { name: "Shortbow", toHit: 5, damage: "1d6+3", notes: "Ranged Weapon · Ammunition (80/320)" }] };
    const { container } = render(<CharacterSummaryCard sheet={sheet} />);
    const icons = container.querySelectorAll(".character-summary__attack-icon");
    expect(icons).toHaveLength(2);
    icons.forEach((icon) => expect(icon).toHaveAttribute("alt", ""));
    expect(icons[0].getAttribute("src")).not.toEqual(icons[1].getAttribute("src"));
  });

  it("has no scrolling box of its own: attacks and spells sit in the page flow", () => {
    const { container } = render(<CharacterSummaryCard sheet={FULL} />);
    expect(container.querySelector(".character-summary__panel-scroll")).toBeNull();
    expect(container.querySelector(".character-summary__attacks [tabindex]")).toBeNull();
  });

  it("keeps the other sections folded, with Companions first", () => {
    render(<CharacterSummaryCard sheet={FULL} />);
    const folds = ["Companions", "Inventory", "Features, feats and resources", "Story and notes"];
    folds.forEach((name) => expect(screen.getByText(name).closest("details")).not.toHaveAttribute("open"));
  });
});
