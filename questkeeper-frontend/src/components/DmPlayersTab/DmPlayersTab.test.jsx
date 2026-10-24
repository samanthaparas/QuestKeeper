import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DmPlayersTab from "./DmPlayersTab";

vi.mock("../../utils/api", () => ({ getSpells: vi.fn(), getSpellDetails: vi.fn() }));

const sheet = (id, name, cls, cur, max, extra = {}) => ({
  id,
  name,
  level: 4,
  race: { name: "Human" },
  class: { name: cls },
  abilityScores: {},
  combat: { hitPoints: { current: cur, max, temporary: 0 }, armorClass: 14 },
  ...extra,
});

const SHEETS = [sheet("a", "Dangit", "Rogue", 22, 24), sheet("b", "Branwen", "Cleric", 11, 28), sheet("c", "Lira", "Wizard", 0, 26)];

function setup(props = {}) {
  const onSelect = vi.fn();
  const view = render(<DmPlayersTab characters={SHEETS} selectedId="" onSelect={onSelect} {...props} />);
  return { onSelect, picker: screen.getByRole("list", { name: "Players" }), ...view };
}

describe("DmPlayersTab", () => {
  it("lists every player with level, class, HP and AC, and opens the first one", () => {
    const { picker } = setup();
    expect(screen.getByRole("heading", { name: "Your players · 3" })).toBeInTheDocument();
    const dangit = within(picker).getByRole("button", { name: /^Dangit/ });
    expect(dangit).toHaveAttribute("aria-pressed", "true");
    expect(dangit).toHaveTextContent("Level 4 Rogue");
    expect(dangit).toHaveTextContent("22/24 HP");
    expect(within(dangit).getByRole("img", { name: "Armor class 14" })).toBeInTheDocument();
    expect(within(picker).getByRole("button", { name: /^Branwen/ })).toHaveTextContent("11/28 HP");
    expect(screen.getByRole("region", { name: "Character overview" })).toHaveTextContent("Level 4 · Human · Rogue");
  });

  it("asks the page to switch players and to show everyone", async () => {
    const { onSelect, picker } = setup({ selectedId: "b" });
    expect(screen.getByRole("region", { name: "Character overview" })).toHaveTextContent("Level 4 · Human · Cleric");
    await userEvent.click(within(picker).getByRole("button", { name: /^Lira/ }));
    expect(onSelect).toHaveBeenLastCalledWith("c");
    await userEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(onSelect).toHaveBeenLastCalledWith("all");
  });

  it("shows every character in the overview with Show all, and none of the buttons is marked as picked", () => {
    const { picker } = setup({ selectedId: "all" });
    const overview = screen.getByRole("region", { name: "Character overview" });
    expect(within(overview).getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Show all" })).toHaveAttribute("aria-pressed", "true");
    expect(within(picker).getByRole("button", { name: /^Dangit/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("has no Show all for a single player", () => {
    render(<DmPlayersTab characters={[SHEETS[0]]} selectedId="" onSelect={() => {}} />);
    expect(screen.queryByRole("button", { name: "Show all" })).not.toBeInTheDocument();
  });

  it("flags a character who uses content the table doesn't allow, on the list and the overview", async () => {
    const { picker } = setup({
      bannedFor: (character) => (character.id === "c" ? [{ kind: "class", label: "class", name: "Wizard" }] : []),
      selectedId: "c",
    });
    expect(within(picker).getByRole("button", { name: /^Lira/ })).toHaveTextContent("Uses options not allowed here");
    expect(within(picker).getByRole("button", { name: /^Dangit/ })).not.toHaveTextContent("not allowed");
    // In the overview the warning sits in the Attacks and spells header, opened with a button.
    const toggle = screen.getByRole("button", { name: /Table content: review flagged choices/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(screen.getByRole("note")).toHaveTextContent("Wizard (class)");
  });

  it("leaves every sheet read-only", () => {
    setup();
    // Nothing here can change a character: no inputs or editing controls in the overview.
    const overview = screen.getByRole("region", { name: "Character overview" });
    expect(within(overview).queryAllByRole("textbox")).toHaveLength(0);
    expect(within(overview).queryByRole("button", { name: /edit|save|heal|damage/i })).not.toBeInTheDocument();
    expect(within(overview).getByText(/Read-only/)).toBeInTheDocument();
  });

  it("folds the list on narrow screens: Choose opens it, picking closes it and keeps focus on the button", async () => {
    const { onSelect, picker } = setup();
    const toggle = screen.getByRole("button", { name: /Dangit\s*Choose a player/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(within(picker).getByRole("button", { name: /^Branwen/ }));
    expect(onSelect).toHaveBeenCalledWith("b");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("explains an empty table, and shows what the page puts underneath", () => {
    render(
      <DmPlayersTab characters={[]} selectedId="" onSelect={() => {}}>
        <p>Removed for good</p>
      </DmPlayersTab>,
    );
    expect(screen.getByText(/Characters appear here when players join/)).toBeInTheDocument();
    expect(screen.getByText("Removed for good")).toBeInTheDocument();
  });

  it("keeps the party-sharing switch under the list", () => {
    setup({ shareControl: <label><input type="checkbox" /> Let players see the party</label>, partyShared: true });
    expect(screen.getByText("Players can see party stats")).toBeInTheDocument();
    expect(screen.getByLabelText("Let players see the party")).toBeInTheDocument();
  });

  it("gives the overview one keyboard-reachable scroll area, and the list one", () => {
    setup();
    const overview = screen.getByRole("region", { name: "Dangit, overview" });
    expect(overview).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("group", { name: "Player list" })).toHaveAttribute("tabindex", "0");
    // Nothing inside the overview is a scroll box of its own.
    expect(overview.querySelector(".character-summary__panel-scroll")).toBeNull();
    expect(overview.querySelector("[tabindex]")).toBeNull();
  });

  it("with Show all, the overview header reads All players with the read-only notice beside it, above every overview", () => {
    setup({ selectedId: "all" });
    const panel = screen.getByRole("region", { name: "Character overview" });
    const header = within(panel).getByRole("heading", { name: "All players" }).closest("header");
    expect(header).toHaveTextContent("Read-only · Players manage their own sheets");
    const firstCard = within(panel).getAllByRole("article")[0];
    // The header is its own row: it comes before the scrolling content, not inside it.
    expect(header.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(panel).getByRole("region", { name: "All players, overviews" })).toContainElement(firstCard);
    expect(header.closest(".dm-players__sheet")).toBeNull();
  });
});
