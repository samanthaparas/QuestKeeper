import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The wizard can open the homebrew pop-up, which loads the Supabase client.
// CI has no Supabase settings, so give it a stand-in.
vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

// Fake API answers: a Rogue with the SRD Thief and Tome of Heroes' Cat Burglar.
vi.mock("../../utils/api", () => ({
  getFeats: vi.fn().mockResolvedValue([]),
  getFeatDetails: vi.fn(),
  getClassSpells: vi.fn().mockResolvedValue([]),
  getSpellDetails: vi.fn(),
  getClassDetails: vi.fn().mockResolvedValue({
    index: "rogue",
    subclasses: [
      { index: "thief", name: "Thief", source: "SRD 5.1" },
      { index: "toh_cat-burglar", name: "Cat Burglar", source: "Tome of Heroes" },
      {
        index: "book_rogue-swashbuckler",
        name: "Swashbuckler",
        source: "Xanathar's Guide to Everything",
        sourceGroup: "Official books",
      },
    ],
  }),
  getSubclassDetails: vi.fn((index) =>
    Promise.resolve(
      index === "book_rogue-swashbuckler"
        ? {
            index,
            name: "Swashbuckler",
            is_book_entry: true,
            book: "Xanathar's Guide to Everything",
            source: "Xanathar's Guide to Everything",
            summary: "A dashing duelist.",
            link_url: "https://dnd5e.wikidot.com/rogue:swashbuckler",
            class: { index: "rogue", name: "Rogue" },
            can_make_homebrew: true,
          }
        : index === "thief"
        ? { index, name: "Thief", source: "SRD 5.1", subclass_flavor: "Roguish Archetype", desc: ["Steal things."] }
        : {
            index,
            name: "Cat Burglar",
            source: "Tome of Heroes",
            subclass_flavor: "Roguish Archetype",
            desc: ["Climb in through windows."],
          },
    ),
  ),
  getSubclassFeatures: vi.fn((index) =>
    Promise.resolve(
      index === "thief"
        ? [{ index: "fast-hands", name: "Fast Hands" }]
        : [
            { index: "toh_cat-burglar.dodger", name: "Artful Dodger", level: 3 },
            { index: "toh_cat-burglar.eye", name: "Cat's Eye", level: 9 },
          ],
    ),
  ),
}));

import { MemoryRouter } from "react-router-dom";
import LevelUpWizard from "./LevelUpWizard";

// A level 2 Rogue, so the next level (3) includes the subclass step.
const rogue = {
  name: "Vex",
  level: 2,
  class: { id: "rogue", name: "Rogue", hitDie: 8 },
  abilityScores: {
    strength: 10,
    dexterity: 16,
    constitution: 12,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  },
  combat: {
    hitPoints: { max: 15, current: 15, temporary: 0 },
    hitDice: { total: 2, remaining: 2, die: 8 },
    hpHistory: [],
  },
};

async function reachSubclassStep() {
  render(
    <MemoryRouter>
      <LevelUpWizard sheet={rogue} onComplete={vi.fn()} onCancel={vi.fn()} />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("button", { name: /Take Average/ }));
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
}

describe("LevelUpWizard subclass step", () => {
  it("lists every subclass with its source", async () => {
    await reachSubclassStep();

    expect(await screen.findByRole("radio", { name: /Thief/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Cat Burglar/ })).toBeInTheDocument();
    expect(screen.getByText("Tome of Heroes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose a subclass" })).toBeDisabled();
  });

  it("shows the picked subclass's description and features by level", async () => {
    await reachSubclassStep();
    await userEvent.click(await screen.findByRole("radio", { name: /Cat Burglar/ }));

    expect(await screen.findByText("Climb in through windows.")).toBeInTheDocument();
    expect(screen.getByText("Artful Dodger (level 3)")).toBeInTheDocument();
    expect(screen.getByText("Cat's Eye (level 9)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose Cat Burglar" })).toBeEnabled();
  });

  it("switches details when a different subclass is picked", async () => {
    await reachSubclassStep();
    await userEvent.click(await screen.findByRole("radio", { name: /Cat Burglar/ }));
    await screen.findByText("Climb in through windows.");

    await userEvent.click(screen.getByRole("radio", { name: /Thief/ }));

    expect(await screen.findByText("Steal things.")).toBeInTheDocument();
    expect(screen.queryByText("Climb in through windows.")).not.toBeInTheDocument();
    expect(screen.getByText("Fast Hands")).toBeInTheDocument();
  });

  it("offers 'Make it as homebrew' instead of Choose for a book subclass", async () => {
    await reachSubclassStep();
    await userEvent.click(await screen.findByRole("radio", { name: /Swashbuckler/ }));

    expect(await screen.findByText("A dashing duelist.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make it as homebrew" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Choose / })).not.toBeInTheDocument();
  });
});
