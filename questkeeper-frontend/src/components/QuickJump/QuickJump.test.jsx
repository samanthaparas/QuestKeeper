import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import QuickJump from "./QuickJump";
import { searchByMeaning } from "../../utils/api";
import { installFakeStorage } from "../../test/fakeStorage";
import { openQuickSearch } from "../../utils/quickJump";

vi.mock("../../context/useAuth", () => ({ useAuth: () => ({ user: { id: "me" } }) }));

vi.mock("../../utils/quickJumpIndex", () => ({
  pageEntries: () => [
    { id: "page:/spells", label: "Spells", category: "Pages", hint: "Search and filter every spell", to: "/spells" },
    { id: "page:/guide", label: "Guide", category: "Pages", hint: "New to D&D? Start here", to: "/guide" },
  ],
  loadContentLists: () => [
    Promise.resolve([
      { id: "spell:fireball", label: "Fireball", category: "Spells", hint: "Level 3 · Evocation", to: "/spells?open=fireball" },
      { id: "spell:fire-bolt", label: "Fire Bolt", category: "Spells", hint: "Cantrip · Evocation", to: "/spells?open=fire-bolt" },
    ]),
    Promise.resolve([
      { id: "race:fire", label: "Genasi (Fire)", category: "Races", hint: "Fiery temper", to: "/races?open=book_genasi-fire" },
    ]),
  ],
  loadCharacterEntries: () =>
    Promise.resolve([
      { id: "character:1", label: "Billie", category: "My Characters", hint: "Level 5 · Tiefling · Paladin", to: "/characters/1" },
    ]),
}));

vi.mock("../../utils/api", () => ({ searchByMeaning: vi.fn() }));

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

async function renderSearch() {
  render(
    <MemoryRouter>
      <QuickJump />
      <input aria-label="Another box" />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Lets the mocked lists finish loading.
async function settle() {
  await act(async () => {});
}

const searchBox = () => screen.getByRole("combobox");

beforeEach(() => {
  installFakeStorage();
});

describe("QuickJump", () => {
  it("opens from the button, with every page listed before typing", async () => {
    await renderSearch();
    fireEvent.click(screen.getByRole("button", { name: "Search QuestKeeper" }));
    await settle();

    expect(searchBox()).toHaveFocus();
    expect(screen.getByRole("group", { name: "Pages" })).toBeInTheDocument();
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      expect.stringContaining("Spells"),
      expect.stringContaining("Guide"),
    ]);
  });

  it("opens with / and ⌘K, but not while typing in another box", async () => {
    await renderSearch();

    fireEvent.keyDown(screen.getByLabelText("Another box"), { key: "/" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(document.body, { key: "/" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await settle();

    fireEvent.keyDown(searchBox(), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(document.body, { key: "k", metaKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await settle();
  });

  it("finds content and characters, grouped, and opens the highlighted one", async () => {
    await renderSearch();
    fireEvent.keyDown(document.body, { key: "/" });
    await settle();

    fireEvent.change(searchBox(), { target: { value: "fire" } });
    expect(screen.getAllByRole("group").map((group) => group.getAttribute("aria-label"))).toEqual([
      "Races",
      "Spells",
      "Search by meaning",
    ]);

    // ↓ twice: Genasi (Fire) → Fire Bolt → Fireball.
    fireEvent.keyDown(searchBox(), { key: "ArrowDown" });
    fireEvent.keyDown(searchBox(), { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: /Fireball/ })).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(searchBox(), { key: "Enter" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("where")).toHaveTextContent("/spells?open=fireball");
  });

  it("searches the player's own characters", async () => {
    await renderSearch();
    fireEvent.keyDown(document.body, { key: "/" });
    await settle();

    fireEvent.change(searchBox(), { target: { value: "bil" } });
    fireEvent.click(screen.getByRole("option", { name: /Billie/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/characters/1");
  });

  it("remembers recent picks, which can be cleared", async () => {
    await renderSearch();
    fireEvent.keyDown(document.body, { key: "/" });
    await settle();
    fireEvent.change(searchBox(), { target: { value: "fireball" } });
    fireEvent.keyDown(searchBox(), { key: "Enter" });

    fireEvent.keyDown(document.body, { key: "/" });
    await settle();
    const recent = screen.getByRole("group", { name: "Recent" });
    expect(recent).toHaveTextContent("Fireball");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByRole("group", { name: "Recent" })).toBeNull();
  });

  it("says when nothing matches", async () => {
    await renderSearch();
    fireEvent.keyDown(document.body, { key: "/" });
    await settle();

    fireEvent.change(searchBox(), { target: { value: "xyzzy" } });
    expect(screen.getByText('No names match "xyzzy". Try Search by meaning above.')).toBeInTheDocument();
  });

  it("searches by meaning only when asked, then lists the picks with their reasons", async () => {
    searchByMeaning.mockResolvedValue({
      results: [
        { id: "spell:cure-wounds", name: "Cure Wounds", category: "Spells", why: "Heals a creature you touch." },
      ],
    });
    await renderSearch();
    fireEvent.keyDown(document.body, { key: "/" });
    await settle();

    fireEvent.change(searchBox(), { target: { value: "heal my friend" } });
    expect(searchByMeaning).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("option", { name: /Search by meaning: “heal my friend”/ }));
    await settle();
    expect(searchByMeaning).toHaveBeenCalledWith("heal my friend");

    const pickedByMeaning = screen.getByRole("group", { name: "Search by meaning" });
    expect(pickedByMeaning).toHaveTextContent("Cure Wounds");
    expect(pickedByMeaning).toHaveTextContent("Heals a creature you touch.");

    fireEvent.click(screen.getByRole("option", { name: /Cure Wounds/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/spells?open=cure-wounds");
  });

  it("shows why a search by meaning came back empty", async () => {
    searchByMeaning.mockResolvedValue({ results: [], message: "AI search isn't set up yet." });
    await renderSearch();
    fireEvent.keyDown(document.body, { key: "/" });
    await settle();

    fireEvent.change(searchBox(), { target: { value: "heal" } });
    fireEvent.click(screen.getByRole("option", { name: /Search by meaning/ }));
    await settle();

    expect(screen.getByText("AI search isn't set up yet.")).toBeInTheDocument();
  });
});

describe("QuickJump opened from another page", () => {
  it("opens with the words in it and runs the search by meaning straight away", async () => {
    searchByMeaning.mockResolvedValue({
      results: [{ id: "pass-without-trace", name: "Pass without Trace", category: "Spell", why: "Hides your group" }],
    });
    await renderSearch();
    act(() => openQuickSearch({ query: "Help me sneak past guards", meaning: true }));
    expect(searchBox()).toHaveValue("Help me sneak past guards");
    expect(searchByMeaning).toHaveBeenCalledWith("Help me sneak past guards");
    expect(await screen.findByText("Pass without Trace")).toBeInTheDocument();
  });

  it("opens with words but asks nothing when meaning isn't wanted", async () => {
    searchByMeaning.mockClear();
    await renderSearch();
    act(() => openQuickSearch({ query: "fire" }));
    expect(searchBox()).toHaveValue("fire");
    expect(searchByMeaning).not.toHaveBeenCalled();
  });
});
