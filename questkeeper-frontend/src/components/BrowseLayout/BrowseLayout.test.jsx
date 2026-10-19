import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import BrowseLayout from "./BrowseLayout";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

const noSelection = { selected: null, isMissing: false };

function layout(props = {}) {
  return (
    <main>
      <h1>Explore Races</h1>
      <BrowseLayout
        noun="race"
        isLoading={false}
        total={56}
        shownCount={56}
        isFiltered={false}
        emptyText="No races match."
        selection={noSelection}
        {...props}
      >
        <button type="button">Elf</button>
      </BrowseLayout>
    </main>
  );
}

const renderLayout = (props) => render(layout(props));

const announcer = () => document.querySelector(".browse-layout__announcer");

// Automated checks only catch some problems (and jsdom can't measure colour
// contrast); keyboard and screen-reader checks are done by hand as well.
async function axeViolations(container) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`);
}

describe("BrowseLayout", () => {
  afterEach(() => vi.useRealTimers());

  it("shows the count without announcing it when the page first loads", () => {
    renderLayout();
    expect(screen.getByText("56 races")).toBeInTheDocument();
    expect(announcer()).toBeEmptyDOMElement();
  });

  it("announces a new count once, after the player pauses, not on every keystroke", () => {
    vi.useFakeTimers();
    const { rerender } = renderLayout();
    for (const shown of [40, 12, 3]) {
      rerender(layout({ shownCount: shown, isFiltered: true }));
      act(() => vi.advanceTimersByTime(200));
    }
    expect(announcer()).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(700));
    expect(announcer()).toHaveTextContent("3 of 56 races match.");
  });

  it("says when nothing matches", () => {
    vi.useFakeTimers();
    const { rerender } = renderLayout();
    rerender(layout({ shownCount: 0, isFiltered: true }));
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText("No races match.", { selector: ".search-page__empty" })).toBeInTheDocument();
    expect(announcer()).toHaveTextContent("No races match.");
  });

  it("reports a failed load with a way to try again", async () => {
    const onRetry = vi.fn();
    renderLayout({ loadError: true, onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load the races.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows the open entry with a way back, and a details error with a retry", async () => {
    const close = vi.fn();
    const retryDetail = vi.fn();
    renderLayout({
      selection: {
        selected: { name: "Elf", category: "Race" },
        detail: null,
        detailError: true,
        isDetailLoading: false,
        retryDetail,
        close,
        headingId: "browse-detail-heading",
      },
    });
    expect(screen.getByRole("heading", { level: 2, name: "Elf" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load more about Elf.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retryDetail).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "← Back to results" }));
    expect(close).toHaveBeenCalled();
  });

  it("has no automatically detectable accessibility problems, open or closed", async () => {
    const closed = renderLayout();
    expect(await axeViolations(closed.container)).toEqual([]);
    closed.unmount();

    const open = renderLayout({
      selection: {
        selected: { name: "Elf", category: "Race", description: "Graceful and long-lived." },
        detail: null,
        detailError: false,
        isDetailLoading: true,
        close: () => {},
        headingId: "browse-detail-heading",
      },
    });
    expect(await axeViolations(open.container)).toEqual([]);
  });

  it("after a pressed Try again, focus goes to the count with nothing announced on top", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = renderLayout({ loadError: true, onRetry });
    await user.click(screen.getByRole("button", { name: "Try again" }));
    rerender(layout({ isLoading: true, loadError: false, onRetry }));
    rerender(layout({ isLoading: false, loadError: false, onRetry }));
    expect(screen.getByText("56 races")).toHaveFocus();
    expect(announcer()).toBeEmptyDOMElement();
  });

  it("keeps focus on Try again when it fails again", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = renderLayout({ loadError: true, onRetry });
    await user.click(screen.getByRole("button", { name: "Try again" }));
    rerender(layout({ isLoading: true, loadError: false, onRetry }));
    rerender(layout({ isLoading: false, loadError: true, onRetry }));
    expect(screen.getByRole("button", { name: "Try again" })).toHaveFocus();
  });

  it("never moves focus for a load the player didn't ask for", () => {
    const { rerender } = renderLayout({ isLoading: true });
    const outside = document.createElement("input");
    document.body.appendChild(outside);
    outside.focus();
    rerender(layout({ isLoading: false }));
    expect(outside).toHaveFocus();
    outside.remove();
  });

  it("labels an open entry that's outside the current filters", () => {
    renderLayout({
      selection: {
        selected: { name: "Dwarf", category: "Race" },
        detail: { name: "Dwarf", category: "Race", description: "Stout." },
        isOutsideFilters: true,
        close: () => {},
        headingId: "browse-detail-heading",
      },
    });
    expect(screen.getByText("Dwarf isn't in the list with your current search or filters.")).toBeInTheDocument();
    // Tied to the entry's details region, not just placed near it.
    expect(screen.getByRole("region", { name: "Dwarf" })).toHaveAccessibleDescription(
      "Dwarf isn't in the list with your current search or filters.",
    );
  });

  it("doesn't describe the details that way when the entry is in the list", () => {
    renderLayout({
      selection: {
        selected: { name: "Dwarf", category: "Race" },
        detail: { name: "Dwarf", category: "Race", description: "Stout." },
        isOutsideFilters: false,
        close: () => {},
        headingId: "browse-detail-heading",
      },
    });
    expect(screen.getByRole("region", { name: "Dwarf" })).not.toHaveAttribute("aria-describedby");
  });
});
