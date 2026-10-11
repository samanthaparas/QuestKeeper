import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SubclassBrowser from "./SubclassBrowser";
import { getSubclassDetails } from "../../utils/api";

vi.mock("../../utils/api", () => ({ getSubclassDetails: vi.fn() }));

const DETAILS = {
  thief: { index: "thief", name: "Thief", subclass_flavor: "Roguish Archetype", desc: ["Fast hands."] },
  "toh_cat-burglar": {
    index: "toh_cat-burglar",
    name: "Cat Burglar",
    source: "Tome of Heroes",
    subclass_flavor: "Roguish Archetype",
    desc: ["Climb in through windows."],
    features: [{ name: "Artful Dodger", level: 3, desc: ["Dodge traps."] }],
  },
  "book_rogue-swashbuckler": {
    index: "book_rogue-swashbuckler",
    name: "Swashbuckler",
    is_book_entry: true,
    source: "Xanathar's Guide to Everything",
    book: "Xanathar's Guide to Everything",
    summary: "A dashing duelist.",
    link_url: "https://dnd5e.wikidot.com/rogue:swashbuckler",
    class: { index: "rogue", name: "Rogue" },
    can_make_homebrew: true,
  },
  "book_rogue-assassin": {
    index: "book_rogue-assassin",
    name: "Assassin",
    is_book_entry: true,
    source: "Player's Handbook (2014)",
    book: "Player's Handbook (2014)",
    summary: "A stealthy killer.",
    link_url: "https://dnd5e.wikidot.com/rogue:assassin",
    class: { index: "rogue", name: "Rogue" },
    can_make_homebrew: true,
  },
};

const groups = [
  { source: "SRD 5.1", items: [{ index: "thief", name: "Thief" }] },
  {
    source: "Official books",
    items: [
      { index: "book_rogue-assassin", name: "Assassin" },
      { index: "book_rogue-swashbuckler", name: "Swashbuckler" },
    ],
  },
  { source: "Tome of Heroes", items: [{ index: "toh_cat-burglar", name: "Cat Burglar" }] },
];

function renderBrowser(props = {}) {
  render(
    <MemoryRouter>
      <SubclassBrowser groups={groups} {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getSubclassDetails.mockImplementation((index) => Promise.resolve(DETAILS[index]));
});

describe("SubclassBrowser", () => {
  it("has one tab per source and opens the first subclass right away", async () => {
    renderBrowser();
    expect(screen.getByRole("tab", { name: "SRD 5.1 (1)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Official books (2)" })).toBeInTheDocument();
    expect(await screen.findByText("Fast hands.")).toBeInTheDocument();
  });

  it("switches tabs and subclasses in place", async () => {
    renderBrowser();
    await userEvent.click(screen.getByRole("tab", { name: "Official books (2)" }));
    expect(await screen.findByText("A stealthy killer.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Swashbuckler" }));
    expect(await screen.findByText("A dashing duelist.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Swashbuckler" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("tab", { name: "Tome of Heroes (1)" }));
    expect(await screen.findByText("Climb in through windows.")).toBeInTheDocument();
    expect(screen.getByText(/Artful Dodger \(level 3\)/)).toBeInTheDocument();
  });

  it("remembers each tab's pick and loads each subclass only once", async () => {
    renderBrowser();
    await userEvent.click(screen.getByRole("tab", { name: "Official books (2)" }));
    await userEvent.click(await screen.findByRole("button", { name: "Swashbuckler" }));
    await screen.findByText("A dashing duelist.");

    await userEvent.click(screen.getByRole("tab", { name: "SRD 5.1 (1)" }));
    await userEvent.click(screen.getByRole("tab", { name: "Official books (2)" }));
    expect(await screen.findByText("A dashing duelist.")).toBeInTheDocument();
    expect(getSubclassDetails.mock.calls.filter(([index]) => index === "book_rogue-swashbuckler")).toHaveLength(1);
  });

  it("moves between tabs with the arrow keys", async () => {
    renderBrowser();
    screen.getByRole("tab", { name: "SRD 5.1 (1)" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Official books (2)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Official books (2)" })).toHaveFocus();
  });

  it("keeps book entries from linking away inside a picker", async () => {
    renderBrowser({ inPicker: true });
    await userEvent.click(screen.getByRole("tab", { name: "Official books (2)" }));
    await screen.findByText("A stealthy killer.");
    expect(screen.queryByRole("link", { name: "Make it as homebrew" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read the full rules on Wikidot" })).toBeInTheDocument();
  });

  it("says so when a subclass can't load", async () => {
    getSubclassDetails.mockRejectedValue(new Error("down"));
    renderBrowser();
    expect(await screen.findByText(/Couldn't load this subclass/)).toBeInTheDocument();
  });
});
