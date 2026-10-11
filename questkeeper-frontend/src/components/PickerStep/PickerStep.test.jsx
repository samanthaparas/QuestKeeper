import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PickerStep from "./PickerStep";

function renderPicker(props = {}) {
  render(
    <MemoryRouter>
      <PickerStep
        title="Choose a Race"
        description="Pick one."
        category="Race"
        fetchList={() => Promise.resolve([{ index: "elf", name: "Elf" }])}
        fetchDetails={vi.fn()}
        mapToDetailPanelResult={(data) => data}
        mapToSnapshot={(data) => data}
        onChoose={vi.fn()}
        onBack={vi.fn()}
        backLabel="Back"
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("PickerStep", () => {
  it("offers 'Make your own' when given a handler", async () => {
    const onMakeOwn = vi.fn();
    renderPicker({ onMakeOwn, makeOwnLabel: "Make your own race" });
    await screen.findByRole("heading", { name: "Elf" });

    await userEvent.click(screen.getByRole("button", { name: "Make your own race" }));
    expect(onMakeOwn).toHaveBeenCalled();
  });

  it("leaves it out otherwise", async () => {
    renderPicker();
    await screen.findByRole("heading", { name: "Elf" });
    expect(screen.queryByText(/Can't find what you want/)).not.toBeInTheDocument();
  });

  it("starts with an entry selected when given one", async () => {
    renderPicker({ initialSelectedRaw: { index: "hb_r1", name: "Owlfolk", category: "Race" } });
    expect(await screen.findByRole("button", { name: "Choose Owlfolk" })).toBeInTheDocument();
  });

  it("offers 'Make it as homebrew' instead of Choose for a published-book entry", async () => {
    const book = {
      index: "book_folk-hero",
      name: "Folk Hero",
      is_book_entry: true,
      book: "Player's Handbook (2014)",
      link_url: "https://dnd5e.wikidot.com/background:folk-hero",
    };
    const onMakeHomebrewFrom = vi.fn();
    renderPicker({
      initialSelectedRaw: book,
      mapToDetailPanelResult: (data) => ({
        name: data.name,
        category: "Background",
        bookEntry: { name: data.name, book: data.book, summary: "Brave.", linkUrl: data.link_url },
      }),
      onMakeHomebrewFrom,
    });

    const makeIt = await screen.findByRole("button", { name: "Make it as homebrew" });
    expect(screen.queryByRole("button", { name: "Choose Folk Hero" })).not.toBeInTheDocument();
    // Inside the picker, the panel's own "go to My Homebrew" link is hidden.
    expect(screen.queryByRole("link", { name: "Make it as homebrew" })).not.toBeInTheDocument();
    await userEvent.click(makeIt);
    expect(onMakeHomebrewFrom).toHaveBeenCalledWith(book);
  });
});
