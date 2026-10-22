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
  author_name: "Ash",
  campaign_number: 1,
  session_number: 1,
  ...extra,
});

// Three old notes (2024), then a long pause, then two new ones (2026).
const MIXED = [
  note("a", "2024-03-01T20:00:00Z", "The party met in a tavern."),
  note("b", "2024-03-08T20:00:00Z", "They fought the dragon."),
  note("c", "2024-03-15T20:00:00Z", "The dragon fell. The end."),
  note("d", "2026-02-02T20:00:00Z", "Two years later, a new party."),
  note("e", "2026-02-09T20:00:00Z", "They found a map."),
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

  it("finds the pause between the two campaigns and fills in the day when asked", async () => {
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    expect(screen.getByText(/I found a pause of about/)).toHaveTextContent("The dragon fell. The end.");
    expect(screen.getByText(/I found a pause of about/)).toHaveTextContent("Two years later, a new party.");

    await userEvent.click(screen.getByRole("button", { name: "Split there" }));
    expect(screen.getByLabelText("The new campaign started on")).toHaveValue("2026-02-02");
    expect(document.querySelector(".campaign-tools__preview")).toHaveTextContent(
      "3 notes stay in the first campaign, and 2 notes move to the new one.",
    );
    expect(screen.getByText(/First note of the new campaign/)).toHaveTextContent("Two years later, a new party.");
  });

  it("does nothing until a day is picked, then splits with the names and the restart choice", async () => {
    const onChanged = renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    expect(screen.getByRole("button", { name: "Split into two campaigns" })).toBeDisabled();

    splitCampaign.mockResolvedValue({ campaign: 2, kept: 3, moved: 2 });
    await userEvent.click(screen.getByRole("button", { name: "Split there" }));
    await userEvent.type(screen.getByLabelText(/Name for the first campaign/), "Ash's campaign");
    await userEvent.type(screen.getByLabelText(/Name for the new campaign/), "Two Years Later");
    await userEvent.click(screen.getByRole("button", { name: "Split into two campaigns" }));

    expect(splitCampaign).toHaveBeenCalledWith("t1", {
      cutoff: new Date(2026, 1, 2).toISOString(),
      firstName: "Ash's campaign",
      secondName: "Two Years Later",
      restartSecond: true,
    });
    expect(await screen.findByText(/3 notes stay in the first campaign and 2 moved to the new one/)).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalled();
  });

  it("doesn't split when the DM backs out of the question", async () => {
    window.confirm.mockReturnValue(false);
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    await userEvent.click(screen.getByRole("button", { name: "Split there" }));
    await userEvent.click(screen.getByRole("button", { name: "Split into two campaigns" }));
    expect(splitCampaign).not.toHaveBeenCalled();
  });

  it("shows why a split failed", async () => {
    splitCampaign.mockRejectedValue(new Error("Only the DM can split a campaign"));
    renderTools();
    await userEvent.click(screen.getByText("Campaigns"));
    await userEvent.click(screen.getByRole("button", { name: "Split there" }));
    await userEvent.click(screen.getByRole("button", { name: "Split into two campaigns" }));
    expect(await screen.findByText("Only the DM can split a campaign")).toBeInTheDocument();
  });

  it("once there are several campaigns, lists them to name, and still offers a fresh one", async () => {
    const two = MIXED.map((entry) => ({ ...entry, campaign_number: entry.id < "d" ? 1 : 2 }));
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
