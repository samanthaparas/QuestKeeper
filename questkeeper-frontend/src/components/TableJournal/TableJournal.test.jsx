import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TableJournal from "./TableJournal";
import { installFakeStorage } from "../../test/fakeStorage";
import {
  addJournalEntry,
  deleteJournalEntry,
  listJournal,
  startNextSession,
  updateJournalEntry,
  setSessionNumber,
} from "../../utils/journalStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/journalStore", () => ({
  listJournal: vi.fn(),
  addJournalEntry: vi.fn().mockResolvedValue({}),
  updateJournalEntry: vi.fn().mockResolvedValue(undefined),
  deleteJournalEntry: vi.fn().mockResolvedValue(undefined),
  startNextSession: vi.fn().mockResolvedValue(undefined),
  setSessionNumber: vi.fn().mockResolvedValue(undefined),
  getTablePortraits: vi.fn().mockResolvedValue(new Map([["dm", "https://example.com/dm.png"]])),
  subscribeToJournal: vi.fn(() => () => {}),
}));

// The recap card at the top has its own tests; here it just stays quiet.
vi.mock("../../utils/recapStore", () => ({
  listRecaps: vi.fn().mockResolvedValue([]),
  saveRecap: vi.fn(),
  subscribeToRecaps: vi.fn(() => () => {}),
}));
vi.mock("../../utils/api", () => ({ writeRecapFromNotes: vi.fn() }));

const NOTES = [
  {
    id: "n1",
    table_id: "t1",
    author_id: "dm",
    author_name: "DM",
    session_number: 1,
    body: "Recap: you reached Phandalin.",
    visibility: "table",
    created_at: "2026-10-13T01:00:00Z",
    updated_at: "2026-10-13T01:00:00Z",
  },
  {
    id: "n2",
    table_id: "t1",
    author_id: "me",
    author_name: "Billie",
    session_number: 1,
    body: "The innkeeper is hiding something.",
    visibility: "private",
    created_at: "2026-10-13T01:30:00Z",
    updated_at: "2026-10-13T01:30:00Z",
  },
];

function renderJournal(props = {}) {
  return render(<TableJournal tableId="t1" userId="me" isDm={false} sessionNumber={2} {...props} />);
}

