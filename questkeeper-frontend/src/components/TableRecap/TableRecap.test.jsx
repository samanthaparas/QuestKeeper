import { describe, it, expect, vi, beforeEach } from "vitest";
import { installFakeStorage } from "../../test/fakeStorage";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TableRecap from "./TableRecap";
import { listRecaps, saveRecap } from "../../utils/recapStore";
import { writeRecapFromNotes } from "../../utils/api";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/recapStore", () => ({
  listRecaps: vi.fn(),
  saveRecap: vi.fn(),
  subscribeToRecaps: vi.fn(() => () => {}),
}));
vi.mock("../../utils/api", () => ({ writeRecapFromNotes: vi.fn() }));

const ENTRIES = [
  { id: "1", session_number: 2, visibility: "table", author_name: "DM", body: "The bridge collapsed." },
  { id: "2", session_number: 2, visibility: "table", author_name: "Pippa", body: "I caught the rope." },
  { id: "3", session_number: 2, visibility: "private", author_name: "Pippa", body: "Secret: I'm the duke's niece." },
  { id: "4", session_number: 3, visibility: "table", author_name: "DM", body: "A new session begins." },
];

const RECAP = {
  table_id: "t1",
  session_number: 2,
  body: "The bridge fell.\n\nPippa caught the rope.",
  updated_by_name: "Pippa",
  updated_at: "2026-10-19T20:00:00Z",
};

const renderRecap = (props = {}) =>
  render(<TableRecap tableId="t1" entries={ENTRIES} currentSession={3} {...props} />);

