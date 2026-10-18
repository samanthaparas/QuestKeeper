import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import ConditionBadges from "./ConditionBadges";

function Harness({ start = [] }) {
  const [conditions, setConditions] = useState(start);
  return <ConditionBadges conditions={conditions} onChange={setConditions} />;
}

describe("ConditionBadges", () => {
  it("adds a condition from the picker, with what each one does", async () => {
    render(<Harness />);
    expect(screen.getByText("None")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "+ Condition" }));
    expect(screen.getByRole("button", { name: /Poisoned Disadvantage on attack rolls/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Poisoned/ }));

    expect(screen.queryByText("None")).toBeNull();
    // The badge's name explains itself on tap.
    await userEvent.click(screen.getByRole("button", { name: "Poisoned" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Disadvantage on attack rolls and ability checks.");
  });

  it("removes a condition with its x", async () => {
    render(<Harness start={[{ key: "prone" }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Prone" }));
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("steps exhaustion up and down", async () => {
    render(<Harness start={[{ key: "exhaustion", level: 1 }]} />);
    await userEvent.click(screen.getByRole("button", { name: "One more level of exhaustion" }));
    expect(screen.getByRole("button", { name: "Exhaustion 2" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "One less level of exhaustion" }));
    await userEvent.click(screen.getByRole("button", { name: "One less level of exhaustion" }));
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("shows only the badges, read-only, for the DM", () => {
    const { container } = render(<ConditionBadges conditions={[{ key: "prone" }]} readOnly />);
    expect(screen.getByRole("button", { name: "Prone" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove|Condition/ })).toBeNull();
    const empty = render(<ConditionBadges conditions={[]} readOnly />);
    expect(empty.container).toBeEmptyDOMElement();
    expect(container).not.toBeEmptyDOMElement();
  });

  it("times a condition with ⏱, adjusts its rounds, and takes the timer off at 1", async () => {
    const user = userEvent.setup();
    render(<Harness start={[{ key: "poisoned" }]} />);

    await user.click(screen.getByRole("button", { name: "Set how many rounds Poisoned lasts" }));
    expect(screen.getByText("⏱ 1 round")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "One more round of Poisoned" }));
    expect(screen.getByText("⏱ 2 rounds")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "One less round of Poisoned" }));
    await user.click(screen.getByRole("button", { name: "Take the timer off Poisoned" }));
    expect(screen.queryByText(/⏱ \d/)).not.toBeInTheDocument();
    expect(screen.getByText("Poisoned")).toBeInTheDocument();
  });

  it("shows rounds left on read-only badges", () => {
    render(<ConditionBadges conditions={[{ key: "poisoned", rounds: 2 }]} readOnly />);
    expect(screen.getByText("· 2 rounds left")).toBeInTheDocument();
  });

  it("explains what the current exhaustion level does, and shows all six", () => {
    render(<ConditionBadges conditions={[{ key: "exhaustion", level: 3 }]} onChange={vi.fn()} />);

    expect(screen.getByText("What does exhaustion level 3 do?")).toBeInTheDocument();
    expect(screen.getAllByText("Disadvantage on attack rolls and saving throws.").length).toBeGreaterThan(0);
    expect(screen.getByText(/You also have everything from the lower levels/)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").filter((item) => /^Level \d\./.test(item.textContent))).toHaveLength(6);
    // Level 3 is the one marked as yours.
    expect(screen.getByText("Level 3.").closest("li")).toHaveAttribute("aria-current", "true");
    expect(screen.getByText(/A long rest takes away one level/)).toBeInTheDocument();
  });

  it("shows the explanation to the DM too, but nothing without exhaustion", () => {
    const { rerender } = render(
      <ConditionBadges conditions={[{ key: "exhaustion", level: 1 }]} onChange={vi.fn()} readOnly />,
    );
    expect(screen.getByText("What does exhaustion level 1 do?")).toBeInTheDocument();
    // Level 1 has nothing "lower" to add.
    expect(screen.queryByText(/everything from the lower levels/)).not.toBeInTheDocument();

    rerender(<ConditionBadges conditions={[{ key: "poisoned" }]} onChange={vi.fn()} />);
    expect(screen.queryByText(/What does exhaustion level/)).not.toBeInTheDocument();
  });
});

