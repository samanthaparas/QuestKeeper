import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AuthPage from "./AuthPage";
import ProtectedRoute from "../../components/ProtectedRoute/ProtectedRoute";
import { signIn, signUp } from "../../utils/auth";
import { readDestination } from "../../utils/continueAfterLogin";
import { installFakeStorage } from "../../test/fakeStorage";

vi.mock("../../utils/auth", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));
const auth = vi.hoisted(() => ({ user: null }));
vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: auth.user, isLoading: false }),
}));

const SIGNED_IN = { data: { session: { user: { id: "u1" } } }, error: null };

function Landed() {
  const location = useLocation();
  return <p data-testid="landed">{`${location.pathname}${location.search} ${JSON.stringify(location.state)}`}</p>;
}

function renderAt(entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route
          path="/characters/new"
          element={
            <ProtectedRoute>
              <Landed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games"
          element={
            <ProtectedRoute>
              <Landed />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillIn() {
  await userEvent.type(screen.getByLabelText(/email/i), "me@example.com");
  await userEvent.type(screen.getByLabelText(/^password/i), "secret-test-pass");
}

describe("AuthPage", () => {
  beforeEach(() => {
    installFakeStorage();
    auth.user = null;
    signIn.mockReset().mockResolvedValue(SIGNED_IN);
    signUp.mockReset().mockResolvedValue(SIGNED_IN);
  });

  it("says why an account is needed, even with nowhere in particular to go", () => {
    renderAt("/login");
    expect(screen.getByRole("heading", { name: "Why sign in?" })).toBeInTheDocument();
    expect(screen.getByText(/never need one/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See a sample character sheet" })).toHaveAttribute("href", "/sample/character");
  });

  it("names the quiz build and says what happens next, then goes there with it", async () => {
    // The quiz's "Use this build" leads to character creation, which asks to sign in.
    renderAt({ pathname: "/characters/new", state: { quizBuild: "iron-guardian", name: "Bram" } });
    expect(screen.getByRole("heading", { name: "Save your Iron Guardian" })).toBeInTheDocument();
    expect(screen.getByText(/character creation opens with the Iron Guardian from your quiz already filled in/)).toBeInTheDocument();

    auth.user = { id: "u1" };
    await fillIn();
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(await screen.findByTestId("landed")).toHaveTextContent(
      '/characters/new {"quizBuild":"iron-guardian","name":"Bram"}',
    );
    // Done with: nothing left to offer later.
    expect(readDestination()).toBeNull();
  });

  it("still knows where to go after the sign-in page is reloaded", async () => {
    const first = renderAt({ pathname: "/characters/new", state: { quizBuild: "iron-guardian" } });
    first.unmount();
    // A reload in a fresh tab has no history state, only this device's note.
    renderAt("/login");
    expect(screen.getByRole("heading", { name: "Save your Iron Guardian" })).toBeInTheDocument();
    auth.user = { id: "u1" };
    await fillIn();
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(await screen.findByTestId("landed")).toHaveTextContent('/characters/new {"quizBuild":"iron-guardian"}');
  });

  it("keeps a link's own words (an invite ?code=) for after signing in", async () => {
    renderAt("/games?code=ABC123");
    expect(screen.getByRole("heading", { name: "Join or run a table" })).toBeInTheDocument();
    auth.user = { id: "u1" };
    await fillIn();
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(await screen.findByTestId("landed")).toHaveTextContent("/games?code=ABC123");
  });

  it("after signing up with an email to confirm, keeps the place for when they log in", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" }, session: null }, error: null });
    renderAt({ pathname: "/characters/new", state: { quizBuild: "iron-guardian" } });
    await userEvent.click(screen.getByRole("button", { name: "Need an account? Sign up" }));
    await fillIn();
    await userEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Your place is saved on this device.");
    expect(readDestination()).toEqual({ from: "/characters/new", fromState: { quizBuild: "iron-guardian" } });

    // They confirm in another tab and log in there.
    await userEvent.click(screen.getByRole("button", { name: "I've confirmed it, log in" }));
    auth.user = { id: "u1" };
    await userEvent.type(screen.getByLabelText(/^password/i), "secret-test-pass");
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(await screen.findByTestId("landed")).toHaveTextContent('/characters/new {"quizBuild":"iron-guardian"}');
  });

  it("shows a failed sign-in as an alert tied to the fields", async () => {
    signIn.mockResolvedValue({ data: null, error: { message: "Invalid login credentials" } });
    renderAt("/login");
    await fillIn();
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid login credentials");
    expect(screen.getByLabelText(/email/i)).toHaveAccessibleDescription("Invalid login credentials");
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("never follows a link off QuestKeeper", async () => {
    renderAt({ pathname: "/login", state: { from: "//evil.example", fromState: { anything: true } } });
    await fillIn();
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(await screen.findByTestId("landed")).toHaveTextContent("/characters null");
  });

  it("lets someone on a shared device drop another person's unfinished step", async () => {
    renderAt({ pathname: "/characters/new", state: { quizBuild: "iron-guardian" } });
    expect(screen.getByRole("heading", { name: "Save your Iron Guardian" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start fresh instead" }));
    expect(screen.getByRole("heading", { name: "Why sign in?" })).toHaveFocus();
    expect(readDestination()).toBeNull();
    await fillIn();
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(await screen.findByTestId("landed")).toHaveTextContent("/characters null");
  });
});
