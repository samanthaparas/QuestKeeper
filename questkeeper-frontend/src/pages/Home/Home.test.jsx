import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import axe from "axe-core";
import Home from "./Home";
import { OPEN_SEARCH_EVENT } from "../../utils/quickJump";
import { readDestination, rememberDestination } from "../../utils/continueAfterLogin";
import { installFakeStorage } from "../../test/fakeStorage";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
const auth = vi.hoisted(() => ({ user: null }));
vi.mock("../../context/useAuth", () => ({ useAuth: () => ({ user: auth.user, isLoading: false }) }));
const recent = vi.hoisted(() => ({ character: null }));
vi.mock("../../utils/characterStore", () => ({
  getMostRecentCharacter: () => Promise.resolve(recent.character),
}));

function Landed() {
  const location = useLocation();
  return <p data-testid="landed">{`${location.pathname}${location.search} ${JSON.stringify(location.state)}`}</p>;
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Home", () => {
  beforeEach(() => {
    installFakeStorage();
    auth.user = null;
    recent.character = null;
  });

  it("makes the quiz the one main step, and says what to expect", async () => {
    renderHome();
    const quiz = screen.getByRole("link", { name: "Discover your hero with the quiz" });
    expect(quiz).toHaveAttribute("href", "/quiz");
    expect(quiz).toHaveClass("home__cta");
    expect(quiz).not.toHaveClass("home__cta--quiet");
    expect(screen.getByText(/Up to 20 short questions/)).toHaveTextContent("your results are ready after 5 answers");
  });

  it("tells name search and meaning search apart, and opens the meaning search with the example", async () => {
    const heard = vi.fn();
    window.addEventListener(OPEN_SEARCH_EVENT, heard);
    renderHome();
    expect(screen.getByLabelText("Search by name")).toHaveAccessibleDescription(/whose name matches/);
    const meaning = screen.getByRole("region", { name: "Don't know the name? Search by meaning" });
    await userEvent.click(within(meaning).getByRole("button", { name: /Help me sneak past guards/ }));
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard.mock.calls[0][0].detail).toEqual({ query: "Help me sneak past guards", meaning: true });
    window.removeEventListener(OPEN_SEARCH_EVENT, heard);
  });

  it("offers three paths, each with a sample to see before signing up", () => {
    renderHome();
    const paths = screen.getByRole("region", { name: "Where would you like to start?" });
    expect(within(paths).getByRole("heading", { name: "Discover your hero" })).toBeInTheDocument();
    expect(within(paths).getByRole("heading", { name: "Play at your table" })).toBeInTheDocument();
    expect(within(paths).getByRole("heading", { name: "Run a session" })).toBeInTheDocument();
    expect(within(paths).getByRole("link", { name: "See a sample character sheet" })).toHaveAttribute("href", "/sample/character");
    expect(within(paths).getByRole("link", { name: "See a sample DM table" })).toHaveAttribute("href", "/sample/table");
  });

  it("after signing in (say, from an email link), offers to pick up where they left off", async () => {
    rememberDestination({ from: "/characters/new", fromState: { quizBuild: "iron-guardian" } });
    auth.user = { id: "u1" };
    renderHome();
    expect(screen.getByRole("heading", { name: "Pick up where you left off" })).toBeInTheDocument();
    expect(screen.getByText("Before signing in, you were about to: Save your Iron Guardian.")).toBeInTheDocument();
    expect(screen.queryByText(/After you sign in/)).toBeNull();
    // That's now the main step; the quiz steps back.
    expect(screen.getByRole("link", { name: "Discover your hero with the quiz" })).toHaveClass("home__cta--quiet");
    await userEvent.click(screen.getByRole("button", { name: "Continue creating your Iron Guardian" }));
    expect(screen.getByTestId("landed")).toHaveTextContent('/characters/new {"quizBuild":"iron-guardian"}');
    expect(readDestination()).toBeNull();
  });

  it("lets them say no to it, and never offers it while signed out", async () => {
    rememberDestination({ from: "/characters/new" });
    const first = renderHome();
    expect(screen.queryByRole("heading", { name: "Pick up where you left off" })).toBeNull();
    first.unmount();

    auth.user = { id: "u1" };
    renderHome();
    await userEvent.click(screen.getByRole("button", { name: "No thanks" }));
    expect(screen.queryByRole("heading", { name: "Pick up where you left off" })).toBeNull();
    expect(readDestination()).toBeNull();
  });

  it("adds the hero illustration as decoration only, so nothing extra is read out", () => {
    const { container } = renderHome();
    const art = container.querySelector(".home__hero-art");
    expect(art.getAttribute("src")).toBeTruthy();
    expect(art).toHaveAttribute("alt", "");
    // Not a link or button, and the heading stays the first thing in the hero.
    expect(art.closest("a, button")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Find your way into the story.");
  });

  it("keeps the six category links, in order, with decorative artwork", () => {
    const { container } = renderHome();
    const links = [...container.querySelectorAll(".home__categories .category-link")];
    expect(links.map((link) => [link.querySelector("h3").textContent, link.getAttribute("href")])).toEqual([
      ["Races", "/races"],
      ["Classes", "/classes"],
      ["Backgrounds", "/backgrounds"],
      ["Spells", "/spells"],
      ["Feats", "/feats"],
      ["Magic Items", "/magic-items"],
    ]);
    for (const link of links) {
      const art = link.querySelector("img");
      // Real artwork, hidden from screen readers so each link reads as its name.
      expect(art.getAttribute("src")).toBeTruthy();
      expect(art).toHaveAttribute("alt", "");
    }
    expect(screen.getByRole("link", { name: /^Races/ })).toHaveAttribute("href", "/races");
  });

  it("shows your character only while you're signed in, and hides it the moment you sign out", async () => {
    recent.character = {
      id: "c1",
      name: "Bram",
      level: 3,
      race: { name: "Dwarf" },
      class: { name: "Fighter" },
      combat: { hitPoints: { current: 20, max: 28 } },
      spellcasting: null,
    };
    auth.user = { id: "u1" };
    const view = renderHome();
    expect(await screen.findByRole("heading", { name: "Welcome back, Bram" })).toBeInTheDocument();
    expect(screen.getByText("20 / 28 HP")).toBeInTheDocument();

    // Signing out from the header keeps you on this page: the card must go.
    auth.user = null;
    view.rerender(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("heading", { name: /Welcome back/ })).toBeNull();
    expect(screen.queryByText("20 / 28 HP")).toBeNull();
  });

  it("never shows a character while signed out", async () => {
    recent.character = { id: "c1", name: "Bram", level: 3, combat: { hitPoints: { current: 1, max: 1 } } };
    renderHome();
    // Give any stray load a chance to finish before checking.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("heading", { name: /Welcome back/ })).toBeNull();
  });

  it("has no automatically detectable accessibility problems", async () => {
    const { container } = renderHome();
    const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
