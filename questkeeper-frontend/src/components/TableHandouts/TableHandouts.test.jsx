import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TableHandouts from "./TableHandouts";
import { installFakeStorage } from "../../test/fakeStorage";
import {
  createHandout,
  listHandouts,
  setHandoutAudience,
} from "../../utils/handoutStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/handoutStore", () => ({
  listHandouts: vi.fn(),
  createHandout: vi.fn().mockResolvedValue({}),
  updateHandout: vi.fn().mockResolvedValue(undefined),
  setHandoutAudience: vi.fn().mockResolvedValue(undefined),
  deleteHandout: vi.fn().mockResolvedValue(undefined),
  getHandoutImageUrl: vi.fn().mockResolvedValue("https://example.test/map.png"),
  validateHandoutImage: (file) => (file.type.startsWith("image/") ? null : "Pictures can be PNG, JPG, WebP or GIF."),
  subscribeToHandouts: vi.fn(() => () => {}),
}));

const PLAYERS = [
  { userId: "p1", name: "Billie" },
  { userId: "p2", name: "Rook" },
];

const MAP = {
  id: "h1",
  table_id: "t1",
  title: "The Old Map",
  body: "X marks the cave.",
  image_path: null,
  shown_to_all: false,
  shown_to: [],
  revealed_at: null,
  created_at: "2026-10-15T01:00:00Z",
};

describe("TableHandouts for the DM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFakeStorage();
    listHandouts.mockResolvedValue([MAP, { ...MAP, id: "h2", title: "Letter", shown_to: ["p2"] }]);
  });

  it("says who can see each handout", async () => {
    render(<TableHandouts tableId="t1" isDm players={PLAYERS} />);

    expect(await screen.findByText("Hidden (only you can see it)")).toBeInTheDocument();
    expect(screen.getByText("Shown to Rook")).toBeInTheDocument();
  });

  it("makes a new handout, hidden at first", async () => {
    render(<TableHandouts tableId="t1" isDm players={PLAYERS} />);

    await userEvent.click(await screen.findByRole("button", { name: "+ New handout" }));
    await userEvent.type(screen.getByLabelText("Title"), "Wanted poster");
    await userEvent.type(screen.getByLabelText("Text (optional)"), "Reward: 50 gp");
    await userEvent.click(screen.getByRole("button", { name: "Save (hidden)" }));

    expect(createHandout).toHaveBeenCalledWith("t1", {
      title: "Wanted poster",
      body: "Reward: 50 gp",
      imageFile: null,
      removeImage: false,
    });
  });

  it("reveals to everyone and posts it to the activity log", async () => {
    const onShared = vi.fn();
    render(<TableHandouts tableId="t1" isDm players={PLAYERS} onSharedWithEveryone={onShared} />);

    const card = (await screen.findByText("📜 The Old Map")).closest("li");
    await userEvent.click(within(card).getByRole("button", { name: "Reveal to everyone" }));

    expect(setHandoutAudience).toHaveBeenCalledWith("h1", { everyone: true, userIds: [] });
    expect(onShared).toHaveBeenCalledWith("The Old Map");
  });

  it("shows a handout to chosen players only, without logging it", async () => {
    const onShared = vi.fn();
    render(<TableHandouts tableId="t1" isDm players={PLAYERS} onSharedWithEveryone={onShared} />);

    const card = (await screen.findByText("📜 The Old Map")).closest("li");
    await userEvent.click(within(card).getByRole("button", { name: "Choose players" }));
    await userEvent.click(within(card).getByLabelText("Billie"));
    await userEvent.click(within(card).getByRole("button", { name: "Show to 1 player" }));

    expect(setHandoutAudience).toHaveBeenCalledWith("h1", { everyone: false, userIds: ["p1"] });
    expect(onShared).not.toHaveBeenCalled();
  });

  it("refuses a file that isn't a picture", async () => {
    render(<TableHandouts tableId="t1" isDm players={PLAYERS} />);

    await userEvent.click(await screen.findByRole("button", { name: "+ New handout" }));
    await userEvent.upload(
      screen.getByLabelText(/Picture/),
      new File(["x"], "notes.txt", { type: "text/plain" }),
      { applyAccept: false },
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Pictures can be PNG");
  });
});

describe("TableHandouts for players", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFakeStorage();
    listHandouts.mockResolvedValue([
      { ...MAP, shown_to_all: true, revealed_at: "2026-10-15T02:00:00Z" },
    ]);
  });

  it("tags a new handout until it's opened, with no DM buttons", async () => {
    render(<TableHandouts tableId="t1" isDm={false} />);

    const title = await screen.findByText("📜 The Old Map");
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reveal|New handout|Delete/ })).not.toBeInTheDocument();

    await userEvent.click(title);
    expect(screen.getByText("X marks the cave.")).toBeVisible();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });
});
