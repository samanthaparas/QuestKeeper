import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShortRestPanel from "./ShortRestPanel";

function makeSheet({ current = 10, die = 8, total = 4, remaining = 3 } = {}) {
  return {
    abilityScores: { constitution: 14 },
    combat: {
      hitPoints: { max: 30, current, temporary: 0 },
      hitDice: { total, remaining, die },
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("ShortRestPanel", () => {
  it("explains the rest and suggests spending one Hit Die when hurt", () => {
    render(
      <ShortRestPanel sheet={makeSheet()} onRest={vi.fn()} onClose={vi.fn()} />,
    );

    expect(
      screen.getByText(/each one rolls a d8 and adds your CON \(\+2\)/),
    ).toBeInTheDocument();
    expect(screen.getByText("3 of 4 left")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Roll 1 Hit Die and rest" }),
    ).toBeInTheDocument();
  });

  it("rolls the chosen number of Hit Dice", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d8 -> 5
    const onRest = vi.fn();
    render(
      <ShortRestPanel sheet={makeSheet()} onRest={onRest} onClose={vi.fn()} />,
    );

    const count = screen.getByLabelText(/Hit Dice to spend/);
    await userEvent.clear(count);
    await userEvent.type(count, "2");
    await userEvent.click(
      screen.getByRole("button", { name: "Roll 2 Hit Dice and rest" }),
    );

    expect(onRest).toHaveBeenCalledWith([5, 5]);
  });

  it("suggests spending nothing at full HP", () => {
    render(
      <ShortRestPanel
        sheet={makeSheet({ current: 30 })}
        onRest={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/You're at full HP/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rest without spending" }),
    ).toBeInTheDocument();
  });

  it("says when there are no Hit Dice left", () => {
    render(
      <ShortRestPanel
        sheet={makeSheet({ remaining: 0 })}
        onRest={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/No Hit Dice left/)).toBeInTheDocument();
  });

  it("asks for the Hit Die size when it isn't set, but still allows the rest", async () => {
    const onRest = vi.fn();
    render(
      <ShortRestPanel
        sheet={makeSheet({ die: null })}
        onRest={onRest}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Set your Hit Die size first/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Rest without spending" }),
    );
    expect(onRest).toHaveBeenCalledWith([]);
  });
});
