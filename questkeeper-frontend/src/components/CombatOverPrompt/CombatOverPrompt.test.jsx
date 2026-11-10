import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import CombatOverPrompt, { AUTO_END_SECONDS } from "./CombatOverPrompt";

afterEach(() => vi.useRealTimers());

describe("CombatOverPrompt", () => {
  it("counts down and ends combat by itself, once", () => {
    vi.useFakeTimers();
    const onEnd = vi.fn();
    render(<CombatOverPrompt onEnd={onEnd} onAddMonster={vi.fn()} />);

    expect(screen.getByText("Every enemy is down.")).toBeInTheDocument();
    expect(screen.getByText("1:00")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByText("0:30")).toBeInTheDocument();
    expect(onEnd).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime((AUTO_END_SECONDS - 30) * 1000 + 5000));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("ends combat right away when asked", () => {
    const onEnd = vi.fn();
    render(<CombatOverPrompt onEnd={onEnd} onAddMonster={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "End combat now" }));
    fireEvent.click(screen.getByRole("button", { name: "End combat now" }));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("stops the clock for a surprise monster, and opens the monster form", () => {
    vi.useFakeTimers();
    const onEnd = vi.fn();
    const onAddMonster = vi.fn();
    render(<CombatOverPrompt onEnd={onEnd} onAddMonster={onAddMonster} />);

    fireEvent.click(screen.getByRole("button", { name: "Add a surprise monster" }));
    act(() => vi.advanceTimersByTime(AUTO_END_SECONDS * 2000));

    expect(onAddMonster).toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    expect(screen.getByText(/The timer is stopped/)).toBeInTheDocument();
  });

  it("Hold off stops the clock, and End combat still works after", () => {
    vi.useFakeTimers();
    const onEnd = vi.fn();
    render(<CombatOverPrompt onEnd={onEnd} onAddMonster={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Hold off" }));
    act(() => vi.advanceTimersByTime(AUTO_END_SECONDS * 2000));
    expect(onEnd).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Hold off" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "End combat now" }));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
