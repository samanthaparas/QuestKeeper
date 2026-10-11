import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomebrewPage from "./HomebrewPage";
import {
  listVisibleHomebrew,
  createHomebrew,
  deleteHomebrew,
  listGrants,
} from "../../utils/homebrewStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../context/useAuth", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("../../utils/api", () => ({ getRaces: vi.fn().mockResolvedValue([]) }));
vi.mock("../../utils/tableStore", () => ({ listMyTables: vi.fn().mockResolvedValue([]) }));
vi.mock("../../utils/homebrewStore", () => ({
  listVisibleHomebrew: vi.fn(),
  createHomebrew: vi.fn(),
  updateHomebrew: vi.fn(),
  deleteHomebrew: vi.fn(),
  listMyTableShares: vi.fn().mockResolvedValue([]),
  shareWithTable: vi.fn(),
  stopSharingWithTable: vi.fn(),
  createInvite: vi.fn(),
  listPendingInvites: vi.fn().mockResolvedValue([]),
  cancelInvite: vi.fn(),
  inviteUrl: (code) => `https://qk.test/#/homebrew/invite/${code}`,
  listGrants: vi.fn(),
  removeGrant: vi.fn(),
}));

const myRace = {
  id: "r1",
  owner_id: "me",
  category: "race",
  name: "Owlfolk",
  based_on: "Our campaign",
  is_shared: true,
  data: {},
};
const myDraft = { ...myRace, id: "r2", name: "Bat Folk", is_shared: false, based_on: null };
const theirs = { id: "s1", owner_id: "alex", category: "subclass", name: "Dusk Domain", data: {} };

function renderPage() {
  render(
    <MemoryRouter>
      <HomebrewPage />
    </MemoryRouter>,
  );
}

describe("HomebrewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listVisibleHomebrew.mockResolvedValue([myDraft, theirs, myRace]);
    listGrants.mockResolvedValue({
      sharedByMe: [],
      sharedWithMe: [{ owner_id: "alex", grantee_id: "me", sender_label: "Alex" }],
    });
  });

  it("separates your homebrew from what's shared with you", async () => {
    renderPage();

    const mine = (await screen.findByText("Owlfolk")).closest("section");
    expect(within(mine).getByText("Shared")).toBeInTheDocument();
    expect(within(mine).getByText("Private draft")).toBeInTheDocument();
    expect(within(mine).getByText("Based on Our campaign")).toBeInTheDocument();

    const shared = screen.getByText("Dusk Domain").closest("section");
    expect(await within(shared).findByText(/From Alex/)).toBeInTheDocument();
  });

  it("filters your homebrew by type", async () => {
    renderPage();
    await screen.findByText("Owlfolk");
    expect(screen.getByRole("button", { name: "Race (2)" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Subclass (0)" }));
    expect(screen.queryByText("Owlfolk")).not.toBeInTheDocument();
  });

  it("creates a new entry from the form", async () => {
    createHomebrew.mockResolvedValue({ ...myRace, id: "r3", name: "Toad Folk" });
    renderPage();
    await screen.findByText("Owlfolk");

    await userEvent.click(screen.getByRole("button", { name: "Race" }));
    await userEvent.type(screen.getByLabelText("Name"), "Toad Folk");
    await userEvent.click(screen.getByRole("button", { name: "Save race" }));

    expect(createHomebrew).toHaveBeenCalledWith(
      expect.objectContaining({ category: "race", name: "Toad Folk" }),
    );
    expect(await screen.findByText("Toad Folk")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("deletes after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    deleteHomebrew.mockResolvedValue();
    renderPage();

    const item = (await screen.findByText("Bat Folk")).closest("li");
    await userEvent.click(within(item).getByRole("button", { name: "Delete" }));

    expect(deleteHomebrew).toHaveBeenCalledWith("r2");
    expect(screen.queryByText("Bat Folk")).not.toBeInTheDocument();
  });

  it("opens a pre-filled form when sent from a book background", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/homebrew",
            state: {
              newHomebrew: {
                category: "background",
                name: "City Watch",
                basedOn: "Sword Coast Adventurer's Guide",
                linkUrl: "https://dnd5e.wikidot.com/background:city-watch",
              },
            },
          },
        ]}
      >
        <HomebrewPage />
      </MemoryRouter>,
    );
    expect(await screen.findByLabelText("Name")).toHaveValue("City Watch");
    expect(screen.getByRole("button", { name: "Save background" })).toBeInTheDocument();
  });
});
