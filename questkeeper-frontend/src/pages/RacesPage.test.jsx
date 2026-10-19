import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import RacesPage from "./RacesPage";
import { getRaces } from "../utils/api";

vi.mock("../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../utils/api", () => ({ getRaces: vi.fn() }));
vi.mock("../utils/srdDetails", async (importOriginal) => ({
  ...(await importOriginal()),
  loadRaceDetails: vi.fn((index) => Promise.resolve({ index, name: index === "elf" ? "Elf" : "Minotaur" })),
  mapRaceToPanel: (data) => ({ name: data.name, category: "Race", description: "Details." }),
}));

// Two Minotaurs from different books: they share a name, nothing else.
const RACES = [
  { index: "elf", name: "Elf", source: "SRD 5.1" },
  { index: "toh_minotaur", name: "Minotaur", source: "Tome of Heroes" },
  {
    index: "book_minotaur",
    name: "Minotaur",
    source: "Mordenkainen Presents: Monsters of the Multiverse",
    sourceGroup: "Official books",
  },
  { index: "toh_alseid", name: "Alseid", source: "Tome of Heroes" },
];

function Address() {
  const { search } = useLocation();
  return <p data-testid="address">{search}</p>;
}

function renderPage(path = "/races") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/races"
          element={
            <>
              <RacesPage />
              <Address />
            </>
          }
        />
        <Route path="/search" element={<Address />} />
      </Routes>
    </MemoryRouter>,
  );
}

const cards = () =>
  within(screen.getByRole("region", { name: "races list" }))
    .queryAllByRole("button")
    .map((card) => card.textContent);
const pick = (label) => screen.getByRole("button", { name: new RegExp(`^${label}`) });

describe("RacesPage", () => {
  beforeEach(() => {
    getRaces.mockResolvedValue(RACES);
  });

  it("shows each source's own entries, with counts that match, however often the filter changes", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("4 races");

    for (let round = 0; round < 3; round += 1) {
      await user.click(pick("Official books"));
      expect(cards()).toHaveLength(1);
      expect(cards()[0]).toMatch(/Minotaur.*Monsters of the Multiverse/);
      expect(screen.getByText("1 of 4 races match")).toBeInTheDocument();

      await user.click(pick("Tome of Heroes"));
      expect(cards()).toHaveLength(2);
      expect(cards().every((text) => text.includes("Tome of Heroes"))).toBe(true);

      await user.click(pick("All"));
      expect(cards()).toHaveLength(4);
    }
  });

  it("says nothing matches, from the same list the cards use", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByLabelText("Search races"), "zzz");
    expect(screen.getByText(/No races match/)).toBeInTheDocument();
    expect(cards()).toHaveLength(0);
  });

  it("opens a direct link and keeps it in the address", async () => {
    renderPage("/races?open=book_minotaur");
    // The loaded details (the name shows first while they load).
    expect(await screen.findByText("Details.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Minotaur" })).toBeInTheDocument();
    expect(screen.getByTestId("address")).toHaveTextContent("?open=book_minotaur");
  });

  it("names the search's scope, and only searches everywhere when asked", async () => {
    const user = userEvent.setup();
    renderPage();
    const box = await screen.findByLabelText("Search races");
    expect(box).toHaveAccessibleDescription(/Filters the races below as you type/);
    await user.type(box, "mino{Enter}");
    // Enter just filters; it doesn't leave the page.
    expect(cards()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Search everywhere" }));
    expect(screen.getByTestId("address")).toHaveTextContent("?q=mino");
  });
});
