import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PersonalJournal from "./PersonalJournal";
import { installFakeStorage } from "../../test/fakeStorage";
import {
  addPersonalNote,
  deletePersonalNote,
  listPersonalNotes,
  markNoteShared,
  updatePersonalNote,
} from "../../utils/characterJournalStore";
import { addJournalEntry } from "../../utils/journalStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/characterJournalStore", () => ({
  listPersonalNotes: vi.fn(),
  addPersonalNote: vi.fn().mockResolvedValue({}),
  updatePersonalNote: vi.fn().mockResolvedValue(undefined),
  deletePersonalNote: vi.fn().mockResolvedValue(undefined),
  markNoteShared: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../utils/journalStore", () => ({
  addJournalEntry: vi.fn().mockResolvedValue({}),
}));

const note = (id, session, body, extra = {}) => ({
  id,
  character_id: "c1",
  session_number: session,
  body,
  shared_table_id: null,
  shared_as: null,
  created_at: `2026-10-0${session}T01:00:00Z`,
  updated_at: `2026-10-0${session}T01:00:00Z`,
  ...extra,
});

const NOTES = [
  note("n1", 1, "We met Sildar on the road."),
  note("n2", 2, "The innkeeper is hiding something."),
  note("n3", 2, "Secret: I think the mayor is a doppelganger."),
];

function renderJournal(props = {}) {
  return render(<PersonalJournal characterId="c1" {...props} />);
}

describe("PersonalJournal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFakeStorage();
    listPersonalNotes.mockResolvedValue(NOTES);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("says only the player can read it, and shows the sessions", async () => {
    renderJournal();

    expect(await screen.findByText(/Only you can read them/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Session 2/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Session 1/ })).toBeInTheDocument();
    expect(screen.getByText("The innkeeper is hiding something.")).toBeInTheDocument();
  });

  it("works with no table: a note goes under the newest session by default", async () => {
    renderJournal();

    await userEvent.type(await screen.findByLabelText("New note"), "Bought a horse");
    await userEvent.click(screen.getByRole("button", { name: "Add to session 2" }));

    expect(addPersonalNote).toHaveBeenCalledWith("c1", { body: "Bought a horse", sessionNumber: 2 });
    expect(screen.getByLabelText("New note")).toHaveValue("");
    // And there's nothing about tables to confuse anyone.
    expect(screen.queryByRole("button", { name: /Bring notes into/ })).not.toBeInTheDocument();
  });

  it("lets the player start a new session, or type any session number", async () => {
    renderJournal();

    await userEvent.type(await screen.findByLabelText("New note"), "A new chapter");
    await userEvent.click(screen.getByRole("button", { name: "Start session 3" }));
    expect(screen.getByRole("button", { name: "Add to session 3" })).toBeInTheDocument();

    const box = screen.getByLabelText("Session");
    await userEvent.clear(box);
    await userEvent.type(box, "41");
    await userEvent.click(screen.getByRole("button", { name: "Add to session 41" }));
    expect(addPersonalNote).toHaveBeenCalledWith("c1", { body: "A new chapter", sessionNumber: 41 });
  });

  it("starts a first journal at session 1", async () => {
    listPersonalNotes.mockResolvedValue([]);
    renderJournal();

    expect(await screen.findByText(/filed under session 1/)).toBeInTheDocument();
  });

  it("edits a note, including which session it belongs to, and deletes after asking", async () => {
    renderJournal();

    const mine = (await screen.findByText("We met Sildar on the road.")).closest("li");
    await userEvent.click(within(mine).getByRole("button", { name: "Edit" }));
    const box = within(mine).getByLabelText("Edit note");
    await userEvent.clear(box);
    await userEvent.type(box, "We met Sildar in Phandalin.");
    const session = within(mine).getByLabelText("Session number for this note");
    await userEvent.clear(session);
    await userEvent.type(session, "5");
    await userEvent.click(within(mine).getByRole("button", { name: "Save" }));
    expect(updatePersonalNote).toHaveBeenCalledWith("n1", { body: "We met Sildar in Phandalin.", sessionNumber: 5 });

    await userEvent.click(within(mine).getByRole("button", { name: "Delete" }));
    expect(deletePersonalNote).toHaveBeenCalledWith("n1");
  });

  it("looks back at one session in full", async () => {
    renderJournal();
    await screen.findByText("We met Sildar on the road.");

    await userEvent.selectOptions(screen.getByLabelText("Look back at"), "1");
    expect(screen.getByText("We met Sildar on the road.")).toBeInTheDocument();
    expect(screen.queryByText("The innkeeper is hiding something.")).not.toBeInTheDocument();
  });
});

