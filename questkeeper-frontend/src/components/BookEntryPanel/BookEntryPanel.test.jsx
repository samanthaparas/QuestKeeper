import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BookEntryPanel from "./BookEntryPanel";
import { loadHomebrew } from "../../utils/homebrewCache";

// No signed-in player here, so no homebrew unless a test says otherwise.
vi.mock("../../utils/homebrewCache", () => ({ loadHomebrew: vi.fn(async () => []) }));

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

  it("asks for the homebrew class first for a book class's subclass", () => {
    renderPanel({
      category: "subclass",
      name: "Armorer",
      book: "Tasha's Cauldron of Everything",
      summary: "Power armor.",
      linkUrl: "https://dnd5e.wikidot.com/artificer:armorer",
      classIndex: "artificer",
      className: "Artificer",
      canMakeHomebrew: true,
    });
    expect(screen.getByRole("link", { name: "Make it as homebrew" })).toBeInTheDocument();
    expect(screen.getByText(/Make your homebrew Artificer first/)).toBeInTheDocument();
  });

  it("lets a whole book class become homebrew", () => {
    renderPanel({
      category: "class",
      name: "Artificer",
      book: "Tasha's Cauldron of Everything",
      summary: "Magical inventors.",
      linkUrl: "https://dnd5e.wikidot.com/artificer",
      classIndex: "artificer",
    });
    expect(screen.getByRole("link", { name: "Make it as homebrew" })).toBeInTheDocument();
    expect(screen.getByText(/hit die, proficiencies, spellcasting/)).toBeInTheDocument();
  });

  it("shows the group's notes when they made this entry into homebrew", async () => {
    loadHomebrew.mockResolvedValueOnce([
      {
        category: "background",
        name: "Gladiator",
        based_on: gladiator.book,
        link_url: gladiator.linkUrl,
        summary: "Arena fighter who knows how to work a crowd.",
        data: { feature: { name: "By Popular Demand", description: "Free lodging wherever fights are held." } },
      },
    ]);
    renderPanel(gladiator);

    expect(await screen.findByText("Arena fighter who knows how to work a crowd.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Your group's notes" })).toHaveTextContent(
      "Free lodging wherever fights are held.",
    );
  });

  it("shows no notes box when there is no matching homebrew", async () => {
    renderPanel(gladiator);
    await screen.findByText("You fought in the arena.");
    expect(screen.queryByRole("region", { name: "Your group's notes" })).toBeNull();
  });
});
