import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import MagicItemsPage from "./MagicItemsPage";
import { getMagicItemCatalog, getMagicItemCatalogEntry } from "../../utils/api";

vi.mock("../../utils/api", () => ({
  getMagicItemCatalog: vi.fn(),
  getMagicItemCatalogEntry: vi.fn(),
}));

// A tiny stand-in for the 600+ book items, so the counts below are exact.
vi.mock("../../utils/bookMagicItems", () => ({
  BOOK_MAGIC_ITEMS: [
    {
      index: "book_mi_alchemy-jug_0",
      name: "Alchemy Jug",
      source: "Dungeon Master's Guide",
      sourceGroup: "Official books",
      is_book_entry: true,
      edition: "2014",
      type: "Wondrous Item",
      kinds: [],
      rarities: ["Uncommon"],
      rarity: "Uncommon",
      rarityRank: 1,
      attunement: false,
      attunementLimits: { classes: [], races: [], alignments: [], spellcaster: false },
      wornSlot: null,
      consumable: null,
      usefulFor: [],
      versions: [],
      link_url: "https://dnd5e.wikidot.com/wondrous-items:alchemy-jug",
    },
  ],
}));

const entry = (overrides) => ({
  type: "Wondrous Item",
  kinds: [],
  rarities: ["Uncommon"],
  rarity: "Uncommon",
  rarityRank: 1,
  attunement: false,
  attunementLimits: { classes: [], races: [], alignments: [], spellcaster: false },
  wornSlot: null,
  consumable: false,
  usefulFor: ["Utility"],
  versions: [],
  source: "SRD 5.1",
  edition: "2014",
  ...overrides,
});

const catalog = [
  entry({ index: "mi_cloak", name: "Cloak of Elvenkind", wornSlot: "Shoulders", attunement: true, usefulFor: ["Stealth"] }),
  entry({ index: "mi_holy", name: "Holy Avenger", type: "Weapon", kinds: ["Longsword"], rarities: ["Legendary"], rarity: "Legendary", rarityRank: 4, attunement: true, attunementLimits: { classes: ["paladin"], races: [], alignments: [], spellcaster: false }, usefulFor: ["Damage"], source: "SRD 5.2", edition: "2024" }),
];

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.search}</p>;
}

function renderPage(path = "/magic-items") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/magic-items" element={<><MagicItemsPage /><LocationProbe /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getMagicItemCatalog.mockResolvedValue(catalog);
  getMagicItemCatalogEntry.mockResolvedValue({ ...catalog[0], desc: "While you wear this cloak, you are hard to see." });
});

describe("MagicItemsPage", () => {
  it("lists catalog and book items together with their key facts", async () => {
    renderPage();
    const holy = (await screen.findByText("Holy Avenger")).closest("button");
    expect(holy).toHaveTextContent("Weapon · Longsword");
    expect(holy).toHaveTextContent("Requires attunement by a Paladin");
    expect(holy).toHaveTextContent("SRD 5.2");
    expect(screen.getByText("Alchemy Jug")).toBeInTheDocument();
    expect(screen.getByText("3 items")).toBeInTheDocument();
  });

  it("filters by rarity and keeps the filter in the address", async () => {
    renderPage();
    await screen.findByText("Holy Avenger");
    await userEvent.click(screen.getByRole("button", { name: "Legendary" }));

    expect(screen.getByText("1 of 3 items match")).toBeInTheDocument();
    expect(screen.queryByText("Cloak of Elvenkind")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("rarity=Legendary");
  });

  it("opens with the filters from a bookmarked address", async () => {
    renderPage("/magic-items?slot=worn");
    expect(await screen.findByText("Cloak of Elvenkind")).toBeInTheDocument();
    expect(screen.queryByText("Holy Avenger")).not.toBeInTheDocument();
  });

  it("shows an open item's full text, and a book item's link", async () => {
    renderPage();
    await userEvent.click(await screen.findByText("Cloak of Elvenkind"));
    const detail = screen.getByRole("region", { name: "Cloak of Elvenkind" });
    expect(await within(detail).findByText("While you wear this cloak, you are hard to see.")).toBeInTheDocument();
    expect(within(detail).getByText("Shoulders")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Alchemy Jug"));
    const book = screen.getByRole("region", { name: "Alchemy Jug" });
    expect(within(book).getByRole("link", { name: "Read the full item on Wikidot" })).toHaveAttribute(
      "href",
      "https://dnd5e.wikidot.com/wondrous-items:alchemy-jug",
    );
  });

  it("still lists the book items if the catalog can't load", async () => {
    getMagicItemCatalog.mockRejectedValue(new Error("down"));
    renderPage();
    expect(await screen.findByText(/Couldn't load the SRD and Vault of Magic items/)).toBeInTheDocument();
    expect(screen.getByText("Alchemy Jug")).toBeInTheDocument();
  });
});
