import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LootHelper from "./LootHelper";
import { getMagicItemCatalog } from "../../utils/api";

vi.mock("../../utils/api", () => ({ getMagicItemCatalog: vi.fn() }));

const CATALOG = [
  {
    index: "cloak",
    name: "Cloak of Protection",
    source: "SRD 5.1",
    type: "Wondrous Item",
    rarities: ["Uncommon"],
    attunement: true,
    consumable: false,
  },
  {
    index: "potion",
    name: "Potion of Healing",
    source: "SRD 5.1",
    type: "Potion",
    rarities: ["Common", "Uncommon"],
    attunement: false,
    consumable: true,
  },
];

async function open() {
  await userEvent.click(screen.getByText("Loot ideas"));
  await waitFor(() => expect(getMagicItemCatalog).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByRole("button", { name: "Roll an item" })).toBeEnabled());
}

describe("LootHelper", () => {
  beforeEach(() => {
    getMagicItemCatalog.mockReset().mockResolvedValue(CATALOG);
  });

  it("loads the item list only when opened, and starts the party level from the table", async () => {
    render(<LootHelper levels={[3, 3, 4, 4]} />);
    expect(getMagicItemCatalog).not.toHaveBeenCalled();
    await open();
    expect(screen.getByLabelText("Party level")).toHaveValue(4);
  });

  it("rolls coins right away, and again on request", async () => {
    render(<LootHelper levels={[3]} />);
    await userEvent.click(screen.getByText("Loot ideas"));

    await userEvent.click(screen.getByRole("button", { name: "Roll coins" }));
    const coins = screen.getByRole("region", { name: "Coins" });
    expect(coins).toHaveTextContent(/\d+ gp/);
    expect(screen.getByRole("button", { name: "Roll again" })).toBeInTheDocument();
  });

  it("rolls a magic item with its rarity, and can be limited to one-use items", async () => {
    render(<LootHelper levels={[3]} />);
    await open();

    await userEvent.click(screen.getByLabelText(/Potions, scrolls and other one-use items only/));
    await userEvent.click(screen.getByRole("button", { name: "Roll an item" }));
    const item = screen.getByRole("region", { name: "A magic item" });
    expect(item).toHaveTextContent("Potion of Healing");
    expect(item).toHaveTextContent("SRD 5.1");
    expect(screen.getByRole("link", { name: "Look it up" })).toHaveAttribute("href", "#/magic-items");
  });

  it("rolls a small hoard with coins and a valuable", async () => {
    render(<LootHelper levels={[8]} />);
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Roll a hoard" }));
    const hoard = screen.getByRole("region", { name: "A small hoard" });
    expect(hoard).toHaveTextContent(/Coins: \d+ gp/);
    expect(hoard).toHaveTextContent(/\(\d+ gp\)/);
  });

  it("says so when the item list can't load, but still rolls coins", async () => {
    getMagicItemCatalog.mockRejectedValue(new Error("offline"));
    render(<LootHelper levels={[3]} />);
    await userEvent.click(screen.getByText("Loot ideas"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the magic item list");
    expect(screen.getByRole("button", { name: "Roll coins" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Roll an item" })).toBeDisabled();
  });

  it("copies a result", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<LootHelper levels={[3]} />);
    await userEvent.click(screen.getByText("Loot ideas"));
    await userEvent.click(screen.getByRole("button", { name: "Roll coins" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/gp/));
    expect(await screen.findByText("Copied.")).toBeInTheDocument();
  });
});
