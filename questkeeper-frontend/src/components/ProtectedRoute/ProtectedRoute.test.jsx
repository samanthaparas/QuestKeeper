import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { readDestination } from "../../utils/continueAfterLogin";
import { installFakeStorage } from "../../test/fakeStorage";

const auth = vi.hoisted(() => ({ user: null, isLoading: true }));
vi.mock("../../context/useAuth", () => ({ useAuth: () => ({ user: auth.user, isLoading: auth.isLoading }) }));

function LoginSpot() {
  const location = useLocation();
  return <p data-testid="login">{`login ${JSON.stringify(location.state)}`}</p>;
}

function renderRoute(entry = "/characters?x=1") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<LoginSpot />} />
        <Route
          path="/characters"
          element={
            <ProtectedRoute>
              <p>Secret page</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  installFakeStorage();
  vi.useFakeTimers();
  auth.user = null;
  auth.isLoading = true;
});
afterEach(() => vi.useRealTimers());

describe("ProtectedRoute", () => {
  it("shows nothing at first, so a quick check never flashes a note", () => {
    renderRoute();
    expect(screen.queryByText("Checking your sign-in…")).toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText("Checking your sign-in…")).toBeNull();
  });

  it("says it's checking once the wait passes about 250ms, then shows the page when signed in", () => {
    const { rerender } = renderRoute();
    act(() => vi.advanceTimersByTime(260));
    expect(screen.getByRole("status")).toHaveTextContent("Checking your sign-in…");

    auth.isLoading = false;
    auth.user = { id: "u1" };
    rerender(
      <MemoryRouter initialEntries={["/characters?x=1"]}>
        <Routes>
          <Route path="/characters" element={<ProtectedRoute><p>Secret page</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText("Checking your sign-in…")).toBeNull();
    expect(screen.getByText("Secret page")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to log in, remembering where they were headed", () => {
    auth.isLoading = false;
    renderRoute("/characters?x=1");
    expect(screen.getByTestId("login")).toHaveTextContent('"from":"/characters?x=1"');
    expect(readDestination()).toMatchObject({ from: "/characters?x=1" });
    expect(screen.queryByText("Secret page")).toBeNull();
  });

  it("never reveals the page while the check is still running", () => {
    renderRoute();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText("Secret page")).toBeNull();
    expect(screen.queryByTestId("login")).toBeNull();
  });
});
