import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PartyStrip from "./PartyStrip";
import { toPartyRow } from "../../utils/partyStrip";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

const base = {
  level: 3,
  class: { name: "Paladin" },
  combat: { hitPoints: { current: 20, max: 20 }, armorClass: 18 },
};

describe("PartyStrip portraits", () => {
  it("shows each character's portrait, or their initials without one", () => {
    const { container } = render(
      <PartyStrip
        rows={[
          toPartyRow({ ...base, id: "a", name: "Billie", portraitUrl: "https://example.com/billie.png" }),
          toPartyRow({ ...base, id: "b", name: "Dangit Rogue" }),
        ]}
      />,
    );

    const images = container.querySelectorAll(".party-strip__portrait img");
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute("src", "https://example.com/billie.png");
    expect(screen.getByText("DR")).toBeInTheDocument();
  });

  it("shows a downed character's death saves and who is concentrating", () => {
    render(
      <PartyStrip
        rows={[
          toPartyRow({
            ...base,
            id: "a",
            name: "Billie",
            combat: { ...base.combat, hitPoints: { current: 0, max: 30 } },
            deathSaves: { successes: 2, failures: 1 },
          }),
          toPartyRow({ ...base, id: "b", name: "Dangit", concentration: { spell: "Bless" } }),
        ]}
      />,
    );

    expect(screen.getByLabelText("Death saves: 2 successes, 1 failure")).toHaveTextContent("✓✓ ✗");
    expect(screen.getByText("🎯 Bless")).toBeInTheDocument();
  });

  it("shows a companion on its own line under its character", () => {
    render(
      <PartyStrip
        rows={[
          toPartyRow({
            ...base,
            id: "a",
            name: "Billie",
            companionMode: "creature",
            companionCreature: { name: "Victory", hitPoints: { current: 2, max: 59 }, armorClass: 18 },
          }),
        ]}
      />,
    );

    const companion = screen.getByLabelText("Billie's companion, Victory");
    expect(companion).toHaveTextContent("Victory");
    expect(companion).toHaveTextContent("HP 2/59 · Bloodied");
    expect(companion).toHaveTextContent("AC 18");
  });
});


describe("PartyStrip, tight card and statuses shown elsewhere", () => {
  const withStatus = (id, name) =>
    toPartyRow(
      {
        ...base,
        id,
        name,
        conditions: [{ key: "poisoned" }],
        concentration: { spell: "Bless", rounds: 4 },
        abilityScores: { wisdom: 12, intelligence: 10 },
      },
      { withPassives: true },
    );

  it("shows conditions and concentration on the card by default", () => {
    render(<PartyStrip rows={[withStatus("a", "Billie")]} />);
    expect(screen.getByText("Poisoned")).toBeInTheDocument();
    expect(screen.getByText(/Bless/)).toBeInTheDocument();
  });

  it("leaves them off the card only for the characters listed, and keeps everyone else's", () => {
    render(
      <PartyStrip
        rows={[withStatus("a", "Billie"), withStatus("b", "Dangit")]}
        hideStatusFor={new Set(["a"])}
      />,
    );
    // One of each remains: Dangit's.
    expect(screen.getAllByText("Poisoned")).toHaveLength(1);
    expect(screen.getAllByText(/Bless/)).toHaveLength(1);
  });

  it("uses short passive-score names when tight, with the full words for screen readers", () => {
    const { container } = render(<PartyStrip rows={[withStatus("a", "Billie")]} compact />);
    expect(container.querySelector(".party-strip__passive [aria-hidden='true']")).toHaveTextContent("Perc");
    expect(screen.getAllByText("Perception 11")[0]).toHaveClass("party-strip__sr");
  });
});

describe("PartyStrip, long names", () => {
  const row = (name) => toPartyRow({ ...base, id: name, name });

  it("flags a name that won't fit beside the picture and badge, only on tight cards", () => {
    const { container } = render(
      <PartyStrip compact rows={[row("Sir Bartholomew Featherstonehaugh-Quill"), row("Billie")]} />,
    );
    const rows = container.querySelectorAll(".party-strip__row");
    expect(rows[0]).toHaveClass("party-strip__row--long-name");
    expect(rows[1]).not.toHaveClass("party-strip__row--long-name");
  });

  it("never flags a card that isn't tight, and always shows the full name", () => {
    const { container } = render(<PartyStrip rows={[row("Sir Bartholomew Featherstonehaugh-Quill")]} />);
    expect(container.querySelector(".party-strip__row--long-name")).toBeNull();
    expect(screen.getByText("Sir Bartholomew Featherstonehaugh-Quill")).toBeInTheDocument();
  });
});
