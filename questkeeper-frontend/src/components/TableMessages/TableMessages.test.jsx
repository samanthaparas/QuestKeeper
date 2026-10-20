import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TableMessages from "./TableMessages";
import * as store from "../../utils/messageStore";
import { readReceipt } from "./messageLabels";
import { shrinkPlan } from "../../utils/portraits";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

vi.mock("../../utils/messageStore", () => ({
  listMyTables: vi.fn(),
  listTablePeople: vi.fn(),
  listConversations: vi.fn(),
  listMessages: vi.fn(),
  startConversation: vi.fn(),
  sendMessage: vi.fn(),
  markConversationRead: vi.fn(),
  uploadMessageImage: vi.fn(),
  getMessageImageUrl: vi.fn(),
  subscribeToMessages: vi.fn(() => () => {}),
  validateMessageImage: (file) => (file.type.startsWith("image/") ? null : "Pictures can be PNG, JPG, WebP or GIF."),
}));

const ME = "me";
const PEOPLE = [
  { userId: "dm", name: "DM", isDm: true },
  { userId: ME, name: "Billie", isDm: false },
  { userId: "p2", name: "Rook", isDm: false },
  { userId: "p3", name: "Wren", isDm: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  store.listMyTables.mockResolvedValue([{ id: "t1", name: "Test night" }]);
  store.listTablePeople.mockResolvedValue(PEOPLE);
  store.listConversations.mockResolvedValue([]);
  store.listMessages.mockResolvedValue([]);
  store.markConversationRead.mockResolvedValue();
  store.sendMessage.mockResolvedValue("m1");
});

function renderMessages(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TableMessages myId={ME} />
    </MemoryRouter>,
  );
}

async function openDrawer(path) {
  renderMessages(path);
  await waitFor(() => expect(store.listConversations).toHaveBeenCalled());
  await userEvent.click(screen.getByRole("button", { name: /Messages/ }));
  return screen.getByRole("complementary", { name: /Messages/ });
}

