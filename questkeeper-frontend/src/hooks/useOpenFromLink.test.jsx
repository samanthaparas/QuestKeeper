import { describe, it, expect, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useBrowseSelection } from "./useOpenFromLink";

const ITEMS = [
  { index: "elf", name: "Elf" },
  { index: "dwarf", name: "Dwarf" },
  { index: "acolyte", name: "Acolyte", edition: "2014" },
  { index: "acolyte", name: "Acolyte (2024)", edition: "2024" },
];

// A tiny browse page: a filter, cards, and the open entry's heading.
function Page({ items = ITEMS, ready = true }) {
  const [onlyElves, setOnlyElves] = useState(false);
  const visible = onlyElves ? items.filter((item) => item.index === "elf") : items;
  const selection = useBrowseSelection({ items, visibleItems: visible, ready });
  const location = useLocation();
  const { search } = location;
  const navigate = useNavigate();
  // Like Magic Items, whose filters live in the address next to the open entry.
  function addressFilter() {
    const next = new URLSearchParams(search);
    next.set("rarity", "Rare");
    navigate({ search: `?${next}` }, { replace: true, state: location.state });
  }
  return (
    <main>
      <p data-testid="search">{search}</p>
      <label>
        <input type="checkbox" checked={onlyElves} onChange={(event) => setOnlyElves(event.target.checked)} />
        Only elves
      </label>
      {visible.map((item) => (
        <button key={`${item.index}${item.edition ?? ""}`} id={selection.cardId(item)} onClick={() => selection.open(item)}>
          {item.name}
        </button>
      ))}
      {selection.selected && (
        <section>
          <h2 id={selection.headingId} tabIndex={-1}>
            {selection.selected.name}
          </h2>
          <button onClick={selection.close}>Back to results</button>
        </section>
      )}
      {selection.isMissing && <p>Not found</p>}
      {selection.isOutsideFilters && <p>Outside the filters</p>}
      <button onClick={addressFilter}>Rare only</button>
      <button onClick={() => navigate(-1)}>Browser back</button>
      <button onClick={() => navigate(1)}>Browser forward</button>
    </main>
  );
}

function renderAt(path, props) {
  return render(
    <MemoryRouter initialEntries={["/home", path]} initialIndex={1}>
      <Routes>
        <Route path="/home" element={<p>Home page</p>} />
        <Route path="/races" element={<Page {...props} />} />
      </Routes>
    </MemoryRouter>,
  );
}

const heading = () => screen.queryByRole("heading", { level: 2 });

