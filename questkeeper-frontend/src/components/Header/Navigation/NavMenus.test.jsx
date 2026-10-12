import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NavMenus from "./NavMenus";

function renderMenus(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavMenus />
      <p>Somewhere else</p>
    </MemoryRouter>,
  );
}

const explore = () => screen.getByRole("button", { name: "Explore" });
const book = () => document.querySelector(".nav-book");

afterEach(() => {
  vi.useRealTimers();
});

describe("NavMenus", () => {
  it("opens and closes a menu on click", () => {
    renderMenus();
    expect(book()).toBeNull();

    fireEvent.click(explore());
    expect(explore()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Ancestries and their traits")).toBeInTheDocument();

    fireEvent.click(explore());
    expect(book()).toBeNull();
  });

  it("tags Monster Library for DMs", () => {
    renderMenus();
    fireEvent.click(screen.getByRole("button", { name: "My Adventures" }));

    expect(screen.getByRole("link", { name: /Monster Library/ })).toHaveTextContent("For DMs");
  });

  it("highlights the menu and page you're on", () => {
    renderMenus("/tables/abc");
    const adventures = screen.getByRole("button", { name: "My Adventures" });
    expect(adventures).toHaveClass("nav-menus__trigger--active");

    fireEvent.click(adventures);
    expect(screen.getByRole("link", { name: /Tables/ })).toHaveClass("active");
  });

  it("closes after picking a page, on Esc, and on a click elsewhere", () => {
    renderMenus();

    fireEvent.click(explore());
    fireEvent.click(screen.getByRole("link", { name: /Spells/ }));
    expect(book()).toBeNull();

    fireEvent.click(explore());
    fireEvent.keyDown(screen.getByRole("link", { name: /Races/ }), { key: "Escape" });
    expect(book()).toBeNull();
    expect(explore()).toHaveFocus();

    fireEvent.click(explore());
    fireEvent.pointerDown(screen.getByText("Somewhere else"));
    expect(book()).toBeNull();
  });

  it("moves through the menus and pages with the keyboard", () => {
    renderMenus();
    explore().focus();

    fireEvent.keyDown(explore(), { key: "ArrowDown" });
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveFocus();

    fireEvent.keyDown(links[0], { key: "ArrowDown" });
    expect(links[1]).toHaveFocus();
    fireEvent.keyDown(links[1], { key: "End" });
    expect(links.at(-1)).toHaveFocus();
    fireEvent.keyDown(links.at(-1), { key: "ArrowDown" });
    expect(links[0]).toHaveFocus();

    // → on a menu name moves to the next menu, keeping a menu open.
    explore().focus();
    fireEvent.keyDown(explore(), { key: "ArrowRight" });
    const adventures = screen.getByRole("button", { name: "My Adventures" });
    expect(adventures).toHaveFocus();
    expect(adventures).toHaveAttribute("aria-expanded", "true");
  });

  it("opens when the mouse rests on a menu name", () => {
    vi.useFakeTimers();
    renderMenus();

    fireEvent.pointerEnter(explore(), { pointerType: "mouse" });
    expect(book()).toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(book()).not.toBeNull();

    // A click straight after hovering open keeps it open.
    fireEvent.click(explore());
    expect(book()).not.toBeNull();
  });
});
