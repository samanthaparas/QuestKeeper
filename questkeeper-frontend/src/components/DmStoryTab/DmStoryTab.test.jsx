import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DmStoryTab from "./DmStoryTab";

const sheet = (id, name, extra = {}) => ({
  id,
  name,
  race: { name: "Human" },
  class: { name: "Rogue" },
  abilityScores: { wisdom: 12, intelligence: 10 },
  skills: {},
  proficiencyBonus: 2,
  languages: "Common, Draconic",
  combat: { speed: 30 },
  ...extra,
});

describe("DmStoryTab (Party clues)", () => {
  it("lists the characters, shows the picked one's clues, and has nothing to edit", async () => {
    render(
      <DmStoryTab
        characters={[sheet("a", "Dangit", { backstory: "Raised by players." }), sheet("b", "Branwen", { languages: "Elvish" })]}
      />,
    );
    const picker = screen.getByRole("list", { name: "Characters" });
    expect(within(picker).getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("Character details · Dangit")).toBeInTheDocument();
    expect(screen.getByText("Common, Draconic")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(within(picker).getByRole("button", { name: /Branwen/ }));
    expect(screen.getByText("Character details · Branwen")).toBeInTheDocument();
    expect(screen.getByText("Elvish")).toBeInTheDocument();
    expect(screen.queryByText("Backstory")).not.toBeInTheDocument();
  });

  it("keeps backstory behind a disclosure, and shows who is picked with aria-pressed", async () => {
    render(<DmStoryTab characters={[sheet("a", "Dangit", { backstory: "Raised by players." })]} />);
    expect(screen.getByRole("button", { name: /Dangit/ })).toHaveAttribute("aria-pressed", "true");
    const fold = screen.getByText("Backstory").closest("details");
    expect(fold).not.toHaveAttribute("open");
  });

  it("shows each character's status chips on their line, given by the page", () => {
    render(
      <DmStoryTab
        characters={[sheet("a", "Dangit")]}
        statusFor={(id) => (id === "a" ? <span>Poisoned</span> : null)}
      />,
    );
    expect(within(screen.getByRole("list", { name: "Characters" })).getByText("Poisoned")).toBeInTheDocument();
  });

  it("folds on narrow screens with an honest expanded state", async () => {
    render(<DmStoryTab characters={[sheet("a", "Dangit"), sheet("b", "Branwen")]} />);
    const toggle = screen.getByRole("button", { name: /2 characters/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("clues-body")).not.toHaveClass("dm-story__body--open");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("clues-body")).toHaveClass("dm-story__body--open");
  });

  it("says so when nobody has joined", () => {
    render(<DmStoryTab characters={[]} />);
    expect(screen.getByText("Characters appear here when players join.")).toBeInTheDocument();
  });

  it("keeps the details closed until opened, and keeps them open (without moving focus) when you pick someone else", async () => {
    render(<DmStoryTab characters={[sheet("a", "Dangit"), sheet("b", "Branwen", { languages: "Elvish" })]} />);
    const details = screen.getByText(/Character details/).closest("details");
    expect(details).not.toHaveAttribute("open");

    // Picking someone while it's closed leaves it closed.
    const picker = screen.getByRole("list", { name: "Characters" });
    await userEvent.click(within(picker).getByRole("button", { name: /Branwen/ }));
    expect(screen.getByText(/Character details/).closest("details")).not.toHaveAttribute("open");

    await userEvent.click(screen.getByText(/Character details/));
    expect(screen.getByText(/Character details/).closest("details")).toHaveAttribute("open");

    const dangit = within(picker).getByRole("button", { name: /Dangit/ });
    await userEvent.click(dangit);
    expect(screen.getByText("Character details · Dangit").closest("details")).toHaveAttribute("open");
    expect(dangit).toHaveFocus();
  });

  it("shows each character's passive scores once (on the card), not again in the details", () => {
    render(<DmStoryTab characters={[sheet("a", "Dangit")]} />);
    expect(screen.queryByText("Passive")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Perception 11/)).toHaveLength(1);
  });
});
