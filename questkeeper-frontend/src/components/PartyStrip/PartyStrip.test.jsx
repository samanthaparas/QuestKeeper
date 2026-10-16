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

