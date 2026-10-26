import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CharactersPage from "./CharactersPage";
import { listCharacters, deleteCharacter, saveCharacterOrder } from "../../utils/characterStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/characterStore", async (importOriginal) => ({
  ...(await importOriginal()),
  listCharacters: vi.fn(),
  deleteCharacter: vi.fn(),
  saveCharacterOrder: vi.fn(),
}));

const PIPPA = { id: "c1", name: "Pippa", level: 4, race: { name: "Half-Elf" }, class: { name: "Ranger" }, listPosition: 0 };
const BROM = { id: "c2", name: "Brom", level: 3, race: { name: "Human" }, class: { name: "Fighter" }, listPosition: 1 };

function renderPage() {
  return render(
    <MemoryRouter>
      <CharactersPage />
    </MemoryRouter>,
  );
}

describe("CharactersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCharacters.mockResolvedValue([PIPPA, BROM]);
  });

  it("shows the banner heading and a link to each sheet", async () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Your Characters" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Pippa/ })).toHaveAttribute("href", "/characters/c1");
    expect(screen.getByRole("link", { name: /Brom/ })).toHaveAttribute("href", "/characters/c2");
    expect(screen.getByText(/Level 4 · Half-Elf · Ranger/)).toBeInTheDocument();
  });

  it("asks before deleting, and Keep changes nothing", async () => {
    renderPage();
    await screen.findByRole("link", { name: /Pippa/ });
    await userEvent.click(screen.getByRole("button", { name: "Delete Pippa" }));
    const question = screen.getByRole("group", { name: "Delete Pippa?" });
    expect(question).toHaveTextContent("This can't be undone");
    await userEvent.click(within(question).getByRole("button", { name: "Keep" }));
    expect(deleteCharacter).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "Delete Pippa?" })).not.toBeInTheDocument();
  });

  it("reorders with arrows and saves only when asked", async () => {
    renderPage();
    await screen.findByRole("link", { name: /Pippa/ });
    await userEvent.click(screen.getByRole("button", { name: "Reorder" }));
    await userEvent.click(screen.getByRole("button", { name: "Move Brom up" }));
    expect(saveCharacterOrder).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Save order" }));
    expect(saveCharacterOrder).toHaveBeenCalledWith(["c2", "c1"]);
  });

  it("says so when there are no characters", async () => {
    listCharacters.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/No characters yet/)).toBeInTheDocument();
  });

  it("says so when the characters can't load, never 'No characters yet', and tries again", async () => {
    listCharacters.mockRejectedValueOnce(new Error("offline"));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load your characters. Check your connection and try again.");
    expect(screen.queryByText(/No characters yet/)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("link", { name: /Pippa/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    // The button that was pressed is gone, so keyboard focus goes to the page heading, not nowhere.
    expect(screen.getByRole("heading", { level: 1, name: "Your Characters" })).toHaveFocus();
  });

  it("says it is loading first, and 'No characters yet' only when the list really is empty", async () => {
    listCharacters.mockResolvedValueOnce([]);
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your characters");
    expect(await screen.findByText("No characters yet. Create one to get started.")).toBeInTheDocument();
  });
});
