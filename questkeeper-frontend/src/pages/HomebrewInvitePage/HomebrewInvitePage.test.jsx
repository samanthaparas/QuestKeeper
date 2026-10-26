import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HomebrewInvitePage from "./HomebrewInvitePage";
import { getInvite, acceptInvite } from "../../utils/homebrewStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/homebrewStore", () => ({
  getInvite: vi.fn(),
  acceptInvite: vi.fn(),
}));

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/homebrew/invite/ABC123"]}>
      <Routes>
        <Route path="/homebrew/invite/:code" element={<HomebrewInvitePage />} />
        <Route path="/homebrew" element={<p>My Homebrew page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HomebrewInvitePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows who it's from and accepts", async () => {
    getInvite.mockResolvedValue({ sender_label: "Sam", status: "ok" });
    acceptInvite.mockResolvedValue();
    renderPage();

    expect(await screen.findByText("Sam")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(acceptInvite).toHaveBeenCalledWith("ABC123");
    expect(await screen.findByText("My Homebrew page")).toBeInTheDocument();
  });

  it("explains a used link", async () => {
    getInvite.mockResolvedValue({ sender_label: "Sam", status: "used" });
    renderPage();
    expect(await screen.findByText(/already been used/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });

  it("shows an error if accepting fails", async () => {
    getInvite.mockResolvedValue({ sender_label: "Sam", status: "ok" });
    acceptInvite.mockRejectedValue(new Error("That invite link has expired"));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Accept" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("expired");
  });

  it("says it's checking, then offers Try again if the check itself fails, and recovers", async () => {
    getInvite.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValue({ sender_label: "Sam", status: "ok" });
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Checking your invite");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't check this invite");
    expect(alert).not.toHaveTextContent("fetch");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Sam")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Homebrew invite" })).toBeInTheDocument();
  });

  it("keeps Accept available after a failed accept, and never offers to retry a dead link", async () => {
    getInvite.mockResolvedValue({ sender_label: "Sam", status: "ok" });
    acceptInvite.mockRejectedValueOnce(new Error("boom"));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Accept" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
    expect(screen.getByRole("button", { name: "Accept" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("doesn't turn an expired, used or unknown link into something to retry", async () => {
    getInvite.mockResolvedValue({ sender_label: "Sam", status: "expired" });
    renderPage();
    expect(await screen.findByText(/has expired/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Try again|Accept/ })).toBeNull();
  });
});
