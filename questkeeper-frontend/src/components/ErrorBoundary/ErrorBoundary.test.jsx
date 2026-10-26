import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "./ErrorBoundary";
import { installFakeStorage } from "../../test/fakeStorage";

function Boom() {
  throw new Error("secret stack detail: db password hunter2");
}

describe("ErrorBoundary", () => {
  const originalLocation = window.location;
  let reload;

  beforeEach(() => {
    installFakeStorage();
    // React logs the error it catches; keep the test output quiet.
    vi.spyOn(console, "error").mockImplementation(() => {});
    reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload, hash: "#/characters" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
  });

  it("shows its children untouched when nothing goes wrong", () => {
    render(
      <ErrorBoundary>
        <p>All fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("All fine")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).toBeNull();
  });

  it("shows a calm card instead of a blank screen when a page throws, with no technical detail", () => {
    const { container } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByText("We couldn't show this page. Try reloading.")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("hunter2");
    expect(document.body).not.toHaveTextContent("stack");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("reloads on Reload page, and sends Go home to the front page then reloads, without touching saved data", async () => {
    localStorage.setItem("qk-keep-me", "yes");
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reload page" }));
    expect(reload).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Go home" }));
    expect(window.location.hash).toBe("#/");
    expect(reload).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("qk-keep-me")).toBe("yes");
    localStorage.removeItem("qk-keep-me");
  });
});
