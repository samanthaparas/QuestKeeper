import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "./SettingsPage";
import { updateDisplayName, updateEmail, updatePassword } from "../../utils/account";
import { installFakeStorage } from "../../test/fakeStorage";
import { runDbChecks } from "../../utils/dbCheck";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/dbCheck", () => ({ runDbChecks: vi.fn() }));
vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: { email: "sam@example.com", user_metadata: { display_name: "Sam" } } }),
}));
vi.mock("../../utils/account", async (importOriginal) => ({
  ...(await importOriginal()),
  updateDisplayName: vi.fn().mockResolvedValue({}),
  updateEmail: vi.fn().mockResolvedValue({}),
  updatePassword: vi.fn().mockResolvedValue({}),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    installFakeStorage();
    delete document.documentElement.dataset.motion;
    delete document.documentElement.dataset.theme;
    vi.clearAllMocks();
  });

  it("starts with the saved display name and saves a new one", async () => {
    render(<SettingsPage />);
    const input = screen.getByLabelText("Display name");
    expect(input).toHaveValue("Sam");

    await userEvent.clear(input);
    await userEvent.type(input, "Samantha");
    await userEvent.click(screen.getByRole("button", { name: "Save name" }));

    expect(updateDisplayName).toHaveBeenCalledWith("Samantha");
    expect(await screen.findByText("Display name saved.")).toBeInTheDocument();
  });

  it("lets you pick Dark, Light, or Match my device, and remembers it", async () => {
    render(<SettingsPage />);
    expect(screen.getByLabelText("Match my device")).toBeChecked();

    await userEvent.click(screen.getByLabelText("Dark"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("qk-theme")).toBe("dark");

    await userEvent.click(screen.getByLabelText("Light"));
    expect(document.documentElement.dataset.theme).toBe("light");

    await userEvent.click(screen.getByLabelText("Match my device"));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem("qk-theme")).toBeNull();
  });

  it("checks whether the newest SQL files have been run, and names any that haven't", async () => {
    runDbChecks.mockResolvedValue([
      { file: "20261122_campaign_start_session.sql", what: "Start a new campaign at any session", status: "missing" },
      { file: "20261116_player_brb.sql", what: "Players can step away (brb)", status: "ok" },
    ]);
    render(<SettingsPage />);
    await userEvent.click(screen.getByRole("button", { name: "Check the database" }));

    expect(await screen.findByText("1 SQL file needs running in the Supabase SQL editor.")).toBeInTheDocument();
    expect(screen.getByText("20261122_campaign_start_session.sql").closest("li")).toHaveTextContent("Not run yet");
  });

  it("says when everything is up to date", async () => {
    runDbChecks.mockResolvedValue([{ file: "a.sql", what: "A", status: "ok" }]);
    render(<SettingsPage />);
    await userEvent.click(screen.getByRole("button", { name: "Check the database" }));
    expect(await screen.findByText("✓ Everything is up to date.")).toBeInTheDocument();
  });

  it("makes text bigger and contrast higher, saved on this device", async () => {
    render(<SettingsPage />);
    expect(screen.getByRole("radio", { name: "Normal" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Largest" }));
    expect(document.documentElement.dataset.textSize).toBe("larger");
    expect(window.localStorage.getItem("qk-text-size")).toBe("larger");

    await userEvent.click(screen.getByLabelText("High contrast"));
    expect(document.documentElement.dataset.contrast).toBe("high");

    await userEvent.click(screen.getByRole("radio", { name: "Normal" }));
    await userEvent.click(screen.getByLabelText("High contrast"));
    expect(document.documentElement.dataset.textSize).toBeUndefined();
    expect(document.documentElement.dataset.contrast).toBeUndefined();
  });

  it("lets an experienced player turn beginner tips off, and remembers it on this device", async () => {
    render(<SettingsPage />);
    const box = screen.getByLabelText("Show beginner tips");
    expect(box).toBeChecked();

    await userEvent.click(box);
    expect(window.localStorage.getItem("qk-beginner-tips")).toBe("off");

    await userEvent.click(box);
    expect(window.localStorage.getItem("qk-beginner-tips")).toBeNull();
  });

  it("lets a player turn the turn heads-up off, and remembers it on this device", async () => {
    render(<SettingsPage />);
    const box = screen.getByLabelText("Give me a heads-up");
    expect(box).toBeChecked();

    await userEvent.click(box);
    expect(box).not.toBeChecked();
    expect(window.localStorage.getItem("qk-turn-heads-up")).toBe("off");

    await userEvent.click(box);
    expect(window.localStorage.getItem("qk-turn-heads-up")).toBeNull();
  });

  it("turns Reduce Motion on for this device", async () => {
    render(<SettingsPage />);
    await userEvent.click(screen.getByLabelText("Reduce motion"));
    expect(document.documentElement.dataset.motion).toBe("reduce");
    expect(window.localStorage.getItem("qk-motion")).toBe("reduce");
  });

  it("shows the current email and explains the confirmation link", async () => {
    render(<SettingsPage />);
    expect(screen.getByText("sam@example.com")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("New email"), "new@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Change email" }));

    expect(updateEmail).toHaveBeenCalledWith("new@example.com");
    expect(await screen.findByText(/Check new@example.com for a link/)).toBeInTheDocument();
  });

  it("won't change the password when the two don't match", async () => {
    render(<SettingsPage />);
    await userEvent.type(screen.getByLabelText("New password"), "dragon-hoard");
    await userEvent.type(screen.getByLabelText("Type it again"), "dragon-hoarde");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(updatePassword).not.toHaveBeenCalled();
    expect(screen.getByText("The two passwords don't match.")).toBeInTheDocument();
  });

  it("shows Supabase's problem in plain words", async () => {
    updatePassword.mockRejectedValueOnce(new Error("That's already your password. Pick a new one."));
    render(<SettingsPage />);
    await userEvent.type(screen.getByLabelText("New password"), "dragon-hoard");
    await userEvent.type(screen.getByLabelText("Type it again"), "dragon-hoard");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("That's already your password. Pick a new one.")).toBeInTheDocument();
  });
});
