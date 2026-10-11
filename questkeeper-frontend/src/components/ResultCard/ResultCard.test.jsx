import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultCard from "./ResultCard";

describe("ResultCard", () => {
  it("shows a short tagline under the name when there is one", () => {
    render(
      <ResultCard
        result={{
          name: "Dragonborn",
          category: "Race",
          index: "dragonborn",
          tagline: "Dragon-blooded fire breather",
        }}
        onClick={() => {}}
      />,
    );

    expect(
      screen.getByText("Dragon-blooded fire breather"),
    ).toBeInTheDocument();
  });

  it("looks the same as before when there is no tagline", () => {
    render(
      <ResultCard
        result={{ name: "Acolyte", category: "Background", index: "acolyte" }}
        onClick={() => {}}
      />,
    );

    expect(screen.getByText("Acolyte")).toBeInTheDocument();
    expect(screen.queryByText(/fire breather/)).not.toBeInTheDocument();
  });
});

describe("ResultCard previews", () => {
  it("attaches a hover preview the card describes itself with", () => {
    render(
      <ResultCard
        result={{
          name: "Folk Hero",
          category: "Background",
          index: "book_folk-hero",
          source: "Player's Handbook (2014)",
          sourceGroup: "Official books",
          preview: "An ordinary person who did something brave.",
        }}
        onClick={() => {}}
      />,
    );
    const card = screen.getByRole("button", { name: /Folk Hero/ });
    expect(card).toHaveAccessibleDescription("An ordinary person who did something brave.");
    expect(screen.getByText("Player's Handbook (2014)")).toHaveClass("source-badge--official");
  });

  it("has no preview when there's nothing to show", () => {
    render(<ResultCard result={{ name: "Elf", category: "Race", index: "elf" }} onClick={() => {}} />);
    expect(screen.getByRole("button")).not.toHaveAccessibleDescription();
    expect(document.querySelector(".result-card__preview")).toBeNull();
  });
});