describe("TableJournal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFakeStorage();
    listJournal.mockResolvedValue(NOTES);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("signs each note and marks private ones", async () => {
    renderJournal();

    const dmNote = (await screen.findByText("Recap: you reached Phandalin.")).closest("li");
    expect(within(dmNote).getByText("DM")).toBeInTheDocument();
    const myNote = screen.getByText("The innkeeper is hiding something.").closest("li");
    expect(within(myNote).getByText("Billie")).toBeInTheDocument();
    expect(within(myNote).getByText("🔒 Just me")).toBeInTheDocument();
  });

  it("shows the current session even before anyone writes in it", async () => {
    renderJournal();

    expect(await screen.findByRole("heading", { name: /^Session 2/ })).toBeInTheDocument();
    expect(screen.getByText("No notes yet this session.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Session 1/ })).toBeInTheDocument();
  });

  it("adds a note for the whole table, or just me", async () => {
    renderJournal();

    await userEvent.type(await screen.findByLabelText("New note"), "We owe Sildar a favour");
    await userEvent.click(screen.getByLabelText("🔒 Just me"));
    // The button says plainly that this one is private.
    await userEvent.click(screen.getByRole("button", { name: "Save private note" }));

    expect(addJournalEntry).toHaveBeenCalledWith("t1", {
      body: "We owe Sildar a favour",
      visibility: "private",
      sessionNumber: null,
    });
    expect(screen.getByLabelText("New note")).toHaveValue("");
  });

  it("lets you edit and delete only your own notes", async () => {
    renderJournal();

    const dmNote = (await screen.findByText("Recap: you reached Phandalin.")).closest("li");
    expect(within(dmNote).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    const myNote = screen.getByText("The innkeeper is hiding something.").closest("li");
    await userEvent.click(within(myNote).getByRole("button", { name: "Edit" }));
    const box = within(myNote).getByLabelText("Edit note");
    await userEvent.clear(box);
    await userEvent.type(box, "Toblen is hiding something.");
    await userEvent.click(within(myNote).getByLabelText("Whole table"));
    await userEvent.click(within(myNote).getByRole("button", { name: "Save" }));
    expect(updateJournalEntry).toHaveBeenCalledWith("n2", {
      id: "n2",
      body: "Toblen is hiding something.",
      visibility: "table",
      session: "1",
      sessionNumber: 1,
    });

    await userEvent.click(within(myNote).getByRole("button", { name: "Delete" }));
    expect(deleteJournalEntry).toHaveBeenCalledWith("n2");
  });

  it("lets the DM start the next session", async () => {
    renderJournal({ isDm: true, userId: "dm" });

    await userEvent.click(await screen.findByRole("button", { name: "Start session 3" }));
    expect(startNextSession).toHaveBeenCalledWith("t1", 2);
  });

  it("keeps the note and explains when saving fails", async () => {
    addJournalEntry.mockRejectedValueOnce(new Error("Couldn't reach the server"));
    renderJournal();

    await userEvent.type(await screen.findByLabelText("New note"), "Important clue");
    await userEvent.click(screen.getByRole("button", { name: "Add to session 2" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach the server");
    expect(screen.getByLabelText("New note")).toHaveValue("Important clue");
  });

  it("keeps an unsent note when the journal is closed and opened again", async () => {
    const { unmount } = renderJournal();
    await userEvent.type(await screen.findByLabelText("New note"), "Half a thought");
    unmount();

    renderJournal();
    expect(await screen.findByLabelText("New note")).toHaveValue("Half a thought");
  });

  it("shows the 5 newest notes, with a button for the rest", async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      ...NOTES[0],
      id: `m${i}`,
      body: `Note ${i + 1}`,
      created_at: `2026-10-13T0${i}:00:00Z`,
      updated_at: `2026-10-13T0${i}:00:00Z`,
    }));
    listJournal.mockResolvedValue(many);
    renderJournal();

    expect(await screen.findByText("Note 8")).toBeInTheDocument();
    expect(screen.getByText("Note 4")).toBeInTheDocument();
    expect(screen.queryByText("Note 3")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show all 8 notes" }));
    expect(screen.getByText("Note 1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show only the newest notes" }));
    expect(screen.queryByText("Note 1")).not.toBeInTheDocument();
  });

  it("files a note under a session number the writer picks", async () => {
    renderJournal();

    await userEvent.type(await screen.findByLabelText("New note"), "Catching up on session 41");
    await userEvent.type(screen.getByLabelText("Session"), "41");
    await userEvent.click(screen.getByRole("button", { name: "Add to session 41" }));

    expect(addJournalEntry).toHaveBeenCalledWith("t1", {
      body: "Catching up on session 41",
      visibility: "table",
      sessionNumber: 41,
    });
  });

  it("explains a session number that isn't a whole number from 1 up", async () => {
    renderJournal();

    await userEvent.type(await screen.findByLabelText("New note"), "Hello");
    await userEvent.type(screen.getByLabelText("Session"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Add to session 0" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("whole number from 1 to 9999");
    expect(addJournalEntry).not.toHaveBeenCalled();
  });

  it("looks back at one earlier session in full, from the Look back at list", async () => {
    const older = Array.from({ length: 7 }, (_, i) => ({
      ...NOTES[0],
      id: `o${i}`,
      session_number: 1,
      body: `Old note ${i + 1}`,
      created_at: `2026-10-01T0${i}:00:00Z`,
      updated_at: `2026-10-01T0${i}:00:00Z`,
    }));
    listJournal.mockResolvedValue([
      ...older,
      { ...NOTES[0], id: "s3", session_number: 3, body: "A session 3 recap", created_at: "2026-10-12T01:00:00Z", updated_at: "2026-10-12T01:00:00Z" },
    ]);
    renderJournal({ sessionNumber: 4 });
    await screen.findByText("A session 3 recap");

    const list = screen.getByLabelText("Look back at");
    expect(within(list).getByRole("option", { name: "Session 4 (0 notes), current" })).toBeInTheDocument();
    expect(within(list).getByRole("option", { name: "Session 1 (7 notes)" })).toBeInTheDocument();

    await userEvent.selectOptions(list, "Session 1 (7 notes)");

    // All seven show (the "newest notes" view would have cut them off).
    expect(screen.getAllByText(/^Old note/)).toHaveLength(7);
    expect(screen.queryByText("A session 3 recap")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });

  it("can show every session at once", async () => {
    renderJournal();
    await screen.findByText("Recap: you reached Phandalin.");

    await userEvent.selectOptions(screen.getByLabelText("Look back at"), "Every session");
    expect(screen.getByRole("heading", { name: /^Session 1/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Session 2/ })).toBeInTheDocument();
  });

  it("lets a writer move their own note to another session", async () => {
    renderJournal();

    const myNote = (await screen.findByText("The innkeeper is hiding something.")).closest("li");
    await userEvent.click(within(myNote).getByRole("button", { name: "Edit" }));
    const session = within(myNote).getByLabelText("Session number for this note");
    expect(session).toHaveValue(1);
    await userEvent.clear(session);
    await userEvent.type(session, "12");
    await userEvent.click(within(myNote).getByRole("button", { name: "Save" }));

    expect(updateJournalEntry).toHaveBeenCalledWith(
      "n2",
      expect.objectContaining({ session: "12", sessionNumber: 12 }),
    );
  });

  it("lets the DM set the current session to any number, after asking", async () => {
    renderJournal({ isDm: true, userId: "dm" });

    await userEvent.type(await screen.findByLabelText(/Current session is 2/), "41");
    await userEvent.click(screen.getByRole("button", { name: "Set" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("session 41"));
    expect(setSessionNumber).toHaveBeenCalledWith("t1", 41);
  });

  it("doesn't offer the current-session box to players", async () => {
    renderJournal();
    await screen.findByLabelText("New note");
    expect(screen.queryByLabelText(/Current session is/)).not.toBeInTheDocument();
  });

  it("shows each writer's portrait beside their note, and initials when there isn't one", async () => {
    renderJournal();

    const dmNote = (await screen.findByText("Recap: you reached Phandalin.")).closest("li");
    await waitFor(() =>
      expect(dmNote.querySelector(".table-journal__avatar img")).toHaveAttribute("src", "https://example.com/dm.png"),
    );
    // Billie has no portrait here, so her note shows her initials.
    const myNote = screen.getByText("The innkeeper is hiding something.").closest("li");
    expect(myNote.querySelector(".table-journal__avatar img")).toBeNull();
    expect(within(myNote).getByText("B")).toBeInTheDocument();
  });
});