describe("TableMessages", () => {
  it("starts a conversation with a few people and sends a message", async () => {
    store.startConversation.mockResolvedValue("c1");
    const drawer = await openDrawer();
    expect(drawer).toHaveTextContent("No messages yet");

    await userEvent.click(within(drawer).getByRole("button", { name: "+ New message" }));
    // Everyone else at the table, but not me.
    expect(within(drawer).queryByRole("checkbox", { name: /Billie/ })).toBeNull();
    await userEvent.click(within(drawer).getByRole("checkbox", { name: /DM/ }));
    await userEvent.click(within(drawer).getByRole("checkbox", { name: /Rook/ }));
    expect(drawer).toHaveTextContent("Only DM, Rook and you will see it, together.");

    await userEvent.click(within(drawer).getByRole("button", { name: "Write a message" }));
    expect(store.startConversation).toHaveBeenCalledWith("t1", { everyone: false, userIds: ["dm", "p2"] });

    await userEvent.type(within(drawer).getByLabelText("Your message"), "The chest is a mimic");
    store.listMessages.mockResolvedValue([
      { id: "m1", sender_id: ME, body: "The chest is a mimic", image_path: null, created_at: new Date().toISOString() },
    ]);
    await userEvent.click(within(drawer).getByRole("button", { name: "Send" }));

    expect(store.sendMessage).toHaveBeenCalledWith("c1", { body: "The chest is a mimic", imagePath: null });
    expect(await within(drawer).findByText("The chest is a mimic")).toBeInTheDocument();
    expect(within(drawer).getByText(/^You ·/)).toBeInTheDocument();
  });

  it("can message everyone at the table instead", async () => {
    store.startConversation.mockResolvedValue("all");
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole("button", { name: "+ New message" }));
    await userEvent.click(within(drawer).getByRole("checkbox", { name: /Everyone at the table/ }));
    expect(within(drawer).queryByRole("checkbox", { name: /Rook/ })).toBeNull();

    await userEvent.click(within(drawer).getByRole("button", { name: "Write a message" }));
    expect(store.startConversation).toHaveBeenCalledWith("t1", { everyone: true, userIds: [] });
  });

  it("lists conversations with their unread count and who's in them", async () => {
    store.listConversations.mockResolvedValue([
      {
        id: "c1",
        tableId: "t1",
        everyone: false,
        memberIds: [ME, "dm"],
        unread: 2,
        lastMessage: { sender_id: "dm", body: "Meet me after the session", image_path: null },
      },
      { id: "c2", tableId: "t1", everyone: true, memberIds: [], unread: 0, lastMessage: { sender_id: "p2", body: "", image_path: "x" } },
    ]);
    renderMessages();
    expect(await screen.findByRole("button", { name: "Messages, 2 unread" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Messages/ }));
    const drawer = screen.getByRole("complementary", { name: /Messages/ });
    expect(within(drawer).getByRole("button", { name: "DM. DM: Meet me after the session. 2 new" })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Everyone at the table. Rook: Sent a picture" })).toBeInTheDocument();

    // Opening it marks it read and says who can see it.
    await userEvent.click(within(drawer).getByRole("button", { name: /^DM\. DM: Meet me/ }));
    expect(within(drawer).getByText("Only DM and you can see these messages.")).toBeInTheDocument();
    await waitFor(() => expect(store.markConversationRead).toHaveBeenCalledWith("c1"));
  });

  it("only takes pictures", async () => {
    store.listConversations.mockResolvedValue([
      { id: "c1", tableId: "t1", everyone: true, memberIds: [], unread: 0, lastMessage: null },
    ]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole("button", { name: /Everyone at the table/ }));

    const input = within(drawer).getByLabelText("Add a picture");
    fireEvent.change(input, { target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] } });
    expect(await within(drawer).findByRole("alert")).toHaveTextContent("PNG, JPG, WebP or GIF");

    fireEvent.change(input, { target: { files: [new File(["x"], "map.png", { type: "image/png" })] } });
    expect(await within(drawer).findByText(/Picture: map.png/)).toBeInTheDocument();
    store.uploadMessageImage.mockResolvedValue("c1/abc.png");
    await userEvent.click(within(drawer).getByRole("button", { name: "Send" }));
    expect(store.sendMessage).toHaveBeenCalledWith("c1", { body: "", imagePath: "c1/abc.png" });
  });

  it("isn't shown when signed out", () => {
    render(
      <MemoryRouter>
        <TableMessages myId={null} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /Messages/ })).toBeNull();
  });

  it("points to My Games when you're not at any table yet", async () => {
    store.listMyTables.mockResolvedValue([]);
    const drawer = await openDrawer();
    expect(drawer).toHaveTextContent("Messages are for the people at your tables");
    expect(within(drawer).getByRole("link", { name: "Go to My Games" })).toHaveAttribute("href", "/games");
  });

  it("asks which table when you're at more than one, starting with the one you're on", async () => {
    store.listMyTables.mockResolvedValue([
      { id: "t1", name: "Test night" },
      { id: "t2", name: "Friday Game" },
    ]);
    store.listTablePeople.mockImplementation((tableId) =>
      Promise.resolve(tableId === "t2" ? [{ userId: "dm2", name: "DM", isDm: true }, { userId: ME, name: "Billie" }] : PEOPLE),
    );
    store.startConversation.mockResolvedValue("c9");
    const drawer = await openDrawer("/dm/tables/t2");
    await waitFor(() => expect(store.listTablePeople).toHaveBeenCalledWith("t2"));
    await userEvent.click(within(drawer).getByRole("button", { name: "+ New message" }));

    expect(within(drawer).getByLabelText("Which table?")).toHaveValue("t2");
    expect(within(drawer).queryByRole("checkbox", { name: /Rook/ })).toBeNull();
    await userEvent.selectOptions(within(drawer).getByLabelText("Which table?"), "t1");
    await userEvent.click(within(drawer).getByRole("checkbox", { name: /Rook/ }));
    await userEvent.click(within(drawer).getByRole("button", { name: "Write a message" }));
    expect(store.startConversation).toHaveBeenCalledWith("t1", { everyone: false, userIds: ["p2"] });
  });
});

