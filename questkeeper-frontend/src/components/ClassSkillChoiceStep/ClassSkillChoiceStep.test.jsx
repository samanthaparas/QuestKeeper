import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClassSkillChoiceStep from "./ClassSkillChoiceStep";

const fighter = {
  name: "Fighter",
  skillChoice: {
    choose: 2,
    options: [
      { index: "athletics", name: "Athletics" },
      { index: "history", name: "History" },
      { index: "insight", name: "Insight" },
    ],
  },
};

function renderStep(props = {}) {
  render(
    <ClassSkillChoiceStep
      characterClass={fighter}
      grantedSkills={[{ index: "insight", name: "Insight" }]}
      grantedFrom="Acolyte"
      onNext={vi.fn()}
      onBack={vi.fn()}
      {...props}
    />,
  );
}

describe("ClassSkillChoiceStep", () => {
  it("counts your picks and says what to do at the limit", async () => {
    renderStep();

    expect(screen.getByText("Chosen 0 of 2")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /Athletics/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /History/ }));

    expect(screen.getByText(/Chosen 2 of 2/)).toHaveTextContent(
      "Untick one to pick a different skill",
    );
  });

  it("marks a skill the background already gave you as locked and explains why", () => {
    renderStep();

    const insight = screen.getByRole("checkbox", { name: /Insight/ });
    expect(insight).toBeDisabled();
    expect(insight.closest("label")).toHaveClass(
      "class-skill-choice-step__checkbox--locked",
    );
    expect(screen.getByText("Already from Acolyte")).toBeInTheDocument();
  });

  it("locks the remaining skills once you have picked enough", async () => {
    renderStep({ grantedSkills: [] });

    await userEvent.click(screen.getByRole("checkbox", { name: /Athletics/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /History/ }));

    const insight = screen.getByRole("checkbox", { name: /Insight/ });
    expect(insight).toBeDisabled();
    expect(insight.closest("label")).toHaveClass(
      "class-skill-choice-step__checkbox--locked",
    );
  });

  describe("with a background skill pick", () => {
    const innkeeperChoice = {
      from: "Innkeeper",
      choose: 1,
      options: [
        { index: "history", name: "History" },
        { index: "persuasion", name: "Persuasion" },
      ],
    };

    it("waits for both picks and sends the background one separately", async () => {
      const onNext = vi.fn();
      renderStep({ grantedSkills: [], backgroundChoice: innkeeperChoice, onNext });

      expect(screen.getByText(/Innkeeper lets you choose 1 skill/)).toBeInTheDocument();

      // The background list comes first, so its History box is the first one.
      const [backgroundHistory] = screen.getAllByRole("checkbox", { name: /History/ });
      await userEvent.click(backgroundHistory);
      await userEvent.click(screen.getByRole("checkbox", { name: /Athletics/ }));
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

      await userEvent.click(screen.getByRole("checkbox", { name: /Insight/ }));
      await userEvent.click(screen.getByRole("button", { name: "Next" }));

      expect(onNext).toHaveBeenCalledWith(
        [
          { index: "athletics", name: "Athletics" },
          { index: "insight", name: "Insight" },
        ],
        [{ index: "history", name: "History" }],
        {},
        {},
      );
    });

    it("locks a skill in the class list once the background picked it", async () => {
      renderStep({ grantedSkills: [], backgroundChoice: innkeeperChoice });

      const [backgroundHistory, classHistory] = screen.getAllByRole("checkbox", {
        name: /History/,
      });
      await userEvent.click(backgroundHistory);

      expect(classHistory).toBeDisabled();
      expect(screen.getByText("Already from Innkeeper")).toBeInTheDocument();
    });
  });

  describe("racial skill choices (Half-Elf Skill Versatility)", () => {
    const versatility = {
      id: "trait:skill-versatility",
      from: "Half-Elf (Skill Versatility)",
      choose: 2,
      options: [
        { index: "athletics", name: "Athletics" },
        { index: "insight", name: "Insight" },
        { index: "persuasion", name: "Persuasion" },
      ],
    };

    it("asks for the racial picks with their own counter and source", () => {
      renderStep({ extraChoices: [versatility] });

      expect(screen.getByText(/Half-Elf \(Skill Versatility\) lets you choose 2 skills/)).toBeInTheDocument();
      expect(screen.getAllByText("Chosen 0 of 2")).toHaveLength(2);
      expect(screen.getByText(/You already have: Insight \(Acolyte\)/)).toBeInTheDocument();
    });

    it("never lets the same skill be picked twice, and sends the racial picks", async () => {
      const onNext = vi.fn();
      renderStep({ extraChoices: [versatility], onNext });

      const [raceAthletics, classAthletics] = screen.getAllByRole("checkbox", { name: /Athletics/ });
      await userEvent.click(raceAthletics);
      expect(classAthletics).toBeDisabled();
      // Insight comes from the background, so the race can't pick it either.
      expect(screen.getAllByRole("checkbox", { name: /Insight/ })[0]).toBeDisabled();

      await userEvent.click(screen.getByRole("checkbox", { name: /Persuasion/ }));
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
      await userEvent.click(screen.getByRole("checkbox", { name: /History/ }));
      expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
      // The Fighter still needs a second skill; Athletics and Insight are taken.
      expect(screen.getAllByRole("checkbox", { name: /Insight/ })[1]).toBeDisabled();
    });

    it("finishes once every choice is made", async () => {
      const onNext = vi.fn();
      renderStep({
        extraChoices: [{ ...versatility, choose: 1 }],
        characterClass: { ...fighter, skillChoice: { ...fighter.skillChoice, choose: 1 } },
        onNext,
      });

      await userEvent.click(screen.getByRole("checkbox", { name: /Persuasion/ }));
      await userEvent.click(screen.getAllByRole("checkbox", { name: /History/ })[0]);
      await userEvent.click(screen.getByRole("button", { name: "Next" }));

      expect(onNext).toHaveBeenCalledWith(
        [{ index: "history", name: "History" }],
        [],
        { "trait:skill-versatility": [{ index: "persuasion", name: "Persuasion" }] },
        {},
      );
    });
  });

  describe("language choices", () => {
    it("offers languages they don't speak yet, and doesn't require them", async () => {
      const onNext = vi.fn();
      renderStep({
        characterClass: { name: "Rogue", skillChoice: null },
        languageChoices: [{ id: "race", from: "Half-Elf", choose: 1, options: ["Common", "Dwarvish", "Orc"] }],
        knownLanguages: ["Common", "Elvish"],
        onNext,
      });

      const select = screen.getByLabelText("Half-Elf language 1");
      expect([...select.options].map((option) => option.textContent)).toEqual([
        "Choose a language…",
        "Dwarvish",
        "Orc",
      ]);
      expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

      await userEvent.selectOptions(select, "Orc");
      await userEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(onNext).toHaveBeenCalledWith([], [], {}, { race: ["Orc"] });
    });
  });
});
