import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClassSpellChoiceStep from "./ClassSpellChoiceStep";

vi.mock("../../utils/api", () => ({
  getClassSpells: vi.fn().mockResolvedValue([
    { index: "fire-bolt", name: "Fire Bolt", level: 0 },
    { index: "light", name: "Light", level: 0 },
    { index: "magic-missile", name: "Magic Missile", level: 1 },
    { index: "sleep", name: "Sleep", level: 1 },
  ]),
  getClassLevel: vi.fn().mockResolvedValue({
    spellcasting: { cantrips_known: 1, spell_slots_level_1: 2 },
  }),
  getSpellDetails: vi.fn(),
}));

const wizard = { id: "wizard", name: "Wizard", spellcastingType: "prepared" };

describe("ClassSpellChoiceStep", () => {
  it("shows what each cantrip and spell does while you choose", async () => {
    render(
      <ClassSpellChoiceStep
        characterClass={wizard}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Ranged fire attack/)).toBeInTheDocument();
    expect(screen.getByText(/Three darts that never miss/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Read more" }).length,
    ).toBeGreaterThan(1);
  });

  it("still limits the choice to the number allowed", async () => {
    render(
      <ClassSpellChoiceStep
        characterClass={wizard}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    await userEvent.click(
      await screen.findByRole("checkbox", { name: /Fire Bolt/ }),
    );

    expect(screen.getByRole("checkbox", { name: /Light/ })).toBeDisabled();
  });

  it("marks a cantrip the character already knows from their race", async () => {
    render(
      <ClassSpellChoiceStep
        characterClass={wizard}
        knownCantrip={{ index: "light" }}
        knownCantripSource="High Elf"
        onNext={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("Already known from High Elf"),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Light/ })).toBeDisabled();
  });
});
