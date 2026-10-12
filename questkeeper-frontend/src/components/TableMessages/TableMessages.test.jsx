import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TableMessages from "./TableMessages";
import * as store from "../../utils/messageStore";

vi.mock("../../utils/messageStore", () => ({
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
  store.listTablePeople.mockResolvedValue(PEOPLE);
  store.listConversations.mockResolvedValue([]);
  store.listMessages.mockResolvedValue([]);
  store.markConversationRead.mockResolvedValue();
  store.sendMessage.mockResolvedValue("m1");
});

async function openDrawer() {
  render(<TableMessages tableId="t1" tableName="Test night" myId={ME} />);
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
    expect(drawer).toHaveTextContent("Only you and DM, Rook will see it, together.");

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
        everyone: false,
        memberIds: [ME, "dm"],
        unread: 2,
        lastMessage: { sender_id: "dm", body: "Meet me after the session", image_path: null },
      },
      { id: "c2", everyone: true, memberIds: [], unread: 0, lastMessage: { sender_id: "p2", body: "", image_path: "x" } },
    ]);
    render(<TableMessages tableId="t1" tableName="Test night" myId={ME} />);
    expect(await screen.findByLabelText("2 unread")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Messages/ }));
    const drawer = screen.getByRole("complementary", { name: /Messages/ });
    expect(within(drawer).getByRole("button", { name: "DM. DM: Meet me after the session. 2 new" })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Everyone at the table. Rook: Sent a picture" })).toBeInTheDocument();

    // Opening it marks it read and says who can see it.
    await userEvent.click(within(drawer).getByRole("button", { name: /^DM\. DM: Meet me/ }));
    expect(within(drawer).getByText("Only You, DM can see these messages.")).toBeInTheDocument();
    await waitFor(() => expect(store.markConversationRead).toHaveBeenCalledWith("c1"));
  });

  it("only takes pictures", async () => {
    store.listConversations.mockResolvedValue([
      { id: "c1", everyone: true, memberIds: [], unread: 0, lastMessage: null },
    ]);
    const drawer = await openDrawer();
    await userEvent.click(within(drawer).getByRole("button", { name: /Everyone at the table/ }));

    const input = within(drawer).getByLabelText("Add a picture");
    fireEvent.change(input, { target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] } });
    expect(within(drawer).getByRole("alert")).toHaveTextContent("PNG, JPG, WebP or GIF");

    fireEvent.change(input, { target: { files: [new File(["x"], "map.png", { type: "image/png" })] } });
    expect(within(drawer).getByText(/Picture: map.png/)).toBeInTheDocument();
    store.uploadMessageImage.mockResolvedValue("c1/abc.png");
    await userEvent.click(within(drawer).getByRole("button", { name: "Send" }));
    expect(store.sendMessage).toHaveBeenCalledWith("c1", { body: "", imagePath: "c1/abc.png" });
  });

  it("isn't shown when the character isn't at a table", () => {
    render(<TableMessages tableId={null} tableName={null} myId={ME} />);
    expect(screen.queryByRole("button", { name: /Messages/ })).toBeNull();
  });
});
