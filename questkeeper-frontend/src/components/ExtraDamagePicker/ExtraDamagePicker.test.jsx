import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExtraDamagePicker from "./ExtraDamagePicker";

describe("ExtraDamagePicker", () => {
  it("lists common choices by class, so a beginner doesn't have to know the dice", () => {
    render(<ExtraDamagePicker text="" label="" onChange={vi.fn()} />);
    const select = screen.getByLabelText("Pick a common one");

    expect(select).toHaveDisplayValue("Something else (type it below)");
    expect(screen.getByRole("option", { name: "Hunter's Mark (1d6)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sneak Attack, level 5th to 6th (3d6)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Rage, level 9 to 15 (+3)" })).toBeInTheDocument();
  });

  it("fills in both the dice and the name from a choice", async () => {
    const onChange = vi.fn();
    render(<ExtraDamagePicker text="" label="" onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText("Pick a common one"), "Hex (1d6)");

    expect(onChange).toHaveBeenCalledWith({ text: "1d6", label: "Hex" });
  });

  it("still lets you type anything else, keeping the other box", async () => {
    const onChange = vi.fn();
    render(<ExtraDamagePicker text="1d6" label="Hex" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Extra damage dice"), "2");
    expect(onChange).toHaveBeenLastCalledWith({ text: "1d62", label: "Hex" });

    await userEvent.type(screen.getByLabelText("Name for the extra damage (optional)"), "!");
    expect(onChange).toHaveBeenLastCalledWith({ text: "1d6", label: "Hex!" });
  });

  it("shows the matching choice when the boxes hold one, and explains the dice", () => {
    render(<ExtraDamagePicker text="1d6" label="Hex" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Pick a common one")).toHaveDisplayValue("Hex (1d6)");
    expect(screen.getByText(/roll two 8-sided dice/)).toBeInTheDocument();
  });
});
