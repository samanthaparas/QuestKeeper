import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axe from "axe-core";
import SampleCharacterPage from "./SampleCharacterPage";
import SampleTablePage from "./SampleTablePage";

// The samples must stay isolated: no database, no account, no rules server,
// no table. If either page ever imports one of these, loading it fails here.
vi.mock("../../utils/supabaseClient", () => {
  throw new Error("The samples must never load the database client");
});
vi.mock("../../utils/api", () => {
  throw new Error("The samples must never call the rules server");
});
vi.mock("../../utils/tableStore", () => {
  throw new Error("The samples must never touch a real table");
});
vi.mock("../../utils/characterStore", () => {
  throw new Error("The samples must never touch real characters");
});

const fetchSpy = vi.spyOn(globalThis, "fetch");
afterEach(() => fetchSpy.mockClear());

function renderPage(Page) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
}

async function axeViolations(container) {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

describe("Sample character sheet", () => {
  it("is plainly a made-up sample, works without an account, and fetches nothing", () => {
    renderPage(SampleCharacterPage);
    expect(screen.getByText(/Sample · made-up character · nothing here is saved/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Wren Thistledown" })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("explains each part in plain text (no hover needed) and offers a clear next step", () => {
    renderPage(SampleCharacterPage);
    expect(screen.getAllByText(/^On your sheet:/).length).toBeGreaterThanOrEqual(4);
    const next = screen.getByRole("region", { name: "Make one of your own" });
    expect(within(next).getByRole("link", { name: "Take the character quiz" })).toHaveAttribute("href", "/quiz");
    // Read-only: nothing to type into or press except links.
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("has no automatically detectable accessibility problems", async () => {
    const { container } = renderPage(SampleCharacterPage);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("Sample DM table", () => {
  it("is plainly a made-up sample, works without an account, and fetches nothing", () => {
    renderPage(SampleTablePage);
    expect(screen.getByText(/Sample · made-up table · nothing here is real or saved/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows whose turn it is in words, not colour alone", () => {
    renderPage(SampleTablePage);
    const order = screen.getByRole("region", { name: "Turn order" });
    const now = within(order).getByText("Now").closest("li");
    expect(now).toHaveTextContent("Goblin 1");
    expect(screen.getByText(/Round 2 · Goblin 1's turn/)).toBeInTheDocument();
  });

  it("explains what stays secret from players, and has nothing to send or join", () => {
    renderPage(SampleTablePage);
    expect(screen.getByRole("heading", { name: "Monsters (only the DM sees this)" })).toBeInTheDocument();
    expect(screen.getByText(/HP, AC and attacks stay with the DM/)).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });

  it("has no automatically detectable accessibility problems", async () => {
    const { container } = renderPage(SampleTablePage);
    expect(await axeViolations(container)).toEqual([]);
  });
});
