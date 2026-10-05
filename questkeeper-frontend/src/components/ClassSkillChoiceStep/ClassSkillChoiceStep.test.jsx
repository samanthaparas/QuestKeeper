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
});
