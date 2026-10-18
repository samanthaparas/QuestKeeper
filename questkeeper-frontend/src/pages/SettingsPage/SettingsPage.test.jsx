import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "./SettingsPage";
import { updateDisplayName, updateEmail, updatePassword } from "../../utils/account";
import { installFakeStorage } from "../../test/fakeStorage";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
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
