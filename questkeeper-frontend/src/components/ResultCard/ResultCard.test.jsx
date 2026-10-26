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

describe("spell school icons", () => {
  it("uses each spell's school instead of its spell id", () => {
    for (const school of ["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"]) {
      const { container, unmount } = render(<ResultCard result={{ name: "Example spell", category: "Spell", index: "example-spell", school: { index: school } }} onClick={() => {}} />);
      expect(container.querySelector("img")).toHaveAttribute("src", expect.stringContaining(`${school}.png`));
      unmount();
    }
  });
});

describe("ResultCard in a creation picker", () => {
  const result = (overrides) => ({ name: "Moonwalker", category: "Race", index: "homebrew-moonwalker", ...overrides });

  it("shows a letter in the picture's place when a race has no artwork", () => {
    const { container } = render(<ResultCard result={result()} picker onClick={() => {}} />);
    expect(container.querySelector(".result-card__icon--letter")).toHaveTextContent("M");
  });

  it("keeps the real artwork when there is some, and the plain card elsewhere", () => {
    const { container, rerender } = render(<ResultCard result={result({ index: "elf", name: "Elf" })} picker onClick={() => {}} />);
    expect(container.querySelector("img.result-card__icon")).not.toBeNull();
    expect(container.querySelector(".result-card__icon--letter")).toBeNull();

    // Outside the pickers (search, browse pages) a missing picture stays missing.
    rerender(<ResultCard result={result()} onClick={() => {}} />);
    expect(container.querySelector(".result-card__icon--letter")).toBeNull();
  });

  it("gives a subrace or subclass a letter tile (never its parent's picture), and keeps the full name for readers", () => {
    const { container, rerender } = render(
      <ResultCard result={result({ category: "Subclass", index: "draconic", name: "Draconic Bloodline" })} picker onClick={() => {}} />,
    );
    const tile = container.querySelector(".result-card__icon--letter");
    expect(tile).toHaveTextContent("D");
    expect(tile).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("img.result-card__icon")).toBeNull();
    expect(screen.getByRole("heading", { name: "Draconic Bloodline" })).toBeInTheDocument();

    rerender(<ResultCard result={result({ category: "Subrace", index: "hill-dwarf", name: "élan Hill Dwarf" })} picker onClick={() => {}} />);
    expect(container.querySelector(".result-card__icon--letter")).toHaveTextContent("É");

    // Outside a creation picker (browse pages) nothing is added.
    rerender(<ResultCard result={result({ category: "Subclass", index: "draconic", name: "Draconic Bloodline" })} onClick={() => {}} />);
    expect(container.querySelector(".result-card__icon--letter")).toBeNull();
  });
});