describe("useBrowseSelection", () => {
  beforeEach(() => {
    document.title = "";
  });

  it("opens a linked entry and keeps it in the address, so a reload shows it again", () => {
    renderAt("/races?open=dwarf&sort=name");
    expect(heading()).toHaveTextContent("Dwarf");
    expect(screen.getByTestId("search")).toHaveTextContent("?open=dwarf&sort=name");
    expect(document.title).toBe("Dwarf · Races · QuestKeeper");
  });

  it("waits for the list, and says when a link's entry isn't in it", () => {
    const { rerender } = renderAt("/races?open=gnome", { ready: false });
    expect(screen.queryByText("Not found")).toBeNull();
    rerender(
      <MemoryRouter initialEntries={["/races?open=gnome"]}>
        <Routes>
          <Route path="/races" element={<Page />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("tells editions apart: 2014 and 2024 entries can share an id", () => {
    renderAt("/races?open=acolyte&edition=2024");
    expect(heading()).toHaveTextContent("Acolyte (2024)");
  });

  it("moves focus to the details on open, and back to the card on Back to results", async () => {
    const user = userEvent.setup();
    renderAt("/races");
    await user.click(screen.getByRole("button", { name: "Elf" }));
    expect(heading()).toHaveFocus();
    expect(screen.getByTestId("search")).toHaveTextContent("?open=elf");

    await user.click(screen.getByRole("button", { name: "Back to results" }));
    expect(heading()).toBeNull();
    expect(screen.getByTestId("search")).toBeEmptyDOMElement();
    expect(screen.getByRole("button", { name: "Elf" })).toHaveFocus();
    expect(document.title).toBe("Races · QuestKeeper");
  });

  it("works with the browser's Back and Forward", async () => {
    const user = userEvent.setup();
    renderAt("/races");
    await user.click(screen.getByRole("button", { name: "Dwarf" }));
    expect(heading()).toHaveTextContent("Dwarf");

    await user.click(screen.getByRole("button", { name: "Browser back" }));
    expect(heading()).toBeNull();
    expect(screen.getByRole("button", { name: "Dwarf" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Browser forward" }));
    expect(heading()).toHaveTextContent("Dwarf");
  });

  it("doesn't pile up history while moving between entries", async () => {
    const user = userEvent.setup();
    renderAt("/races");
    await user.click(screen.getByRole("button", { name: "Elf" }));
    await user.click(screen.getByRole("button", { name: "Dwarf" }));
    await user.click(screen.getByRole("button", { name: "Browser back" }));
    // One Back returns to the list, not to Elf.
    expect(heading()).toBeNull();
    expect(screen.getByRole("button", { name: "Elf" })).toBeInTheDocument();
  });

  it("from a direct link (no list before it), Back to results stays on the page", async () => {
    const user = userEvent.setup();
    renderAt("/races?open=elf");
    await user.click(screen.getByRole("button", { name: "Back to results" }));
    expect(screen.queryByText("Home page")).toBeNull();
    expect(heading()).toBeNull();
    expect(screen.getByRole("button", { name: "Elf" })).toBeInTheDocument();
  });

  it("leaves no duplicate list step when a filter closes the entry: Back leaves the page", async () => {
    const user = userEvent.setup();
    renderAt("/races");
    await user.click(screen.getByRole("button", { name: "Dwarf" }));
    await user.click(screen.getByRole("checkbox", { name: "Only elves" }));
    await act(async () => {});
    expect(heading()).toBeNull();
    // The filter (kept in the page) still applies after the step back.
    expect(screen.getByRole("checkbox", { name: "Only elves" })).toBeChecked();
    expect(screen.queryByRole("button", { name: "Dwarf" })).toBeNull();

    // One Back: off the list to the page before it, not to a second copy.
    await user.click(screen.getByRole("button", { name: "Browser back" }));
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("Forward to an entry the filters now hide keeps it open, labelled as outside them", async () => {
    const user = userEvent.setup();
    renderAt("/races");
    await user.click(screen.getByRole("button", { name: "Dwarf" }));
    await user.click(screen.getByRole("checkbox", { name: "Only elves" }));
    await act(async () => {});
    await user.click(screen.getByRole("button", { name: "Browser forward" }));
    expect(heading()).toHaveTextContent("Dwarf");
    expect(screen.getByText("Outside the filters")).toBeInTheDocument();
    // Back to results returns to the filtered list.
    await user.click(screen.getByRole("button", { name: "Back to results" }));
    expect(heading()).toBeNull();
    expect(screen.queryByText("Outside the filters")).toBeNull();
  });

  it("from a direct link, a filter closing the entry replaces it (Back still leaves the page)", async () => {
    const user = userEvent.setup();
    renderAt("/races?open=dwarf");
    await user.click(screen.getByRole("checkbox", { name: "Only elves" }));
    await act(async () => {});
    expect(heading()).toBeNull();
    expect(screen.getByTestId("search")).toBeEmptyDOMElement();
    await user.click(screen.getByRole("button", { name: "Browser back" }));
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });

  it("closes an entry the filters hide, without taking focus from the filter", async () => {
    const user = userEvent.setup();
    renderAt("/races");
    await user.click(screen.getByRole("button", { name: "Dwarf" }));
    const filter = screen.getByRole("checkbox", { name: "Only elves" });
    await user.click(filter);
    await act(async () => {});
    expect(heading()).toBeNull();
    expect(screen.getByTestId("search")).toBeEmptyDOMElement();
    expect(filter).toHaveFocus();
  });

  it("keeps filters changed in the address while an entry was open", async () => {
    const user = userEvent.setup();
    renderAt("/races");
    await user.click(screen.getByRole("button", { name: "Elf" }));
    await user.click(screen.getByRole("button", { name: "Rare only" }));
    expect(screen.getByTestId("search")).toHaveTextContent("?open=elf&rarity=Rare");
    await user.click(screen.getByRole("button", { name: "Back to results" }));
    // Not a step back (that would undo the filter): the same list, filter kept.
    expect(screen.getByTestId("search")).toHaveTextContent("?rarity=Rare");
    expect(heading()).toBeNull();
  });
});
