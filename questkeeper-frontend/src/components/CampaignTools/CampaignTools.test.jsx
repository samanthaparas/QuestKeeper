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

  it("asks one question: are these your older campaign's notes?, with who wrote them and when", async () => {
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));

    expect(screen.getByText("Are these your older campaign's notes?")).toBeInTheDocument();
    expect(document.querySelector(".campaign-tools__ask")).toHaveTextContent(
      "6 notes by Ash Moonshade, written Thu, Oct 22, 7:22 pm to Thu, Oct 22, 7:47 pm.",
    );
    // The rest stay as the current campaign.
    expect(screen.getByText(/Everything else/)).toHaveTextContent("Everything else (3 notes by DM, Pippa) stays as your current campaign.");
    // Nothing else is in the way.
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Name for the older campaign/)).not.toBeVisible();
  });

  it("moves the suggested notes when the answer is yes", async () => {
    const onChanged = renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    splitCampaign.mockResolvedValue({ campaign: 2, kept: 6, moved: 3 });

    await userEvent.click(screen.getByRole("button", { name: "Yes, move them" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Move these 6 notes into their own older campaign"));
    expect(splitCampaign).toHaveBeenCalledWith("t1", {
      // The first and last of those notes' own times.
      oldFrom: "2026-10-22T19:22:00",
      oldUntil: "2026-10-22T19:47:00",
      firstName: "",
      secondName: "",
      restartSecond: true,
    });
    expect(await screen.findByText(/Your older notes now have their own campaign/)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it("keeps names and numbering behind More options, and uses them", async () => {
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    splitCampaign.mockResolvedValue({ campaign: 2, kept: 6, moved: 3 });

    await userEvent.click(screen.getByText("More options"));
    await userEvent.type(screen.getByLabelText(/Name for the older campaign/), "Ash's campaign");
    await userEvent.type(screen.getByLabelText(/Name for the current campaign/), "Two Years Later");
    await userEvent.click(screen.getByLabelText(/Number the current campaign's sessions from 1/));
    await userEvent.click(screen.getByRole("button", { name: "Yes, move them" }));

    expect(splitCampaign).toHaveBeenCalledWith("t1", expect.objectContaining({
      firstName: "Ash's campaign",
      secondName: "Two Years Later",
      restartSecond: false,
    }));
  });

  it("lets the person choose the dates instead, with a preview and a way back", async () => {
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    await userEvent.click(screen.getByRole("button", { name: "No, I'll choose" }));

    expect(screen.getByText("When were the older campaign's notes written?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move the older notes" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("From"), "2026-10-22T19:00");
    await userEvent.type(screen.getByLabelText("Until"), "2026-10-22T20:00");
    const preview = document.querySelector(".campaign-tools__preview");
    expect(preview).toHaveTextContent("Older campaign: 6 notes by Ash Moonshade");
    expect(preview).toHaveTextContent("Current campaign: 3 notes by DM, Pippa");

    splitCampaign.mockResolvedValue({ campaign: 2, kept: 6, moved: 3 });
    await userEvent.click(screen.getByRole("button", { name: "Move the older notes" }));
    expect(splitCampaign).toHaveBeenCalledWith("t1", expect.objectContaining({
      oldFrom: new Date(2026, 9, 22, 19, 0).toISOString(),
      oldUntil: new Date(2026, 9, 22, 20, 0, 59, 999).toISOString(),
    }));

    await userEvent.click(screen.getByRole("button", { name: "Back to the suggestion" }));
    expect(screen.getByText("Are these your older campaign's notes?")).toBeInTheDocument();
  });

  it("warns when the chosen window catches nothing, and won't move", async () => {
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    await userEvent.click(screen.getByRole("button", { name: "No, I'll choose" }));
    await userEvent.type(screen.getByLabelText("From"), "2030-01-01T10:00");
    expect(screen.getByText("No notes fall in that window. Check the dates.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move the older notes" })).toBeDisabled();
  });

  it("doesn't move anything when the person backs out, and shows why a move failed", async () => {
    window.confirm.mockReturnValue(false);
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    await userEvent.click(screen.getByRole("button", { name: "Yes, move them" }));
    expect(splitCampaign).not.toHaveBeenCalled();

    window.confirm.mockReturnValue(true);
    splitCampaign.mockRejectedValue(new Error("You are not at this table"));
    await userEvent.click(screen.getByRole("button", { name: "Yes, move them" }));
    expect(await screen.findByText("You are not at this table")).toBeInTheDocument();
  });

  it("goes straight to choosing the dates when no suggestion can be made", async () => {
    const weekly = Array.from({ length: 4 }, (_, index) => note(`w${index}`, `2026-09-${String(1 + index * 7).padStart(2, "0")}T18:00:00`, "Weekly note"));
    renderTools({ entries: weekly });
    await userEvent.click(screen.getByText("Campaigns"));
    expect(screen.getByText("When were the older campaign's notes written?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to the suggestion" })).not.toBeInTheDocument();
  });

  it("once there are several campaigns, lists them to name, and still offers a fresh one", async () => {
    const two = MIXED.map((entry) => ({ ...entry, campaign_number: entry.id.startsWith("o") ? 1 : 2 }));
    renderTools({ entries: two, campaignNumber: 2, campaignNames: { 1: "Ash's campaign" } });
    await userEvent.click(screen.getByText(/^Campaigns/));

    expect(screen.queryByRole("button", { name: "Yes, move them" })).not.toBeInTheDocument();
    nameCampaign.mockResolvedValue(undefined);
    await userEvent.clear(screen.getByLabelText("Campaign 2"));
    await userEvent.type(screen.getByLabelText("Campaign 2"), "Two Years Later");
    await userEvent.click(screen.getAllByRole("button", { name: "Save name" })[1]);
    expect(nameCampaign).toHaveBeenCalledWith("t1", 2, "Two Years Later");

    startCampaign.mockResolvedValue({ campaign: 3 });
    await userEvent.click(screen.getByText("Start a brand new campaign"));
    await userEvent.type(screen.getByLabelText("Starting a brand new campaign from session 1?"), "Season 3");
    await userEvent.click(screen.getByRole("button", { name: "Start campaign 3" }));
    expect(startCampaign).toHaveBeenCalledWith("t1", "Season 3");
  });
});