describe("TableRecap", () => {
  beforeEach(() => {
    // Unsaved recap drafts are kept on the device; start each test clean.
    installFakeStorage();
    listRecaps.mockReset().mockResolvedValue([]);
    saveRecap.mockReset().mockResolvedValue({});
    writeRecapFromNotes.mockReset();
  });

  it("shows the last session before the current one, and says when nobody wrote a recap", async () => {
    renderRecap();
    expect(screen.getByText("Session 2")).toBeInTheDocument();
    expect(screen.getByText("No recap yet")).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Previously on/));
    expect(screen.getByText(/Nobody has written a recap for session 2 yet/)).toBeInTheDocument();
  });

  it("opens by itself when there's a recap, and shows who last changed it", async () => {
    listRecaps.mockResolvedValue([RECAP]);
    renderRecap();
    expect(await screen.findByText("The bridge fell.")).toBeInTheDocument();
    expect(screen.getByText("Pippa caught the rope.")).toBeInTheDocument();
    expect(screen.getByText(/Last changed by Pippa/)).toBeInTheDocument();
  });

  it("lets anyone write one and save it against the version they started from", async () => {
    renderRecap();
    await userEvent.click(screen.getByText(/Previously on/));
    await userEvent.click(screen.getByRole("button", { name: "Write one" }));
    await userEvent.type(screen.getByRole("textbox", { name: /Recap for session 2/ }), "The party crossed the bridge.");
    await userEvent.click(screen.getByRole("button", { name: "Save recap" }));

    expect(saveRecap).toHaveBeenCalledWith("t1", 2, "The party crossed the bridge.", null, 1);
  });

  it("edits an existing recap, passing the saved version's time", async () => {
    listRecaps.mockResolvedValue([RECAP]);
    renderRecap();
    await screen.findByText("The bridge fell.");
    await userEvent.click(screen.getByRole("button", { name: "Edit recap" }));
    const box = screen.getByRole("textbox", { name: /Recap for session 2/ });
    expect(box).toHaveValue(RECAP.body);
    await userEvent.type(box, " Then it rained.");
    await userEvent.click(screen.getByRole("button", { name: "Save recap" }));

    expect(saveRecap).toHaveBeenCalledWith("t1", 2, `${RECAP.body} Then it rained.`, RECAP.updated_at, 1);
  });

  it("says so when someone else saved first, keeps your words, and lets you replace theirs on purpose", async () => {
    listRecaps.mockResolvedValue([RECAP]);
    renderRecap();
    await screen.findByText("The bridge fell.");
    await userEvent.click(screen.getByRole("button", { name: "Edit recap" }));

    const failure = Object.assign(new Error("Someone else changed this recap just now."), { code: "changed" });
    saveRecap.mockRejectedValueOnce(failure);
    listRecaps.mockResolvedValue([{ ...RECAP, body: "Their version.", updated_at: "2026-10-19T20:05:00Z" }]);

    await userEvent.type(screen.getByRole("textbox", { name: /Recap for session 2/ }), " Mine.");
    await userEvent.click(screen.getByRole("button", { name: "Save recap" }));

    expect(await screen.findByText(/Someone else changed this just now/)).toBeInTheDocument();
    // Their saved words really are shown above the box, with who and when.
    expect(screen.getByText("Their saved version")).toBeInTheDocument();
    expect(screen.getByText("Their version.")).toBeInTheDocument();
    expect(screen.getByText(/Last changed by Pippa/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Recap for session 2/ })).toHaveValue(`${RECAP.body} Mine.`);

    await userEvent.click(screen.getByRole("button", { name: "Save recap" }));
    await waitFor(() => expect(saveRecap).toHaveBeenLastCalledWith("t1", 2, `${RECAP.body} Mine.`, "2026-10-19T20:05:00Z", 1));
  });

  it("drafts from the notes marked for the whole table only, never a private note, and doesn't save it", async () => {
    writeRecapFromNotes.mockResolvedValue({ recap: "Pippa caught the rope as the bridge fell." });
    renderRecap();
    await userEvent.click(screen.getByText(/Previously on/));
    await userEvent.click(screen.getByRole("button", { name: "Draft from the notes" }));

    expect(writeRecapFromNotes).toHaveBeenCalledWith({
      sessionNumber: 2,
      entries: [
        { author: "DM", text: "The bridge collapsed." },
        { author: "Pippa", text: "I caught the rope." },
      ],
    });
    expect(await screen.findByRole("textbox", { name: /Recap for session 2/ })).toHaveValue(
      "Pippa caught the rope as the bridge fell.",
    );
    expect(screen.getByText(/Here's a draft from the notes/)).toBeInTheDocument();
    expect(saveRecap).not.toHaveBeenCalled();
  });

  it("explains when a draft can't be written", async () => {
    writeRecapFromNotes.mockResolvedValue({ recap: "", message: "Recaps aren't set up yet." });
    renderRecap();
    await userEvent.click(screen.getByText(/Previously on/));
    await userEvent.click(screen.getByRole("button", { name: "Draft from the notes" }));
    expect(await screen.findByText("Recaps aren't set up yet.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("has nothing to draft from when a session has no notes for the whole table", async () => {
    renderRecap({ entries: [ENTRIES[2]] });
    await userEvent.click(screen.getByText(/Previously on/));
    expect(screen.getByRole("button", { name: "Draft from the notes" })).toBeDisabled();
    expect(screen.getByText(/nothing to draft from/)).toBeInTheDocument();
  });

  it("lets you look at another session's recap", async () => {
    listRecaps.mockResolvedValue([{ ...RECAP, session_number: 3, body: "Session three recap." }]);
    renderRecap();
    await userEvent.click(screen.getByText(/Previously on/));
    await userEvent.selectOptions(screen.getByLabelText(/Recap for session/), "3");
    expect(await screen.findByText("Session three recap.")).toBeInTheDocument();
  });

  it("keeps campaigns apart: only this campaign's recaps show, labelled campaign.session, and saves go to it", async () => {
    listRecaps.mockResolvedValue([
      { ...RECAP, campaign_number: 1, session_number: 2, body: "Old campaign recap." },
      { ...RECAP, campaign_number: 2, session_number: 2, body: "Season two recap." },
    ]);
    renderRecap({ campaign: 2, showCampaign: true });
    expect(await screen.findByText("Season two recap.")).toBeInTheDocument();
    expect(screen.queryByText("Old campaign recap.")).not.toBeInTheDocument();
    expect(screen.getByText("Session 2.2")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit recap" }));
    await userEvent.click(screen.getByRole("button", { name: "Save recap" }));
    expect(saveRecap).toHaveBeenCalledWith("t1", 2, "Season two recap.", RECAP.updated_at, 2);
  });
});
