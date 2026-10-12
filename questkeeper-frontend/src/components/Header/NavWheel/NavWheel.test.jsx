import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import NavWheel from "./NavWheel";
import Navigation from "../Navigation/Navigation";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/guide", label: "Guide" },
  { to: "/races", label: "Races" },
  { to: "/spells", label: "Spells" },
];

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderWithRouter(ui, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

// matchMedia answers for the narrow-screen and reduced-motion queries.
function mockMedia({ narrow = false, reduceMotion = false } = {}) {
  window.matchMedia = vi.fn((query) => ({
    matches: query.includes("max-width") ? narrow : reduceMotion,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

afterEach(() => {
  delete window.matchMedia;
  vi.useRealTimers();
});

describe("NavWheel", () => {
  it("lists every link in order as ordinary links", () => {
    renderWithRouter(<NavWheel links={LINKS} />);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(
      ["Home", "Guide", "Races", "Spells"],
    );
    expect(screen.getByText("Swipe or use ↑ ↓ to spin")).toBeInTheDocument();
  });

  it("follows the centred link straight away and closes the menu", () => {
    const onNavigate = vi.fn();
    renderWithRouter(<NavWheel links={LINKS} onNavigate={onNavigate} />);

    // With no layout in the test browser, the first link counts as centred.
    fireEvent.click(screen.getByRole("link", { name: "Home" }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("spins an off-centre link into the band before following it", () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    renderWithRouter(<NavWheel links={LINKS} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("link", { name: "Spells" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/");
    expect(onNavigate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId("where")).toHaveTextContent("/spells");
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("moves between links with the arrow keys, Home and End", () => {
    renderWithRouter(<NavWheel links={LINKS} />);
    const guide = screen.getByRole("link", { name: "Guide" });
    guide.focus();

    fireEvent.keyDown(guide, { key: "ArrowDown" });
    expect(screen.getByRole("link", { name: "Races" })).toHaveFocus();

    fireEvent.keyDown(document.activeElement, { key: "ArrowUp" });
    expect(guide).toHaveFocus();

    fireEvent.keyDown(document.activeElement, { key: "End" });
    expect(screen.getByRole("link", { name: "Spells" })).toHaveFocus();

    fireEvent.keyDown(document.activeElement, { key: "Home" });
    expect(screen.getByRole("link", { name: "Home" })).toHaveFocus();
  });
  it("runs a button row's action instead of following a link", () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    renderWithRouter(
      <NavWheel
        links={[{ id: "explore", label: "Explore ›", onSelect, current: true }, ...LINKS]}
        onBack={onBack}
      />,
    );

    const explore = screen.getByRole("button", { name: "Explore ›" });
    expect(explore).toHaveClass("active");
    fireEvent.click(explore);
    expect(onSelect).toHaveBeenCalledTimes(1);

    // ← goes back up a level.
    fireEvent.keyDown(explore, { key: "ArrowLeft" });
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("Navigation picks the right menu", () => {
  it("shows the three menus on wide screens, each opening its pages", () => {
    mockMedia({ narrow: false });
    renderWithRouter(<Navigation />);

    expect(document.querySelector(".nav-wheel")).toBeNull();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(
      ["Explore", "My Adventures", "Help"],
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Explore" }));
    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      expect.stringContaining("Races"),
      expect.stringContaining("Classes"),
      expect.stringContaining("Backgrounds"),
      expect.stringContaining("Spells"),
      expect.stringContaining("Magic Items"),
    ]);
  });

  it("shows the three menus on the wheel, then a menu's pages", () => {
    mockMedia({ narrow: true });
    renderWithRouter(<Navigation isMenuOpen />, "/spells");

    expect(document.querySelector(".nav-wheel")).not.toBeNull();
    const explore = screen.getByRole("button", { name: "Explore ›" });
    // Spells is in Explore, so Explore gets the dot.
    expect(explore).toHaveClass("active");

    fireEvent.click(explore);
    expect(screen.getByRole("link", { name: "Spells" })).toHaveClass("active");
    expect(screen.getAllByRole("link")).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: "‹ All menus" }));
    expect(screen.getByRole("button", { name: "Help ›" })).toBeInTheDocument();
  });

  it("keeps a plain list, grouped by menu, for people who prefer less motion", () => {
    mockMedia({ narrow: true, reduceMotion: true });
    renderWithRouter(<Navigation isMenuOpen />);

    expect(document.querySelector(".nav-wheel")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(11);
    expect(screen.getByRole("region", { name: "My Adventures" })).toBeInTheDocument();
  });

  it("closes the menu when a link in the plain list is picked", () => {
    mockMedia({ narrow: true });
    const onNavigate = vi.fn();
    renderWithRouter(<Navigation onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("link", { name: "Races" }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
