import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BookEntryPanel from "./BookEntryPanel";

const gladiator = {
  name: "Gladiator",
  book: "Player's Handbook (2014)",
  summary: "You fought in the arena.",
  linkUrl: "https://dnd5e.wikidot.com/background:entertainer",
  variantOf: "Entertainer",
};

function renderPanel(entry) {
  render(
    <MemoryRouter>
      <BookEntryPanel entry={entry} />
    </MemoryRouter>,
  );
}

describe("BookEntryPanel", () => {
  it("shows our summary, the book, and a link to the full rules", () => {
    renderPanel(gladiator);
    expect(screen.getByText("You fought in the arena.")).toBeInTheDocument();
    expect(screen.getByText(/a variant of the Entertainer background/)).toBeInTheDocument();
    const rules = screen.getByRole("link", { name: "Read the full rules on Wikidot" });
    expect(rules).toHaveAttribute("href", gladiator.linkUrl);
    expect(rules).toHaveAttribute("target", "_blank");
    expect(rules).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("links to My Homebrew outside character creation", () => {
    renderPanel(gladiator);
    expect(screen.getByRole("link", { name: "Make it as homebrew" })).toHaveAttribute(
      "href",
      "/homebrew",
    );
  });

  it("leaves that link out inside a creation picker", () => {
    renderPanel({ ...gladiator, inPicker: true });
    expect(screen.queryByRole("link", { name: "Make it as homebrew" })).not.toBeInTheDocument();
  });

  it("sends a race to the race homebrew form, with the race hint", () => {
    renderPanel({
      category: "race",
      name: "Tabaxi",
      book: "Mordenkainen Presents: Monsters of the Multiverse",
      summary: "Cat-folk.",
      linkUrl: "https://dnd5e.wikidot.com/lineage:tabaxi",
    });
    expect(screen.getByText(/speed, size, ability bonuses and traits/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Make it as homebrew" })).toHaveAttribute("href", "/homebrew");
  });
});
