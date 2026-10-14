import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TableJournal from "./TableJournal";
import { installFakeStorage } from "../../test/fakeStorage";
import {
  addJournalEntry,
  deleteJournalEntry,
  listJournal,
  startNextSession,
  updateJournalEntry,
} from "../../utils/journalStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/journalStore", () => ({
  listJournal: vi.fn(),
  addJournalEntry: vi.fn().mockResolvedValue({}),
  updateJournalEntry: vi.fn().mockResolvedValue(undefined),
  deleteJournalEntry: vi.fn().mockResolvedValue(undefined),
  startNextSession: vi.fn().mockResolvedValue(undefined),
  subscribeToJournal: vi.fn(() => () => {}),
}));

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
});