describe("who can see it", () => {
  it("reads like a sentence", async () => {
    const { joinNames, whoCanSee } = await import("./messageLabels");
    expect(joinNames(["Dangit", "you"])).toBe("Dangit and you");
    expect(joinNames(["DM", "Rook", "you"])).toBe("DM, Rook and you");
    expect(whoCanSee({ everyone: false, memberIds: ["dm", ME] }, PEOPLE, ME)).toBe(
      "Only DM and you can see these messages.",
    );
    expect(whoCanSee({ everyone: true, memberIds: [] }, PEOPLE, ME)).toBe(
      "Everyone at this table can see these messages.",
    );
  });
});

describe("The Messages button and new messages", () => {
  const conversation = {
    id: "c1",
    tableId: "t1",
    everyone: false,
    memberIds: ["dm", ME],
    unread: 0,
    lastMessage: null,
  };

  // Calls the live-update handler the way the database would.
  function arrive(message) {
    const handler = store.subscribeToMessages.mock.calls[0][0];
    act(() => handler(message));
  }

  it("is a labelled button, so it's easy to find", async () => {
    renderMessages();
    await waitFor(() => expect(store.listConversations).toHaveBeenCalled());
    const button = screen.getByRole("button", { name: "Messages" });
    expect(button).toHaveTextContent("Messages");
    expect(button).not.toHaveClass("table-messages__button--unread");
  });

  it("turns solid with a count when there are unread messages", async () => {
    store.listConversations.mockResolvedValue([{ ...conversation, unread: 2 }]);
    renderMessages();

    const button = await screen.findByRole("button", { name: "Messages, 2 unread" });
    expect(button).toHaveClass("table-messages__button--unread");
    expect(button).toHaveTextContent("2");
  });

  it("shows a banner inside the open panel when a message arrives, and opens it", async () => {
    store.listConversations.mockResolvedValue([conversation]);
    const drawer = await openDrawer();
    expect(within(drawer).queryByRole("status")).toBeNull();

    arrive({ id: "m9", conversation_id: "c1", table_id: "t1", sender_id: "dm", body: "Psst", created_at: new Date().toISOString() });

    const banner = await within(drawer).findByRole("status");
    expect(banner).toHaveTextContent("New message from DM");
    await userEvent.click(within(banner).getByRole("button", { name: "Open it" }));
    expect(within(drawer).getByLabelText("Your message")).toBeInTheDocument();
    expect(within(drawer).queryByText("New message")).toBeNull();
  });

  it("marks a message that arrives while you're reading with New", async () => {
    store.listConversations.mockResolvedValue([conversation]);
    const old = { id: "m1", conversation_id: "c1", sender_id: "dm", body: "Earlier", image_path: null, created_at: "2026-10-18T01:00:00Z" };
    store.listMessages.mockResolvedValue([old]);
    const drawer = await openDrawer();
    await userEvent.click(await within(drawer).findByRole("button", { name: /DM/ }));
    await within(drawer).findByText("Earlier");
    expect(within(drawer).queryByText(/· New/)).toBeNull();

    const fresh = { id: "m2", conversation_id: "c1", sender_id: "dm", body: "Just now", image_path: null, created_at: "2026-10-18T01:05:00Z" };
    store.listMessages.mockResolvedValue([old, fresh]);
    arrive({ ...fresh, table_id: "t1" });

    const message = (await within(drawer).findByText("Just now")).closest("li");
    expect(within(message).getByText(/· New/)).toBeInTheDocument();
    // The one that was already there isn't marked.
    expect(within(within(drawer).getByText("Earlier").closest("li")).queryByText(/· New/)).toBeNull();
  });

  it("attaches a screenshot pasted into the message box, and keeps pasting text normal", async () => {
    store.listConversations.mockResolvedValue([
      { id: "c1", tableId: "t1", everyone: true, memberIds: [], unread: 0, lastMessage: null },
    ]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole("button", { name: /Everyone at the table/ }));
    const box = within(drawer).getByLabelText("Your message");
    const shot = new File(["png"], "Screenshot.png", { type: "image/png" });
    fireEvent.paste(box, {
      clipboardData: { items: [{ kind: "file", type: "image/png", getAsFile: () => shot }], getData: () => "" },
    });
    expect(await within(drawer).findByText(/Picture: Screenshot.png/)).toBeInTheDocument();
    // Text only: nothing attached (the Remove button is the attached picture's).
    await userEvent.click(within(drawer).getByRole("button", { name: "Remove" }));
    fireEvent.paste(box, { clipboardData: { items: [{ kind: "string", type: "text/plain" }], getData: () => "hi" } });
    expect(within(drawer).queryByText(/Picture:/)).toBeNull();
  });

  it("shows who has seen your newest message", async () => {
    const sent = new Date(Date.now() - 60000).toISOString();
    const later = new Date().toISOString();
    store.listConversations.mockResolvedValue([
      {
        id: "c1",
        tableId: "t1",
        everyone: false,
        memberIds: [ME, "dm"],
        members: [
          { userId: ME, lastReadAt: later },
          { userId: "dm", lastReadAt: later },
        ],
        unread: 0,
        lastMessage: null,
      },
    ]);
    store.listMessages.mockResolvedValue([
      { id: "m1", sender_id: ME, body: "Is the door trapped?", image_path: null, created_at: sent },
    ]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole("button", { name: /DM/ }));
    expect(await within(drawer).findByText("Seen by DM")).toBeInTheDocument();
  });
});

