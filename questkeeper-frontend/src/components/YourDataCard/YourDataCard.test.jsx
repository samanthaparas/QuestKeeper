import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import YourDataCard from "./YourDataCard";
import { countTablesIRun, deleteMyAccount, downloadMyData } from "../../utils/account";

vi.mock("../../utils/account", () => ({
  countTablesIRun: vi.fn(),
  deleteMyAccount: vi.fn(),
  downloadMyData: vi.fn(),
}));

function renderCard() {
  return render(
    <MemoryRouter initialEntries={["/settings"]}>
      <Routes>
        <Route path="/settings" element={<YourDataCard />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("YourDataCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    countTablesIRun.mockResolvedValue(0);
    deleteMyAccount.mockResolvedValue();
    downloadMyData.mockResolvedValue();
  });

  it("downloads the person's data and says it's done", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Download my data" }));
    expect(downloadMyData).toHaveBeenCalled();
    expect(await screen.findByText("Downloaded.")).toBeInTheDocument();
  });

  it("says so when the download fails", async () => {
    downloadMyData.mockRejectedValue(new Error("You are signed out. Log in first."));
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Download my data" }));
    expect(await screen.findByText("You are signed out. Log in first.")).toBeInTheDocument();
  });

  it("asks first, and only deletes after DELETE is typed", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Delete my account…" }));

    const confirm = screen.getByRole("button", { name: "Delete everything for good" });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "delete me");
    expect(confirm).toBeDisabled();
    expect(deleteMyAccount).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText("Type DELETE to confirm"));
    await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await userEvent.click(confirm);

    expect(deleteMyAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("warns that tables they run are deleted for their players too", async () => {
    countTablesIRun.mockResolvedValue(2);
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Delete my account…" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You run 2 tables. Deleting your account deletes them for your players too.");
  });

  it("keeps the account when they change their mind", async () => {
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Delete my account…" }));
    await userEvent.click(screen.getByRole("button", { name: "Keep my account" }));
    expect(screen.queryByLabelText("Type DELETE to confirm")).not.toBeInTheDocument();
    expect(deleteMyAccount).not.toHaveBeenCalled();
  });

  it("stays on the page and says why when the deletion fails", async () => {
    deleteMyAccount.mockRejectedValue(new Error("The account couldn't be deleted. Nothing else was changed, so please try again."));
    renderCard();
    await userEvent.click(screen.getByRole("button", { name: "Delete my account…" }));
    await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await userEvent.click(screen.getByRole("button", { name: "Delete everything for good" }));
    expect(await screen.findByText(/couldn't be deleted/)).toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
  });
});
