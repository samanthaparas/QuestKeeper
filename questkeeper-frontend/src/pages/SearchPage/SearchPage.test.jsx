import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import SearchPage from "./SearchPage";
import { getClasses, getRaces, getSpells, getBackgrounds } from "../../utils/api";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/api", () => ({
  getClasses: vi.fn(),
  getRaces: vi.fn(),
  getSpells: vi.fn(),
  getBackgrounds: vi.fn(),
  getSpellDetails: vi.fn((index) => Promise.resolve({ index, name: index === "fireball" ? "Fireball" : "Fire Bolt", level: 3 })),
  getBackgroundDetails: vi.fn(),
}));
vi.mock("../../utils/srdDetails", async (importOriginal) => ({
  ...(await importOriginal()),
  mapSpellToPanel: (data) => ({ name: data.name, category: "Spell", description: "Boom." }),
}));

function Address() {
  const { search } = useLocation();
  return <p data-testid="address">{search}</p>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/search"
          element={
            <>
              <SearchPage />
              <Address />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SearchPage", () => {
  beforeEach(() => {
    getClasses.mockResolvedValue([]);
    getRaces.mockResolvedValue([
      { index: "toh_minotaur", name: "Minotaur", source: "Tome of Heroes" },
      { index: "book_minotaur", name: "Minotaur", source: "Monsters of the Multiverse", sourceGroup: "Official books" },
    ]);
    getSpells.mockResolvedValue([
      { index: "fireball", name: "Fireball" },
      { index: "fire-bolt", name: "Fire Bolt" },
    ]);
    getBackgrounds.mockResolvedValue([]);
  });

  it("keeps an opened result in the address, so it reloads and can be shared", async () => {
    const user = userEvent.setup();
    const first = renderAt("/search?q=fire");
    await user.click(await screen.findByRole("button", { name: /^Fireball/ }));
    // Waits for the loaded details (the name also shows while they load).
    await waitFor(() => expect(screen.getByRole("heading", { level: 2, name: "Fireball" })).toBeInTheDocument());
    expect(screen.getByTestId("address")).toHaveTextContent("?q=fire&open=spell%3Afireball");

    first.unmount();
    renderAt("/search?q=fire&open=spell%3Afireball");
    // Waits for the loaded details (the name also shows while they load).
    await waitFor(() => expect(screen.getByRole("heading", { level: 2, name: "Fireball" })).toBeInTheDocument());
  });

  it("lists both Minotaurs once each, and says what it searches", async () => {
    renderAt("/search?q=mino");
    const list = await screen.findByRole("region", { name: "results list" });
    expect(within(list).getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText(/Looks through the names of classes, races, spells and backgrounds/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Search results for “mino”");
  });
});
