import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RollDock from "./RollDock";
import { RollContext } from "./rollContext";

function renderDock(overrides = {}) {
  const roller = {
    mode: "normal",
    setMode: vi.fn(),
    lastRoll: null,
    dismiss: vi.fn(),
    tableName: null,
    share: false,
    setShare: vi.fn(),
    realDice: false,
    setRealDice: vi.fn(),
    pending: null,
    submitRealDice: vi.fn().mockReturnValue(null),
    cancelRealDice: vi.fn(),
    ...overrides,
  };
  render(
    <RollContext.Provider value={roller}>
      <RollDock />
    </RollContext.Provider>,
  );
  return roller;
}

describe("RollDock: real dice", () => {
  it("switches between the app rolling and real dice", async () => {
    const roller = renderDock();

    await userEvent.click(screen.getByRole("radio", { name: "I roll real dice" }));
    expect(roller.setRealDice).toHaveBeenCalledWith(true);

    expect(screen.getByRole("radio", { name: "App rolls" })).toBeChecked();
  });

  it("explains the dice in plain words", () => {
    renderDock();
    expect(screen.getByText("New to dice? What does this mean?")).toBeInTheDocument();
    expect(screen.getByText(/20-sided die/)).toBeInTheDocument();
  });

  it("asks for one d20 on a check and hands over what was typed", async () => {
    const roller = renderDock({ realDice: true, pending: { type: "check", label: "Death save", bonus: 0 } });

    expect(screen.getByText("Type the number on your d20.")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox"), "14");
    await userEvent.click(screen.getByRole("button", { name: "Use my roll" }));

    expect(roller.submitRealDice).toHaveBeenCalledWith("14");
  });

  it("asks for both d20s with advantage", () => {
    renderDock({ realDice: true, mode: "advantage", pending: { type: "check", label: "Stealth", bonus: 5 } });
    expect(screen.getByText(/both d20 numbers/)).toBeInTheDocument();
  });

  it("says how many numbers damage needs, and mentions doubling on a crit", () => {
    renderDock({ realDice: true, pending: { type: "damage", label: "Fireball", damage: "10d6", crit: true } });
    expect(screen.getByText(/10 numbers for 10d6/)).toBeInTheDocument();
    expect(screen.getByText(/double the dice for the critical hit/)).toBeInTheDocument();
  });

  it("shows the problem beside the box when the numbers don't fit", async () => {
    renderDock({
      realDice: true,
      pending: { type: "check", label: "Stealth", bonus: 5 },
      submitRealDice: vi.fn().mockReturnValue("A d20 only shows 1 to 20, not 25."),
    });

    await userEvent.type(screen.getByRole("textbox"), "25");
    await userEvent.click(screen.getByRole("button", { name: "Use my roll" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A d20 only shows 1 to 20, not 25.");
  });

  it("can be cancelled", async () => {
    const roller = renderDock({ realDice: true, pending: { type: "check", label: "Stealth", bonus: 5 } });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(roller.cancelRealDice).toHaveBeenCalled();
  });
});
