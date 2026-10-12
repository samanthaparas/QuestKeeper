import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import QuickJump from "./QuickJump";

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

beforeEach(() => localStorage.clear());

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
    expect(screen.getByText('Nothing matches "xyzzy".')).toBeInTheDocument();
  });
});