describe("PersonalJournal: bringing notes into a table", () => {
  const table = { id: "t1", name: "Friday Game" };

  beforeEach(() => {
    vi.clearAllMocks();
    installFakeStorage();
    listPersonalNotes.mockResolvedValue(NOTES);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("only offers it when the character is at a table", async () => {
    renderJournal({ table });
    expect(await screen.findByRole("button", { name: "Bring notes into Friday Game" })).toBeInTheDocument();
  });

  it("lets the player share some notes, bring one in as Just me, and keep the rest out", async () => {
    renderJournal({ table });
    await userEvent.click(await screen.findByRole("button", { name: "Bring notes into Friday Game" }));

    const panel = screen.getByRole("region", { name: "Bring notes into Friday Game" });
    const row = (text) => within(panel).getByText(new RegExp(text)).closest("li");

    // Everything starts as "Keep out": nothing happens until they choose.
    expect(within(panel).getByRole("button", { name: /^Bring in\s*0\s*notes/ })).toBeDisabled();

    await userEvent.click(within(row("We met Sildar")).getByLabelText("Share with the table"));
    await userEvent.click(within(row("Secret: I think")).getByLabelText("Bring in as Just me"));
    await userEvent.click(within(panel).getByRole("button", { name: /^Bring in\s*2\s*notes/ }));

    expect(addJournalEntry).toHaveBeenCalledTimes(2);
    expect(addJournalEntry).toHaveBeenCalledWith("t1", {
      body: "We met Sildar on the road.",
      visibility: "table",
      sessionNumber: 1,
    });
    expect(addJournalEntry).toHaveBeenCalledWith("t1", {
      body: "Secret: I think the mayor is a doppelganger.",
      visibility: "private",
      sessionNumber: 2,
    });
    // The innkeeper note was kept out, so it was never sent.
    expect(addJournalEntry).not.toHaveBeenCalledWith("t1", expect.objectContaining({ body: "The innkeeper is hiding something." }));
    expect(markNoteShared).toHaveBeenCalledWith("n1", { tableId: "t1", as: "table" });
    expect(markNoteShared).toHaveBeenCalledWith("n3", { tableId: "t1", as: "private" });
    expect(await screen.findByRole("status")).toHaveTextContent("Brought 2 notes into Friday Game's journal");
  });

  it("can share everything, or bring everything in as Just me, with one tap", async () => {
    renderJournal({ table });
    await userEvent.click(await screen.findByRole("button", { name: "Bring notes into Friday Game" }));

    await userEvent.click(screen.getByRole("button", { name: "Share everything with the table" }));
    await userEvent.click(screen.getByRole("button", { name: /^Bring in\s*3\s*notes/ }));

    expect(addJournalEntry).toHaveBeenCalledTimes(3);
    expect(addJournalEntry.mock.calls.every(([, entry]) => entry.visibility === "table")).toBe(true);
  });

  it("doesn't offer notes that were already brought into this table", async () => {
    listPersonalNotes.mockResolvedValue([
      note("n1", 1, "Already shared note.", { shared_table_id: "t1", shared_as: "table" }),
      note("n2", 2, "Still personal note."),
    ]);
    renderJournal({ table });
    await userEvent.click(await screen.findByRole("button", { name: "Bring notes into Friday Game" }));

    const panel = screen.getByRole("region", { name: "Bring notes into Friday Game" });
    expect(within(panel).getByText(/Still personal note/)).toBeInTheDocument();
    expect(within(panel).queryByText(/Already shared note/)).not.toBeInTheDocument();
    // The shared one is marked in the journal itself.
    expect(screen.getAllByText("Shared with a table").length).toBeGreaterThan(0);
  });

  it("says how far it got when sharing fails partway", async () => {
    addJournalEntry.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("Couldn't reach the server"));
    renderJournal({ table });
    await userEvent.click(await screen.findByRole("button", { name: "Bring notes into Friday Game" }));
    await userEvent.click(screen.getByRole("button", { name: "Share everything with the table" }));
    await userEvent.click(screen.getByRole("button", { name: /^Bring in\s*3\s*notes/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("1 of 3 notes were brought in before it stopped");
  });

  it("can be cancelled without sending anything", async () => {
    renderJournal({ table });
    await userEvent.click(await screen.findByRole("button", { name: "Bring notes into Friday Game" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(addJournalEntry).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Bring notes into Friday Game" })).not.toBeInTheDocument();
  });
});