describe("read receipts", () => {
  const people = [
    { userId: "dm", name: "DM" },
    { userId: "me", name: "Billie" },
    { userId: "p2", name: "Rook" },
    { userId: "p3", name: "Wren" },
  ];
  const message = { created_at: "2026-10-19T20:00:00Z" };
  const read = (at) => at;
  it("says who has read up to the message, for private and whole-table conversations", () => {
    const privateOne = { everyone: false, memberIds: ["me", "dm"], members: [{ userId: "dm", lastReadAt: read("2026-10-19T19:00:00Z") }] };
    expect(readReceipt(privateOne, message, people, "me")).toEqual({ text: "Not seen yet", seenAll: false });
    privateOne.members[0].lastReadAt = "2026-10-19T20:00:05Z";
    expect(readReceipt(privateOne, message, people, "me")).toEqual({ text: "Seen by DM", seenAll: true });

    const everyone = {
      everyone: true,
      memberIds: [],
      members: [
        { userId: "dm", lastReadAt: "2026-10-19T20:01:00Z" },
        { userId: "p2", lastReadAt: "2026-10-19T20:02:00Z" },
      ],
    };
    expect(readReceipt(everyone, message, people, "me").text).toBe("Seen by DM and Rook");
    everyone.members.push({ userId: "p3", lastReadAt: "2026-10-19T20:03:00Z" });
    expect(readReceipt(everyone, message, people, "me")).toEqual({ text: "Seen by everyone", seenAll: true });
  });

  it("counts when more than two have seen it, and is empty with nobody else in it", () => {
    const big = [...people, { userId: "p4", name: "Ash" }, { userId: "p5", name: "Moss" }];
    const everyone = {
      everyone: true,
      members: ["dm", "p2", "p3"].map((userId) => ({ userId, lastReadAt: "2026-10-19T20:05:00Z" })),
    };
    expect(readReceipt(everyone, message, big, "me").text).toBe("Seen by 3 of 5");
    expect(readReceipt({ everyone: false, memberIds: ["me"], members: [] }, message, people, "me")).toBeNull();
  });
});

describe("shrinking big pictures", () => {
  it("leaves small pictures and GIFs alone", () => {
    expect(shrinkPlan({ width: 1200, height: 800, size: 400_000, type: "image/png" })).toEqual({ shrink: false });
    expect(shrinkPlan({ width: 4000, height: 3000, size: 9_000_000, type: "image/gif" })).toEqual({ shrink: false });
  });

  it("shrinks a Retina screenshot to 2000px on its long side, keeping its shape", () => {
    expect(shrinkPlan({ width: 3456, height: 2234, size: 6_500_000, type: "image/png" })).toEqual({
      shrink: true,
      width: 2000,
      height: 1293,
    });
  });

  it("re-saves a heavy picture that's already small enough in size on screen", () => {
    expect(shrinkPlan({ width: 1800, height: 1200, size: 3_000_000, type: "image/png" })).toEqual({
      shrink: true,
      width: 1800,
      height: 1200,
    });
  });
});


