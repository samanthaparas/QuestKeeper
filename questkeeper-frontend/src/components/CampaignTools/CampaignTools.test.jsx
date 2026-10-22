import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CampaignTools from "./CampaignTools";
import { nameCampaign, splitCampaign, startCampaign } from "../../utils/journalStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/journalStore", () => ({
  splitCampaign: vi.fn(),
  startCampaign: vi.fn(),
  nameCampaign: vi.fn(),
}));

const note = (id, created_at, body, extra = {}) => ({
  id,
  created_at,
  body,
  author_name: "DM",
  campaign_number: 1,
  session_number: 1,
  ...extra,
});

// The group's real situation: the current campaign's notes were written on game
// nights, then one person typed the whole OLD campaign in on one evening.
const MIXED = [
  note("n1", "2026-10-05T18:00:00", "Current campaign: session one.", { session_number: 1 }),
  note("n2", "2026-10-12T18:00:00", "Current campaign: session two.", { session_number: 2, author_name: "Pippa" }),
  note("n3", "2026-10-19T18:00:00", "Current campaign: session three.", { session_number: 3 }),
  ...Array.from({ length: 6 }, (_, index) =>
    note(`o${index}`, `2026-10-22T19:${String(22 + index * 5).padStart(2, "0")}:00`, `Old campaign notes ${index + 1}`, {
      author_name: "Ash Moonshade",
      session_number: 1,
    }),
  ),
];

function renderTools(props = {}) {
  const onChanged = vi.fn();
  render(<CampaignTools tableId="t1" entries={MIXED} campaignNumber={1} campaignNames={{}} onChanged={onChanged} {...props} />);
  return onChanged;
}

describe("CampaignTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("notices a batch of notes typed in at once (the newest ones) and fills in the window when asked", async () => {
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    expect(screen.getByText(/I noticed 6 notes by Ash Moonshade/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Use this" }));
    expect(screen.getByLabelText(/written from/)).toHaveValue("2026-10-22T19:22");
    expect(screen.getByLabelText("until")).toHaveValue("2026-10-22T19:47");

    const preview = document.querySelector(".campaign-tools__preview");
    // The typed-in batch is the older campaign; the game-night notes are the current one.
    expect(preview).toHaveTextContent(/Older campaign: 6 notes by Ash Moonshade/);
    expect(preview).toHaveTextContent(/Current campaign: 3 notes by DM \(2\), Pippa \(1\)/);
  });

  it("does nothing until a window is chosen", async () => {
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    expect(screen.getByRole("button", { name: "Split into two campaigns" })).toBeDisabled();
    expect(document.querySelector(".campaign-tools__preview")).toBeNull();
  });

  it("splits with the window, the names and the restart choice", async () => {
    const onChanged = renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    splitCampaign.mockResolvedValue({ campaign: 2, kept: 6, moved: 3 });

    await userEvent.click(screen.getByRole("button", { name: "Use this" }));
    await userEvent.type(screen.getByLabelText(/Name for the older campaign/), "Ash's campaign");
    await userEvent.type(screen.getByLabelText(/Name for the current campaign/), "Two Years Later");
    await userEvent.click(screen.getByRole("button", { name: "Split into two campaigns" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("The 6 notes written in that window become the older campaign"));
    expect(splitCampaign).toHaveBeenCalledWith("t1", {
      oldFrom: new Date(2026, 9, 22, 19, 22).toISOString(),
      oldUntil: new Date(2026, 9, 22, 19, 47, 59, 999).toISOString(),
      firstName: "Ash's campaign",
      secondName: "Two Years Later",
      restartSecond: true,
    });
    expect(await screen.findByText(/6 notes stay in the older campaign and 3 moved to the new one/)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it("warns when the window catches no notes, and won't split", async () => {
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    await userEvent.type(screen.getByLabelText(/written from/), "2030-01-01T10:00");
    expect(screen.getByText("No notes fall in that window. Check the dates.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Split into two campaigns" })).toBeDisabled();
  });

  it("doesn't split when the person backs out of the question, and shows why a split failed", async () => {
    window.confirm.mockReturnValue(false);
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    await userEvent.click(screen.getByRole("button", { name: "Use this" }));
    await userEvent.click(screen.getByRole("button", { name: "Split into two campaigns" }));
    expect(splitCampaign).not.toHaveBeenCalled();

    window.confirm.mockReturnValue(true);
    splitCampaign.mockRejectedValue(new Error("You are not at this table"));
    await userEvent.click(screen.getByRole("button", { name: "Split into two campaigns" }));
    expect(await screen.findByText("You are not at this table")).toBeInTheDocument();
  });

  it("once there are several campaigns, lists them to name, and still offers a fresh one", async () => {
    const two = MIXED.map((entry) => ({ ...entry, campaign_number: entry.id.startsWith("o") ? 1 : 2 }));
    renderTools({ entries: two, campaignNumber: 2, campaignNames: { 1: "Ash's campaign" } });
    await userEvent.click(screen.getByText(/^Campaigns/));

    expect(screen.queryByRole("button", { name: "Split into two campaigns" })).not.toBeInTheDocument();
    nameCampaign.mockResolvedValue(undefined);
    await userEvent.clear(screen.getByLabelText("Campaign 2"));
    await userEvent.type(screen.getByLabelText("Campaign 2"), "Two Years Later");
    await userEvent.click(screen.getAllByRole("button", { name: "Save name" })[1]);
    expect(nameCampaign).toHaveBeenCalledWith("t1", 2, "Two Years Later");

    startCampaign.mockResolvedValue({ campaign: 3 });
    await userEvent.type(screen.getByLabelText("Starting a brand new campaign from session 1?"), "Season 3");
    await userEvent.click(screen.getByRole("button", { name: "Start campaign 3" }));
    expect(startCampaign).toHaveBeenCalledWith("t1", "Season 3");
  });
});
