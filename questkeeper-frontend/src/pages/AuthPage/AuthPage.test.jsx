import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AuthPage from "./AuthPage";

vi.mock("../../utils/auth", () => ({
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null }),
}));

function Landed() {
  const location = useLocation();
  return <p data-testid="landed">{`${location.pathname} ${JSON.stringify(location.state)}`}</p>;
}

function renderLogin(state) {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="*" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function logIn() {
  await userEvent.type(screen.getByLabelText(/email/i), "me@example.com");
  await userEvent.type(screen.getByLabelText(/password/i), "secret-test-pass");
  await userEvent.click(screen.getByRole("button", { name: "Log In" }));
}

describe("AuthPage", () => {
  it("goes back where the player was headed, with what they were carrying (a quiz build)", async () => {
    renderLogin({ from: "/characters/new", fromState: { quizBuild: "iron-guardian", name: "Bram" } });
    await logIn();
    expect(screen.getByTestId("landed")).toHaveTextContent('/characters/new {"quizBuild":"iron-guardian","name":"Bram"}');
  });

  it("never follows a link off QuestKeeper", async () => {
    renderLogin({ from: "//evil.example", fromState: { anything: true } });
    await logIn();
    expect(screen.getByTestId("landed")).toHaveTextContent("/characters null");
  });
});
