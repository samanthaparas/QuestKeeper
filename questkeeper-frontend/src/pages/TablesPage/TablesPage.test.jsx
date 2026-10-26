import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

function renderPage(mode, url = "/") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TablesPage mode={mode} />
    </MemoryRouter>,
  );
}

const RUN = { id: "t1", name: "Final Fight", dm_id: "u1", join_code: "ABC123" };
const PLAY = { id: "t2", name: "Friday Game", dm_id: "dm-2", join_code: "XYZ789" };

describe("My Games (Adventurer)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMyTables.mockResolvedValue([RUN, PLAY]);
    listCharacters.mockResolvedValue([{ id: "c1", name: "Billie", level: 15, class: { name: "Paladin" } }]);
  });

  it("lists only the games you play in, linking to the game page", async () => {
    renderPage("player");

    expect(await screen.findByRole("link", { name: /Friday Game/ })).toHaveAttribute("href", "/games/t2");
    expect(screen.queryByText("Final Fight")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Table name")).not.toBeInTheDocument();
  });

  it("picks the character when the sheet's Join a table link opened the page", async () => {
    renderPage("player", "/games?character=c1");

    expect(await screen.findByRole("option", { name: /Billie/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Your character")).toHaveValue("c1");
  });

  it("goes to the game page after joining", async () => {
    joinTable.mockResolvedValue("t9");
    renderPage("player");

    await userEvent.type(await screen.findByLabelText("Join code from your DM"), "abc123");
    await userEvent.selectOptions(screen.getByLabelText("Your character"), "c1");
    await userEvent.click(screen.getByRole("button", { name: "Join table" }));

    expect(joinTable).toHaveBeenCalledWith("ABC123", "c1");
  });

  it("shows a join error inside the join form, not at the top of the page", async () => {
    joinTable.mockRejectedValue(new Error("You run this table, so you cannot join it as a player"));
    renderPage("player");

    await userEvent.type(await screen.findByLabelText("Join code from your DM"), "abc123");
    await userEvent.selectOptions(screen.getByLabelText("Your character"), "c1");
    await userEvent.click(screen.getByRole("button", { name: "Join table" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("You run this table");
    const joinCard = screen.getByRole("heading", { name: "Join a table" }).closest("form");
    expect(within(joinCard).getByRole("alert")).toBe(alert);
  });

  it("points DMs to their DM Screen", async () => {
    renderPage("player");

    expect(await screen.findByRole("link", { name: "Go to the DM Screen" })).toHaveAttribute("href", "/dm");
  });
});

describe("DM Screen list (Dungeon Master)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMyTables.mockResolvedValue([RUN, PLAY]);
    listCharacters.mockResolvedValue([]);
  });

  it("lists only the tables you run, with their join codes", async () => {
    renderPage("dm");

    const link = await screen.findByRole("link", { name: /Final Fight/ });
    expect(link).toHaveAttribute("href", "/dm/tables/t1");
    expect(link).toHaveTextContent("Join code ABC123");
    expect(screen.queryByText("Friday Game")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Join code from your DM")).not.toBeInTheDocument();
  });

  it("shows a create error inside the create form", async () => {
    createTable.mockRejectedValue(new Error("Could not create that table"));
    renderPage("dm");

    await userEvent.type(await screen.findByLabelText("Table name"), "Final Fight");
    await userEvent.click(screen.getByRole("button", { name: "Create table" }));

    const alert = await screen.findByRole("alert");
    const createCard = screen.getByRole("heading", { name: "Start a new table" }).closest("form");
    expect(within(createCard).getByRole("alert")).toBe(alert);
  });
});

describe("help for new groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCharacters.mockResolvedValue([]);
  });

  it("explains how a game night works when you are not at any tables", async () => {
    listMyTables.mockResolvedValue([]);
    renderPage("player");

    expect(await screen.findByText(/Here is how a game night works/)).toBeInTheDocument();
    expect(screen.getByText(/The DM creates a table/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How playing at a table works" })).toHaveAttribute(
      "href",
      "/guide?section=tables",
    );
  });

  it("drops the explainer once you are at a table", async () => {
    listMyTables.mockResolvedValue([PLAY]);
    renderPage("player");

    expect(await screen.findByText("Friday Game")).toBeInTheDocument();
    expect(screen.queryByText(/Here is how a game night works/)).not.toBeInTheDocument();
  });

  it("says so in friendly words when the tables can't load, and tries again", async () => {
    listMyTables.mockRejectedValueOnce(new Error("relation game_tables does not exist"));
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load your tables. Check your connection and try again.");
    expect(alert).not.toHaveTextContent("relation");
    expect(screen.queryByText(/not at any tables yet|not running any tables yet/)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(listMyTables).toHaveBeenCalledTimes(2);
  });
});
