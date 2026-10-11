import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomebrewSharing from "./HomebrewSharing";
import { listMyTables } from "../../utils/tableStore";
import {
  listMyTableShares,
  shareWithTable,
  stopSharingWithTable,
  createInvite,
  listPendingInvites,
  listGrants,
  removeGrant,
} from "../../utils/homebrewStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/tableStore", () => ({ listMyTables: vi.fn() }));
vi.mock("../../utils/homebrewStore", () => ({
  listMyTableShares: vi.fn(),
  shareWithTable: vi.fn(),
  stopSharingWithTable: vi.fn(),
  createInvite: vi.fn(),
  listPendingInvites: vi.fn(),
  cancelInvite: vi.fn(),
  inviteUrl: (code) => `https://qk.test/#/homebrew/invite/${code}`,
  listGrants: vi.fn(),
  removeGrant: vi.fn(),
}));

const jordanGrant = {
  owner_id: "me",
  grantee_id: "jordan",
  recipient_label: "Jordan",
  created_at: "2026-10-01T00:00:00Z",
};
const alexGrant = { owner_id: "alex", grantee_id: "me", sender_label: "Alex" };

describe("HomebrewSharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMyTables.mockResolvedValue([
      { id: "t1", name: "Friday Group", dm_id: "me" },
      { id: "t2", name: "Alex's Game", dm_id: "alex" },
    ]);
    listMyTableShares.mockResolvedValue(["t2"]);
    listPendingInvites.mockResolvedValue([]);
    listGrants.mockResolvedValue({ sharedByMe: [jordanGrant], sharedWithMe: [alexGrant] });
  });

  it("ticks the tables you already share with and toggles them", async () => {
    render(<HomebrewSharing userId="me" />);

    const friday = await screen.findByRole("checkbox", { name: /Friday Group/ });
    const alexs = screen.getByRole("checkbox", { name: /Alex's Game/ });
    expect(friday).not.toBeChecked();
    expect(alexs).toBeChecked();
    expect(screen.getByText("You're the DM")).toBeInTheDocument();

    await userEvent.click(friday);
    expect(shareWithTable).toHaveBeenCalledWith("t1");
    expect(friday).toBeChecked();

    await userEvent.click(alexs);
    expect(stopSharingWithTable).toHaveBeenCalledWith("me", "t2");
  });

  it("makes an invite link and shows it to copy", async () => {
    createInvite.mockResolvedValue({
      id: "i1",
      code: "ABC123",
      recipient_label: "Riley",
      expires_at: "2099-01-01T00:00:00Z",
    });
    render(<HomebrewSharing userId="me" />);
    await screen.findByText("Friday Group");

    await userEvent.type(screen.getByLabelText("Who it's for"), "Riley");
    await userEvent.type(screen.getByLabelText(/Your name/), "Sam");
    await userEvent.click(screen.getByRole("button", { name: "Make invite link" }));

    expect(createInvite).toHaveBeenCalledWith({ recipientLabel: "Riley", senderLabel: "Sam" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "https://qk.test/#/homebrew/invite/ABC123",
    );
    expect(screen.getByText("For Riley")).toBeInTheDocument();
  });

  it("asks for both names before making a link", async () => {
    render(<HomebrewSharing userId="me" />);
    await screen.findByText("Friday Group");
    await userEvent.click(screen.getByRole("button", { name: "Make invite link" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/who it's for/);
    expect(createInvite).not.toHaveBeenCalled();
  });

  it("lets you revoke someone, or remove someone else's homebrew", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onAccessRemoved = vi.fn();
    render(<HomebrewSharing userId="me" onAccessRemoved={onAccessRemoved} />);

    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
    expect(removeGrant).toHaveBeenCalledWith("me", "jordan");
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove from my account" }));
    expect(removeGrant).toHaveBeenCalledWith("alex", "me");
    expect(onAccessRemoved).toHaveBeenCalled();
  });
});
