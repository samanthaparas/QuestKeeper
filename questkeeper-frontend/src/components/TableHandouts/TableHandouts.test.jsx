import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

    expect(await screen.findByText("Hidden · Only you")).toBeInTheDocument();
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

    const card = (await screen.findByText("The Old Map")).closest("li");
    await userEvent.click(within(card).getByRole("button", { name: "Reveal to everyone" }));

    expect(setHandoutAudience).toHaveBeenCalledWith("h1", { everyone: true, userIds: [] });
    expect(onShared).toHaveBeenCalledWith("The Old Map");
  });

  it("shows a handout to chosen players only, without logging it", async () => {
    const onShared = vi.fn();
    render(<TableHandouts tableId="t1" isDm players={PLAYERS} onSharedWithEveryone={onShared} />);

    const card = (await screen.findByText("The Old Map")).closest("li");
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

describe("TableHandouts previews and badges (DM)", () => {
  it("labels each handout's visibility in words, with the picture only as decoration", async () => {
    const { listHandouts } = await import("../../utils/handoutStore");
    listHandouts.mockResolvedValue([
      { id: "a", title: "Hidden one", body: "", image_path: null, shown_to_all: false, shown_to: [] },
      { id: "b", title: "Public one", body: "", image_path: null, shown_to_all: true, shown_to: [] },
    ]);
    render(<TableHandouts tableId="t1" isDm players={[]} />);
    expect(await screen.findByText("Hidden · Only you")).toBeInTheDocument();
    expect(screen.getByText("Shown to everyone")).toBeInTheDocument();
    for (const thumb of document.querySelectorAll(".table-handouts__thumb")) {
      expect(thumb).toHaveAttribute("aria-hidden", "true");
    }
    // Making a handout never reveals it: the only way is the explicit buttons.
    expect(document.querySelector(".table-handouts__status--hidden")).not.toBeNull();
  });
});

describe("TableHandouts sharing row and options (DM)", () => {
  const view = (handout) => {
    listHandouts.mockResolvedValue([handout]);
    render(<TableHandouts tableId="t1" isDm players={PLAYERS} />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    installFakeStorage();
  });

  it("offers Reveal to everyone and Choose players for a hidden handout, and nothing to hide", async () => {
    view(MAP);
    const card = (await screen.findByText("The Old Map")).closest("li");
    expect(within(card).getByRole("button", { name: "Reveal to everyone" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Choose players" })).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Hide again" })).not.toBeInTheDocument();
  });

  it("offers Change players, Reveal to everyone and Hide again for a handout shown to some", async () => {
    view({ ...MAP, shown_to: ["p1"] });
    const card = (await screen.findByText("The Old Map")).closest("li");
    for (const name of ["Change players", "Reveal to everyone", "Hide again"]) {
      expect(within(card).getByRole("button", { name })).toBeInTheDocument();
    }
    expect(within(card).getByText("Shown to Billie")).toBeInTheDocument();
  });

  it("offers Choose players and Hide again, but not Reveal, for a handout shown to everyone", async () => {
    view({ ...MAP, shown_to_all: true });
    const card = (await screen.findByText("The Old Map")).closest("li");
    expect(within(card).getByRole("button", { name: "Choose players" })).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Hide again" })).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Reveal to everyone" })).not.toBeInTheDocument();
  });

  it("keeps Edit and Delete behind an Options button, and still asks before deleting", async () => {
    const { deleteHandout } = await import("../../utils/handoutStore");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    view(MAP);
    const card = (await screen.findByText("The Old Map")).closest("li");
    expect(within(card).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    const options = within(card).getByRole("button", { name: "Options for The Old Map" });
    expect(options).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(options);
    expect(options).toHaveAttribute("aria-expanded", "true");
    expect(within(card).getByRole("button", { name: "Edit" })).toBeInTheDocument();

    await userEvent.click(within(card).getByRole("button", { name: "Delete" }));
    expect(confirm).toHaveBeenCalled();
    expect(deleteHandout).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("summarises a long recipient list and keeps the full list readable on the page", async () => {
    const many = [
      ...PLAYERS,
      { userId: "p3", name: "Ash" },
      { userId: "p4", name: "Mira" },
    ];
    listHandouts.mockResolvedValue([{ ...MAP, shown_to: ["p1", "p2", "p3", "p4"] }]);
    render(<TableHandouts tableId="t1" isDm players={many} />);
    expect(await screen.findByText("Shown to 4 players")).toBeInTheDocument();
    expect(screen.getByText("Shown to Billie, Rook, Ash, Mira")).toBeInTheDocument();
  });

  it("creating a handout never reveals it (it saves hidden)", async () => {
    listHandouts.mockResolvedValue([]);
    render(<TableHandouts tableId="t1" isDm players={PLAYERS} />);
    await userEvent.click(await screen.findByRole("button", { name: "+ New handout" }));
    expect(screen.getByRole("button", { name: "Save (hidden)" })).toBeInTheDocument();
    expect(setHandoutAudience).not.toHaveBeenCalled();
  });
});

describe("TableHandouts: reading a cut-off title (DM)", () => {
  const LONG = "Wanted: Goblin Boss, dead or alive, last seen near the Old Berrinwood crossing";
  const original = {
    scrollHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight"),
    clientHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    installFakeStorage();
    // jsdom has no layout, so say that the long title is cut off after two lines.
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return this.textContent === LONG && !this.classList.contains("table-handouts__name--full") ? 60 : 20;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 40 });
  });

  afterEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", original.scrollHeight ?? { configurable: true, value: 0 });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", original.clientHeight ?? { configurable: true, value: 0 });
  });

  const show = (...handouts) => {
    listHandouts.mockResolvedValue(handouts);
    render(<TableHandouts tableId="t1" isDm players={PLAYERS} />);
  };

  it("offers 'Show full title' only on the card whose title is cut off", async () => {
    show({ ...MAP, id: "long", title: LONG }, { ...MAP, id: "short", title: "Letter" });
    expect(await screen.findAllByRole("button", { name: "Show full title" })).toHaveLength(1);
    const card = screen.getByText(LONG).closest("li");
    expect(within(card).getByRole("button", { name: "Show full title" })).toHaveAttribute("aria-expanded", "false");
    expect(within(screen.getByText("Letter").closest("li")).queryByRole("button", { name: /full title/ })).not.toBeInTheDocument();
  });

  it("opens and closes the title with click or Enter and Space, keeping focus on the same button", async () => {
    show({ ...MAP, id: "long", title: LONG });
    const toggle = await screen.findByRole("button", { name: "Show full title" });
    const title = screen.getByText(LONG);
    expect(title).not.toHaveClass("table-handouts__name--full");

    await userEvent.click(toggle);
    expect(title).toHaveClass("table-handouts__name--full");
    const less = screen.getByRole("button", { name: "Show less" });
    expect(less).toHaveAttribute("aria-expanded", "true");
    expect(less).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(title).not.toHaveClass("table-handouts__name--full");
    const again = screen.getByRole("button", { name: "Show full title" });
    expect(again).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(title).toHaveClass("table-handouts__name--full");
  });

  it("keeps the whole title in the page for screen readers, and changes nothing else", async () => {
    const { setHandoutAudience, updateHandout } = await import("../../utils/handoutStore");
    show({ ...MAP, id: "long", title: LONG });
    const toggle = await screen.findByRole("button", { name: "Show full title" });
    expect(screen.getByText(LONG)).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(setHandoutAudience).not.toHaveBeenCalled();
    expect(updateHandout).not.toHaveBeenCalled();
    // Still hidden, and not opened for editing.
    expect(screen.getByText("Hidden · Only you")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });
});
