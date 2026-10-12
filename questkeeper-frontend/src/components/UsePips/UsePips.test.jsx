import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import UsePips from "./UsePips";

function Harness({ start = 3, max = 4, onChange = () => {} }) {
  const [current, setCurrent] = useState(start);
  return (
    <UsePips
      label="Level 1 spell slots"
      current={current}
      max={max}
      onChange={(value) => {
        setCurrent(value);
        onChange(value);
      }}
    />
  );
}

describe("UsePips", () => {
  it("shows one pip per use and how many are left", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Level 1 spell slots: 3 of 4 left" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Spend one/ })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /Get one back/ })).toHaveLength(1);
    expect(screen.getByText("3 of 4 left")).toBeInTheDocument();
  });

  it("spends one from a lit pip and gets one back from a dim pip", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.click(screen.getAllByRole("button", { name: /Spend one/ })[0]);
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByText("2 of 4 left")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: /Get one back/ })[0]);
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it("only animates the pips that changed, in order", async () => {
    const { rerender } = render(<UsePips label="Rage" current={1} max={4} onChange={() => {}} />);
    expect(document.querySelectorAll(".use-pips__pip--fresh")).toHaveLength(0);

    // A long rest: three come back at once and light up one after another.
    rerender(<UsePips label="Rage" current={4} max={4} onChange={() => {}} />);
    const fresh = [...document.querySelectorAll(".use-pips__pip--fresh")];
    expect(fresh).toHaveLength(3);
    expect(fresh.map((pip) => pip.style.getPropertyValue("--pip-delay"))).toEqual(["", "50ms", "100ms"]);
  });

  it("never shows more left than the maximum", () => {
    render(<UsePips label="Rage" current={9} max={3} onChange={() => {}} />);
    expect(screen.getByText("3 of 3 left")).toBeInTheDocument();
  });
});
