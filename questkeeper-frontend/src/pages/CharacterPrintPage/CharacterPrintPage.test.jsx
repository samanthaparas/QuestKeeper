import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CharacterPrintPage from "./CharacterPrintPage";
import { createCharacterSheet } from "../../utils/characterSheet";
import { getCharacter } from "../../utils/characterStore";

vi.mock("../../utils/characterStore", () => ({ getCharacter: vi.fn() }));

const SHEET = createCharacterSheet({
  id: "c1",
  name: "Pippa Thornfoot",
  level: 5,
  race: { name: "Half-Elf" },
  class: { id: "wizard", name: "Wizard", spellcastingType: "prepared", spellcastingAbility: "intelligence" },
  background: { name: "Sage" },
  abilityScores: { strength: 8, dexterity: 14, constitution: 13, intelligence: 18, wisdom: 12, charisma: 10 },
  savingThrows: { intelligence: true, wisdom: true },
  skills: { arcana: true, perception: false },
  skillExpertise: { arcana: true },
  combat: { armorClass: 12, initiative: 2, speed: 30, hitPoints: { max: 28, current: 20, temporary: 0 }, hitDice: { total: 5, remaining: 5, die: "d6" } },
  equipment: [{ name: "Spellbook" }, { name: "Rations", quantity: 5 }],
  spellcasting: {
    cantripsKnown: [{ index: "light", name: "Light", level: 0 }],
    spellsKnown: [
      { index: "shield", name: "Shield", level: 1 },
      { index: "sleep", name: "Sleep", level: 1, prepared: false },
    ],
    spellSlots: [{ level: 1, max: 4, current: 3 }],
  },
  features: [{ name: "Arcane Recovery", description: "Regain some spell slots on a short rest." }],
  backstory: "Raised in a lighthouse library.",
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/characters/c1/print"]}>
      <Routes>
        <Route path="/characters/:id/print" element={<CharacterPrintPage />} />
        <Route path="/characters" element={<p>Your characters</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CharacterPrintPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCharacter.mockResolvedValue(SHEET);
  });
  afterEach(() => document.body.classList.remove("printing-sheet"));

  it("shows the character's numbers as worked out, on a sheet made for paper", async () => {
    renderPage();
    const sheet = await screen.findByRole("article", { name: "Pippa Thornfoot character sheet" });

    expect(within(sheet).getByRole("heading", { level: 1 })).toHaveTextContent("Pippa Thornfoot");
    expect(sheet).toHaveTextContent("Level 5 Half-Elf Wizard");
    // Wizard level 5, INT 18: modifier +4, proficiency +3, so Arcana (expertise) is +10 and a save is +7.
    expect(within(sheet).getByText("+10")).toBeInTheDocument();
    expect(sheet).toHaveTextContent("Save +7");
    expect(sheet).toHaveTextContent("Spell save DC15");
    // 10 + Wisdom (+1), not proficient in Perception.
    expect(sheet).toHaveTextContent("Passive Perception11");
    expect(sheet).toHaveTextContent("Rations ×5");
  });

  it("lists spells with the prepared ones marked, and the slots", async () => {
    renderPage();
    const sheet = await screen.findByRole("article");
    expect(sheet).toHaveTextContent("Cantrips: Light");
    expect(sheet).toHaveTextContent("1st: Shield ✓, Sleep");
    expect(sheet).toHaveTextContent("Spell slots: 1st □□□□");
    expect(sheet).toHaveTextContent("Prepared spells: up to 9");
  });

  it("leaves things out when unticked, and adds feature text and notes when asked", async () => {
    renderPage();
    const sheet = await screen.findByRole("article");

    expect(sheet).not.toHaveTextContent("Regain some spell slots");
    expect(sheet).not.toHaveTextContent("lighthouse library");

    await userEvent.click(screen.getByLabelText("What each feature says"));
    await userEvent.click(screen.getByLabelText("Backstory and notes"));
    expect(sheet).toHaveTextContent("Regain some spell slots on a short rest.");
    expect(sheet).toHaveTextContent("Raised in a lighthouse library.");

    await userEvent.click(screen.getByRole("checkbox", { name: "Spells" }));
    expect(sheet).not.toHaveTextContent("Cantrips: Light");
  });

  it("opens the browser's print window, and hides the rest of the site while this page is open", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const { unmount } = renderPage();
    await screen.findByRole("article");
    expect(document.body.classList.contains("printing-sheet")).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Print or save as PDF" }));
    expect(print).toHaveBeenCalled();

    unmount();
    expect(document.body.classList.contains("printing-sheet")).toBe(false);
  });

  it("names the saved file after the character while printing", async () => {
    renderPage();
    await screen.findByRole("article");
    document.title = "Page";
    window.dispatchEvent(new Event("beforeprint"));
    expect(document.title).toBe("Pippa Thornfoot - QuestKeeper");
    window.dispatchEvent(new Event("afterprint"));
    expect(document.title).toBe("Page");
  });

  it("says so when the character can't be found or loaded", async () => {
    getCharacter.mockResolvedValue(null);
    const { unmount } = renderPage();
    expect(await screen.findByText("That character couldn't be found.")).toBeInTheDocument();
    unmount();

    getCharacter.mockRejectedValue(new Error("offline"));
    renderPage();
    expect(await screen.findByText(/couldn't be loaded/)).toBeInTheDocument();
  });
});
