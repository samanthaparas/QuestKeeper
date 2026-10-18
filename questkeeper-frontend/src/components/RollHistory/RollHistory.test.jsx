import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RollHistory from "./RollHistory";

const NOW = new Date("2026-10-18T15:42:00").getTime();
const history = [
  {
    id: "3",
    at: NOW,
    kind: "damage",
    label: "Longsword damage",
    total: 34,
    detail: "2d8 [8, 8] +10 | Smite 2d8 [6, 2] = 8",
    extras: [{ label: "Smite", total: 8 }],
  },
  { id: "2", at: NOW - 60000, kind: "check", label: "Stealth", total: 22, detail: "d20 20 + 2", isNatural20: true, extras: [] },
  { id: "1", at: NOW - 120000, kind: "check", label: "Death save", total: 1, detail: "d20 1", isNatural1: true, extras: [] },
];

afterEach(() => vi.restoreAllMocks());

describe("RollHistory", () => {
  it("lists the rolls with their totals, dice and anything added", () => {
    render(<RollHistory history={history} onClear={vi.fn()} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Longsword damage")).toBeInTheDocument();
    expect(within(items[0]).getByLabelText("Total 34")).toBeInTheDocument();
    expect(within(items[0]).getByText("✓ Smite added: +8")).toBeInTheDocument();
    expect(within(items[1]).getByText("Natural 20")).toBeInTheDocument();
    expect(within(items[2]).getByText("Natural 1")).toBeInTheDocument();
  });

  it("filters to damage or d20 rolls", async () => {
    render(<RollHistory history={history} onClear={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Damage" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "d20 rolls" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "All rolls" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("says what it is when there are no rolls yet", () => {
    render(<RollHistory history={[]} onClear={vi.fn()} />);
    expect(screen.getByText(/No rolls yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear history" })).not.toBeInTheDocument();
  });

  it("clears the history only after asking", async () => {
    const onClear = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<RollHistory history={history} onClear={onClear} />);

    await userEvent.click(screen.getByRole("button", { name: "Clear history" }));
    expect(onClear).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Clear history" }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
