import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AbilityScoreStep from "./AbilityScoreStep";

const hillDwarf = {
  name: "Hill Dwarf",
  abilityScoreIncreases: { constitution: 2, wisdom: 1 },
};
const human = {
  name: "Human",
  abilityScoreIncreases: {
    strength: 1,
    dexterity: 1,
    constitution: 1,
    intelligence: 1,
    wisdom: 1,
    charisma: 1,
  },
};

// The balanced set, one value per ability.
const BALANCED = {
  Strength: "8",
  Dexterity: "15",
  Constitution: "14",
  Intelligence: "10",
  Wisdom: "13",
  Charisma: "12",
};

async function assignBalancedSet(user) {
  for (const [ability, value] of Object.entries(BALANCED)) {
    await user.selectOptions(screen.getByLabelText(`${ability} score`), value);
  }
}

function setup(race) {
  const onNext = vi.fn();
  render(<AbilityScoreStep race={race} onNext={onNext} onBack={vi.fn()} />);
  return { onNext, user: userEvent.setup() };
}

describe("AbilityScoreStep racial bonuses", () => {
  it("uses the race's own bonuses by default", async () => {
    const { onNext, user } = setup(hillDwarf);

    expect(
      screen.getByLabelText(/Use Hill Dwarf's bonuses \(\+2 CON, \+1 WIS\)/),
    ).toBeChecked();
    await assignBalancedSet(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ constitution: 16, wisdom: 14, dexterity: 15 }),
      expect.objectContaining({ bonusMode: "race" }),
    );
  });

  it("lets the player put the +2 and +1 on any two different abilities", async () => {
    const { onNext, user } = setup(hillDwarf);

    await assignBalancedSet(user);
    await user.click(screen.getByLabelText("Choose where they go"));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    await user.selectOptions(
      screen.getByLabelText("Ability for bonus 1 (+2)"),
      "dexterity",
    );
    const secondBonus = screen.getByLabelText("Ability for bonus 2 (+1)");
    expect(
      within(secondBonus).getByRole("option", { name: "Dexterity" }),
    ).toBeDisabled();
    await user.selectOptions(secondBonus, "charisma");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({
        dexterity: 17,
        charisma: 13,
        constitution: 14,
        wisdom: 13,
      }),
      expect.objectContaining({
        bonusMode: "custom",
        customBonuses: ["dexterity", "charisma"],
      }),
    );
  });

  it("shows the real bonus next to each ability", async () => {
    const { user } = setup(hillDwarf);

    await assignBalancedSet(user);
    await user.click(screen.getByLabelText("Choose where they go"));
    await user.selectOptions(
      screen.getByLabelText("Ability for bonus 1 (+2)"),
      "dexterity",
    );

    expect(screen.getByText("+2 race")).toBeInTheDocument();
    expect(screen.getByText("17 (+3)")).toBeInTheDocument();
  });

  it("doesn't offer the choice to a race that already raises every ability", () => {
    setup(human);

    expect(screen.queryByText("Choose where they go")).not.toBeInTheDocument();
  });
});
