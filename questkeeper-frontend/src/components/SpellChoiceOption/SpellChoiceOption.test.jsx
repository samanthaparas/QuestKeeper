import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SpellChoiceOption from "./SpellChoiceOption";
import { getSpellDetails } from "../../utils/api";

vi.mock("../../utils/api", () => ({ getSpellDetails: vi.fn() }));

const fireBolt = { index: "fire-bolt", name: "Fire Bolt" };

function renderOption(props = {}) {
  const onToggle = vi.fn();
  render(
    <SpellChoiceOption
      spell={fireBolt}
      checked={false}
      disabled={false}
      onToggle={onToggle}
      {...props}
    />,
  );
  return { onToggle };
}

describe("SpellChoiceOption", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSpellDetails.mockResolvedValue({
      name: "Fire Bolt",
      level: 0,
      school: { name: "Evocation" },
      casting_time: "1 action",
      range: "120 feet",
      components: ["V", "S"],
      duration: "Instantaneous",
      desc: ["You hurl a mote of fire at a creature or object within range."],
    });
  });

  it("shows the spell's name, what it is for, and a one-line summary", () => {
    renderOption();

    expect(
      screen.getByRole("checkbox", { name: /Fire Bolt/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Damage")).toBeInTheDocument();
    expect(screen.getByText(/Ranged fire attack/)).toBeInTheDocument();
  });

  it("still works for a spell with no summary on file", () => {
    renderOption({ spell: { index: "homebrew-bolt", name: "Homebrew Bolt" } });

    expect(
      screen.getByRole("checkbox", { name: /Homebrew Bolt/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Damage")).not.toBeInTheDocument();
  });

  it("loads and shows the full text only when asked", async () => {
    renderOption();
    expect(getSpellDetails).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Read more" }));

    expect(
      await screen.findByText(/You hurl a mote of fire/),
    ).toBeInTheDocument();
    expect(screen.getByText("Evocation cantrip")).toBeInTheDocument();
    expect(screen.getByText(/Casting Time: 1 action/)).toBeInTheDocument();
    expect(getSpellDetails).toHaveBeenCalledWith("fire-bolt");

    await userEvent.click(screen.getByRole("button", { name: "Hide details" }));
    expect(
      screen.queryByText(/You hurl a mote of fire/),
    ).not.toBeInTheDocument();
  });

  it("says so when the full text can't be loaded", async () => {
    getSpellDetails.mockRejectedValue(new Error("offline"));
    renderOption();

    await userEvent.click(screen.getByRole("button", { name: "Read more" }));

    expect(
      await screen.findByText(/Couldn't load the full text/),
    ).toBeInTheDocument();
  });

  it("toggles the choice and shows a note, and reading more does not toggle it", async () => {
    const { onToggle } = renderOption({ note: "Already known from High Elf" });

    expect(screen.getByText("Already known from High Elf")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Read more" }));
    expect(onToggle).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("labels an option you can't pick as locked, so it never looks broken", () => {
    renderOption({ disabled: true });

    expect(screen.getByText("Limit reached")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("says Locked, plus the reason, for something you already have", () => {
    renderOption({ disabled: true, note: "Already known from High Elf" });

    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(screen.getByText("Already known from High Elf")).toBeInTheDocument();
    expect(screen.queryByText("Limit reached")).not.toBeInTheDocument();
  });

  it("does not call a picked spell locked, even when the limit is reached", () => {
    renderOption({ disabled: true, checked: true });

    expect(screen.queryByText("Limit reached")).not.toBeInTheDocument();
  });
});
