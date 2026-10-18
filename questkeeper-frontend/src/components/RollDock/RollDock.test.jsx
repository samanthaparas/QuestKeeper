import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RollDock, { DiceHelp } from "./RollDock";
import { installFakeStorage } from "../../test/fakeStorage";
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
    addExtraDamage: vi.fn().mockReturnValue(null),
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

  it("keeps the dice explainer out of the bar (it lives in the sheet's help area)", () => {
    renderDock();
    expect(screen.queryByText("New to dice? What does this mean?")).not.toBeInTheDocument();
    expect(screen.getByText("Tap a number to roll it")).toBeInTheDocument();
  });

  it("explains the dice in plain words, as a collapsed item", () => {
    render(<DiceHelp />);
    expect(screen.getByText("New to dice? What does this mean?")).toBeInTheDocument();
    expect(screen.getByText(/20-sided die/)).toBeInTheDocument();
    expect(screen.getByText(/Rolling real dice\?/)).toBeInTheDocument();
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

describe("RollDock: extra damage", () => {
  const damageRoll = { id: 1, kind: "damage", label: "Longsword damage", total: 11, detail: "2d8 [5, 3] +3", status: "private" };

  it("offers Add extra damage under a damage roll, but not under a d20", () => {
    renderDock({ lastRoll: damageRoll });
    expect(screen.getByRole("button", { name: "Add extra damage" })).toBeInTheDocument();
  });

  it("doesn't offer it on a check", () => {
    renderDock({
      lastRoll: { id: 2, kind: "check", label: "Stealth", total: 16, detail: "d20 11 + 5", status: "private", natural: 11, rolls: [11] },
    });
    expect(screen.queryByRole("button", { name: "Add extra damage" })).not.toBeInTheDocument();
  });

  it("sends the typed extra and name, and remembers them", async () => {
    installFakeStorage();
    const roller = renderDock({ lastRoll: damageRoll });

    await userEvent.click(screen.getByRole("button", { name: "Add extra damage" }));
    await userEvent.type(screen.getByLabelText("Extra damage dice"), "2d8");
    await userEvent.type(screen.getByLabelText("Name for the extra damage (optional)"), "Smite");
    await userEvent.click(screen.getByRole("button", { name: "Add to my damage" }));

    expect(roller.addExtraDamage).toHaveBeenCalledWith("2d8", "Smite", null);
    expect(JSON.parse(window.localStorage.getItem("qk-extra-damage"))).toEqual({ text: "2d8", label: "Smite" });
  });

  it("shows why it couldn't add the extra", async () => {
    installFakeStorage();
    renderDock({
      lastRoll: damageRoll,
      addExtraDamage: vi.fn().mockReturnValue("Write the extra damage like 2d8 or 1d6+2."),
    });

    await userEvent.click(screen.getByRole("button", { name: "Add extra damage" }));
    await userEvent.type(screen.getByLabelText("Extra damage dice"), "oops");
    await userEvent.click(screen.getByRole("button", { name: "Add to my damage" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("like 2d8");
  });

  it("asks for the extra's dice when real dice are on", () => {
    renderDock({
      realDice: true,
      pending: { type: "extra", label: "Smite", damage: "2d8", crit: false, baseId: 1 },
    });
    expect(screen.getByText(/for Smite \(2 numbers for 2d8\)/)).toBeInTheDocument();
  });

  it("fills in the dice and name from a common choice", async () => {
    installFakeStorage();
    const roller = renderDock({ lastRoll: damageRoll });

    await userEvent.click(screen.getByRole("button", { name: "Add extra damage" }));
    await userEvent.selectOptions(
      screen.getByLabelText("Pick a common one"),
      "Divine Smite, 1st-level slot (2d8)",
    );
    expect(screen.getByLabelText("Extra damage dice")).toHaveValue("2d8");
    expect(screen.getByLabelText("Name for the extra damage (optional)")).toHaveValue("Divine Smite");

    await userEvent.click(screen.getByRole("button", { name: "Add to my damage" }));
    expect(roller.addExtraDamage).toHaveBeenCalledWith("2d8", "Divine Smite", null);
  });

  it("says the extra went in and what the total came to", () => {
    renderDock({
      lastRoll: { ...damageRoll, total: 21, extras: [{ label: "Smite", total: 10 }] },
    });

    expect(screen.getByText("✓ Smite added: +10")).toBeInTheDocument();
    expect(screen.getByText("Total damage: 21")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add more extra damage" })).toBeInTheDocument();
  });

  it("with real dice, asks for the extra's numbers in the same form and sends them along", async () => {
    installFakeStorage();
    const roller = renderDock({ lastRoll: damageRoll, realDice: true });

    await userEvent.click(screen.getByRole("button", { name: "Add extra damage" }));
    await userEvent.selectOptions(
      screen.getByLabelText("Pick a common one"),
      "Divine Smite, 1st-level slot (2d8)",
    );
    const add = screen.getByRole("button", { name: "Add to my damage" });
    expect(add).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Numbers on your extra damage dice"), "6, 2");
    await userEvent.click(add);

    expect(roller.addExtraDamage).toHaveBeenCalledWith("2d8", "Divine Smite", "6, 2");
  });

  it("doesn't ask for numbers when the app rolls, or for a flat extra", async () => {
    installFakeStorage();
    renderDock({ lastRoll: damageRoll, realDice: false });
    await userEvent.click(screen.getByRole("button", { name: "Add extra damage" }));
    await userEvent.type(screen.getByLabelText("Extra damage dice"), "2d8");
    expect(screen.queryByLabelText("Numbers on your extra damage dice")).not.toBeInTheDocument();
  });
});

