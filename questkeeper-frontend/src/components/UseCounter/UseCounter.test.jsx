import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UseCounter from "./UseCounter";
import { describeRecovery } from "../../utils/characterSheet";

function renderCounter(props = {}) {
  const onChange = vi.fn();
  const utils = render(
    <UseCounter name="Staff of Flowers" unit="charge" title="Charges" current={7} max={10} onChange={onChange} {...props} />,
  );
  return { onChange, ...utils };
}

describe("UseCounter", () => {
  it("shows remaining over the most, with named buttons and a readable count", () => {
    renderCounter();
    expect(screen.getByRole("group", { name: "Staff of Flowers: 7 of 10 charges remaining" })).toHaveTextContent("Charges7 / 10");
    expect(screen.getByRole("button", { name: "Spend one charge from Staff of Flowers" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Restore one charge to Staff of Flowers" })).toBeEnabled();
    expect(screen.queryByText("Depleted")).toBeNull();
    // No circles, bars or segments.
    expect(document.querySelectorAll(".use-pips, progress, [role=progressbar]")).toHaveLength(0);
  });

  it("− spends exactly one and + gives exactly one back, each press once", async () => {
    const { onChange } = renderCounter();
    await userEvent.click(screen.getByRole("button", { name: /^Spend one/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(6);
    await userEvent.click(screen.getByRole("button", { name: /^Restore one/ }));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(8);
  });

  it("stops at 0 and at the most, and says Depleted at 0", async () => {
    const { onChange, rerender } = renderCounter({ current: 0 });
    expect(screen.getByRole("button", { name: /^Spend one/ })).toBeDisabled();
    expect(screen.getByText("Depleted")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Staff of Flowers: 0 of 10 charges remaining" })).toBeInTheDocument();
    rerender(<UseCounter name="Staff of Flowers" unit="charge" current={10} max={10} onChange={onChange} />);
    expect(screen.getByRole("button", { name: /^Restore one/ })).toBeDisabled();
    expect(screen.queryByText("Depleted")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /^Restore one/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("never shows past its limits even if the saved number is", () => {
    renderCounter({ current: 14, max: 10 });
    expect(screen.getByRole("group", { name: /10 of 10 charges/ })).toBeInTheDocument();
  });

  it("works from the keyboard and reads out the new count once after a press", async () => {
    const { onChange } = renderCounter();
    screen.getByRole("button", { name: /^Spend one/ }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(6);
    expect(document.querySelector("[aria-live=polite]")).toHaveTextContent("6 of 10 charges remaining");
  });

  it("says nothing out loud when the count changes from somewhere else (a rest)", () => {
    const { rerender, onChange } = renderCounter({ current: 2 });
    rerender(<UseCounter name="Staff of Flowers" unit="charge" current={10} max={10} onChange={onChange} />);
    expect(document.querySelector("[aria-live=polite]")).toHaveTextContent("");
  });

  it("uses one charge's words for a maximum of 1", () => {
    render(<UseCounter name="Healing Spirit" current={1} max={1} onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Healing Spirit: 1 of 1 use remaining" })).toBeInTheDocument();
  });

  it("keeps a big pool's typed box as the count, between − and +", async () => {
    const { onChange } = renderCounter({ name: "Lay on Hands", unit: "point", current: 60, max: 60, editable: true, title: null });
    const box = screen.getByLabelText("Lay on Hands points remaining");
    expect(box).toHaveValue(60);
    await userEvent.click(screen.getByRole("button", { name: "Spend one point from Lay on Hands" }));
    expect(onChange).toHaveBeenLastCalledWith(59);
  });

  it("keeps the same width whatever the number, by the most's digits", () => {
    renderCounter();
    expect(screen.getByRole("group").style.getPropertyValue("--use-counter-digits")).toBe("2");
  });
});

describe("describeRecovery", () => {
  it("words it from the resource's own settings", () => {
    expect(describeRecovery({ resetOn: "long" })).toBe("Recovers on a long rest");
    expect(describeRecovery({})).toBe("Recovers on a long rest");
    expect(describeRecovery({ resetOn: "short" })).toBe("Recovers on a short rest");
    expect(describeRecovery({ resetOn: "dawn", regain: "1d6+4" })).toBe("Recovers at dawn · +1d6+4");
    expect(describeRecovery({ resetOn: "dawn" })).toBe("Recovers fully at dawn");
    expect(describeRecovery({ resetOn: "manual" })).toBe("No automatic recovery");
  });

  it("has a short form for the Resources list's Recovery column", () => {
    const short = (resource) => describeRecovery(resource, { short: true });
    expect(short({ resetOn: "long" })).toBe("Long rest");
    expect(short({ resetOn: "short" })).toBe("Short rest");
    expect(short({ resetOn: "dawn", regain: "1d6+4" })).toBe("Dawn · +1d6+4");
    expect(short({ resetOn: "dawn" })).toBe("Dawn · all");
    expect(short({ resetOn: "manual" })).toBe("No automatic recovery");
  });

  it("can leave Depleted to the list, so reaching 0 never moves the buttons", () => {
    render(<UseCounter name="Healing Spirit" current={0} max={1} onChange={vi.fn()} showDepleted={false} aligned />);
    expect(screen.queryByText("Depleted")).toBeNull();
    expect(screen.getByRole("group", { name: "Healing Spirit: 0 of 1 use remaining" })).toHaveClass("use-counter--aligned");
    expect(screen.getByRole("button", { name: /^Spend one/ })).toBeDisabled();
  });
});

describe("UseCounter keyboard focus at the limits", () => {
  it("moves focus to + when − spends the last one, and to − when + fills it", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<UseCounter name="Second Wind" current={1} max={1} onChange={onChange} />);
    screen.getByRole("button", { name: "Spend one use from Second Wind" }).focus();
    await userEvent.keyboard("{Enter}");
    rerender(<UseCounter name="Second Wind" current={0} max={1} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Restore one use to Second Wind" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    rerender(<UseCounter name="Second Wind" current={1} max={1} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Spend one use from Second Wind" })).toHaveFocus();
  });
});
