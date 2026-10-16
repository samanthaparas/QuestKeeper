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
});
