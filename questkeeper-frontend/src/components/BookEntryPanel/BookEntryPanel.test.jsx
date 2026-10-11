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
    expect(screen.getByText(/variant of the Entertainer background/)).toBeInTheDocument();
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

  it("explains that whole classes can't be homebrew yet", () => {
    renderPanel({
      category: "class",
      name: "Artificer",
      book: "Tasha's Cauldron of Everything",
      summary: "Inventors.",
      linkUrl: "https://dnd5e.wikidot.com/artificer",
    });
    expect(screen.queryByRole("link", { name: "Make it as homebrew" })).not.toBeInTheDocument();
    expect(screen.getByText(/can't build whole classes yet/)).toBeInTheDocument();
  });

  it("names a subclass's class and sends it to the subclass form", () => {
    renderPanel({
      category: "subclass",
      name: "Swashbuckler",
      book: "Xanathar's Guide to Everything",
      summary: "A dashing duelist.",
      linkUrl: "https://dnd5e.wikidot.com/rogue:swashbuckler",
      classIndex: "rogue",
      className: "Rogue",
      canMakeHomebrew: true,
    });
    expect(screen.getByText(/A Rogue subclass\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Make it as homebrew" })).toBeInTheDocument();
    expect(screen.getByText(/features, with the level each one is gained/)).toBeInTheDocument();
  });

  it("explains when a subclass's class has no rules yet", () => {
    renderPanel({
      category: "subclass",
      name: "Armorer",
      book: "Tasha's Cauldron of Everything",
      summary: "Power armor.",
      linkUrl: "https://dnd5e.wikidot.com/artificer:armorer",
      classIndex: "artificer",
      className: "Artificer",
      canMakeHomebrew: false,
    });
    expect(screen.queryByRole("link", { name: "Make it as homebrew" })).not.toBeInTheDocument();
    expect(screen.getByText(/class QuestKeeper doesn't have rules for yet/)).toBeInTheDocument();
  });
});
