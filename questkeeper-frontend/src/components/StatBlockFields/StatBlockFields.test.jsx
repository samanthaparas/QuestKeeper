import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import StatBlockFields from "./StatBlockFields";

function Harness({ initial, onChange }) {
  const [value, setValue] = useState(initial);
  return (
    <StatBlockFields
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("StatBlockFields", () => {
  it("explains what to do when there are no attacks", () => {
    render(<Harness initial={{ attacks: [], notes: "" }} onChange={vi.fn()} />);

    expect(screen.getByText(/No attacks yet/)).toBeInTheDocument();
  });

  it("lets the DM set an initiative bonus", async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ attacks: [], notes: "" }} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Initiative bonus"), "3");

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ initiativeBonus: "3" }));
  });

  it("adds, fills in, and removes attacks", async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ attacks: [], notes: "" }} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "+ Add attack" }));
    await userEvent.type(screen.getByLabelText("Attack 1 name"), "Claw");
    await userEvent.type(screen.getByLabelText("Attack 1 to hit"), "4");
    await userEvent.type(screen.getByLabelText("Attack 1 damage"), "1d6+2");

    expect(onChange).toHaveBeenLastCalledWith({
      attacks: [{ name: "Claw", toHit: "4", damage: "1d6+2" }],
      notes: "",
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByLabelText("Attack 1 name")).not.toBeInTheDocument();
  });

  it("only changes the attack being edited", async () => {
    render(
      <Harness
        initial={{
          attacks: [
            { name: "Claw", toHit: "4", damage: "1d6" },
            { name: "Bite", toHit: "5", damage: "1d8" },
          ],
          notes: "",
        }}
        onChange={vi.fn()}
      />,
    );

    await userEvent.clear(screen.getByLabelText("Attack 2 name"));
    await userEvent.type(screen.getByLabelText("Attack 2 name"), "Sting");

    expect(screen.getByLabelText("Attack 1 name")).toHaveValue("Claw");
    expect(screen.getByLabelText("Attack 2 name")).toHaveValue("Sting");
  });

  it("keeps notes", async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ attacks: [], notes: "" }} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Notes"), "Fire vulnerable");

    expect(onChange).toHaveBeenLastCalledWith({ attacks: [], notes: "Fire vulnerable" });
  });
});
