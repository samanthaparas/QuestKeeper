import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import ScrollManager from "./ScrollManager";

function BackButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Back</button>;
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <ScrollManager />
      <BackButton />
      <Routes>
        <Route path="/" element={<Link to="/guide">Learn the basics</Link>} />
        <Route path="/guide" element={<Link to="/guide?section=tables">Tables section</Link>} />
      </Routes>
    </MemoryRouter>,
  );
}

function scrollTo(y) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  window.dispatchEvent(new Event("scroll"));
}

describe("ScrollManager", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn((x, y) => Object.defineProperty(window, "scrollY", { value: y, configurable: true }));
  });
  afterEach(() => {
    delete window.scrollTo;
  });

  it("opens a new page at the top, wherever the last one was scrolled to", async () => {
    renderApp();
    act(() => scrollTo(870));

    await userEvent.click(screen.getByRole("link", { name: "Learn the basics" }));
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
  });

  it("returns to where you were when you go Back", async () => {
    renderApp();
    act(() => scrollTo(870));
    await userEvent.click(screen.getByRole("link", { name: "Learn the basics" }));

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 870);
  });

  it("leaves changes within the same page to that page", async () => {
    renderApp();
    await userEvent.click(screen.getByRole("link", { name: "Learn the basics" }));
    window.scrollTo.mockClear();

    await userEvent.click(screen.getByRole("link", { name: "Tables section" }));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
