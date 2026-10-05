import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TablesPage from "./TablesPage";
import { listCharacters } from "../../utils/characterStore";
import { createTable, joinTable, listMyTables } from "../../utils/tableStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../context/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("../../utils/characterStore", () => ({ listCharacters: vi.fn() }));
vi.mock("../../utils/tableStore", () => ({
  createTable: vi.fn(),
  joinTable: vi.fn(),
  listMyTables: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <TablesPage />
    </MemoryRouter>,
  );
}

describe("TablesPage errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMyTables.mockResolvedValue([]);
    listCharacters.mockResolvedValue([{ id: "c1", name: "Billie", level: 15, class: { name: "Paladin" } }]);
  });

  it("shows a join error inside the join form, not at the top of the page", async () => {
    joinTable.mockRejectedValue(new Error("You run this table, so you cannot join it as a player"));
    renderPage();

    await userEvent.type(await screen.findByLabelText("Join code from your DM"), "abc123");
    await userEvent.selectOptions(screen.getByLabelText("Your character"), "c1");
    await userEvent.click(screen.getByRole("button", { name: "Join table" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("You run this table");
    const joinCard = screen.getByRole("heading", { name: "Join a table (player)" }).closest("form");
    expect(within(joinCard).getByRole("alert")).toBe(alert);
  });

  it("shows a create error inside the create form", async () => {
    createTable.mockRejectedValue(new Error("Could not create that table"));
    renderPage();

    await userEvent.type(await screen.findByLabelText("Table name"), "Final Fight");
    await userEvent.click(screen.getByRole("button", { name: "Create table" }));

    const alert = await screen.findByRole("alert");
    const createCard = screen.getByRole("heading", { name: "Run a table (DM)" }).closest("form");
    expect(within(createCard).getByRole("alert")).toBe(alert);
  });
});
