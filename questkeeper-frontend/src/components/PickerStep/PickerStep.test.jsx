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

  it("puts read-only book entries last and says they can't be picked yet", async () => {
    const artificer = { index: "book_artificer", name: "Artificer", is_book_entry: true };
    renderPicker({
      category: "Class",
      fetchList: () => Promise.resolve([artificer, { index: "wizard", name: "Wizard" }]),
      initialSelectedRaw: artificer,
      mapToDetailPanelResult: (data) => ({ name: data.name, category: "Class" }),
    });

    await screen.findByRole("heading", { name: "Wizard" });
    const cards = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(cards).toEqual(["Wizard", "Artificer"]);
    expect(screen.getByText("Read only: can't be picked yet")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Can't be picked yet.");
    expect(screen.queryByRole("button", { name: /Choose Artificer|Make it as homebrew/ })).toBeNull();
  });

  describe("book options", () => {
    const list = [
      { index: "elf", name: "Elf" },
      { index: "book_tabaxi", name: "Tabaxi", source: "Monsters of the Multiverse", sourceGroup: "Official books" },
    ];
    const bookDetails = {
      index: "book_tabaxi",
      name: "Tabaxi",
      is_book_entry: true,
      book: "Monsters of the Multiverse",
      link_url: "https://dnd5e.wikidot.com/lineage:tabaxi",
    };
    const bookPanel = (data) =>
      data.is_book_entry
        ? { name: data.name, category: "Race", bookEntry: { name: data.name, book: data.book, summary: "Curious.", linkUrl: data.link_url } }
        : data;

    it("splits the list into Ready to pick and From the books, with a chip on each card", async () => {
      renderPicker({ fetchList: () => Promise.resolve(list), onMakeHomebrewFrom: vi.fn() });

      expect(await screen.findByRole("heading", { name: "Ready to pick" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "From the books" })).toBeInTheDocument();
      expect(screen.getByText("Ready to pick", { selector: ".result-card__chip" })).toBeInTheDocument();
      expect(screen.getByText("Make it yours", { selector: ".result-card__chip" })).toBeInTheDocument();
    });

    it("keeps one plain list (no headings or chips) when nothing is a book option", async () => {
      renderPicker({ onMakeHomebrewFrom: vi.fn() });
      await screen.findByRole("heading", { name: "Elf" });
      expect(screen.queryByRole("heading", { name: "From the books" })).toBeNull();
      expect(document.querySelector(".result-card__chip")).toBeNull();
    });

    it("'Pick it now, add details later' saves a draft and chooses it", async () => {
      const onDraftFrom = vi.fn().mockResolvedValue({ id: "d1" });
      const fetchDetails = vi.fn().mockResolvedValue({ index: "hb_d1", name: "Tabaxi" });
      const onChoose = vi.fn();
      renderPicker({
        fetchList: () => Promise.resolve(list),
        fetchDetails,
        mapToDetailPanelResult: bookPanel,
        initialSelectedRaw: bookDetails,
        onMakeHomebrewFrom: vi.fn(),
        onDraftFrom,
        onChoose,
      });

      await userEvent.click(await screen.findByRole("button", { name: "Pick it now, add details later" }));

      expect(onDraftFrom).toHaveBeenCalledWith(bookDetails);
      expect(fetchDetails).toHaveBeenCalledWith("hb_d1");
      expect(onChoose).toHaveBeenCalledWith({ index: "hb_d1", name: "Tabaxi" }, { index: "hb_d1", name: "Tabaxi" });
    });

    it("says so if the draft couldn't be saved, and chooses nothing", async () => {
      const onChoose = vi.fn();
      renderPicker({
        fetchList: () => Promise.resolve(list),
        mapToDetailPanelResult: bookPanel,
        initialSelectedRaw: bookDetails,
        onMakeHomebrewFrom: vi.fn(),
        onDraftFrom: vi.fn().mockRejectedValue(new Error("offline")),
        onChoose,
      });

      await userEvent.click(await screen.findByRole("button", { name: "Pick it now, add details later" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't save that as a draft/);
      expect(onChoose).not.toHaveBeenCalled();
      // The list is still there to pick from.
      expect(screen.getByRole("heading", { name: "Elf" })).toBeInTheDocument();
    });
  });
});
