import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSheetInventoryTab from "./CharacterSheetInventoryTab";
import { installFakeStorage } from "../../test/fakeStorage";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
// What the SRD item look-up says (a test can change it).
const lookup = vi.hoisted(() => ({
  value: { findMatches: () => [], loadDetails: () => {}, status: "ready", retry: () => {} },
}));
vi.mock("../../hooks/useSrdEquipmentLookup", () => ({
  useSrdEquipmentLookup: () => lookup.value,
}));

const EQUIPMENT = [
  { index: "i1", name: "Chain Mail", quantity: 1, proficient: true },
  { index: "i2", name: "Pouch", quantity: 1 },
  { index: "i3", name: "Helm of Teleportation", quantity: 1, attuned: true },
];

function renderTab(props = {}) {
  const handlers = {
    onEquipmentAdd: vi.fn(),
    onEquipmentUpdate: vi.fn(),
    onEquipmentRemove: vi.fn(),
    onEquipmentAttuneToggle: vi.fn(),
    onEquipmentProficientToggle: vi.fn(),
  };
  render(<CharacterSheetInventoryTab equipment={EQUIPMENT} {...handlers} {...props} />);
  return handlers;
}

describe("CharacterSheetInventoryTab", () => {
  it("groups items by category, guessed from the name, under small headings", () => {
    renderTab();

    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows[0]).toBe("Armor & shields");
    expect(rows[1]).toContain("Chain Mail");
    expect(rows[2]).toBe("Worn items");
    expect(rows[3]).toContain("Helm of Teleportation");
    expect(rows[4]).toBe("Gear & tools");
    expect(rows[5]).toContain("Pouch");
  });

  it("puts attuned items at the top when sorted in the order added", async () => {
    installFakeStorage();
    renderTab();
    await userEvent.selectOptions(screen.getByLabelText("Sort Inventory"), "added");

    const names = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(names[0]).toContain("Helm of Teleportation");
    expect(names[1]).toContain("Chain Mail");
    expect(names[2]).toContain("Pouch");
  });

  it("uses a picked category over the guess, and filters to one category", async () => {
    installFakeStorage();
    renderTab({
      equipment: [
        ...EQUIPMENT,
        { index: "i4", name: "Croissant", quantity: 2 },
        { index: "i5", name: "Potion of Healing", quantity: 3 },
        { index: "i6", name: "Silver locket", quantity: 1 },
        { index: "i7", name: "Lucky rock", quantity: 1, category: "treasure" },
      ],
    });
    await userEvent.selectOptions(screen.getByLabelText("Show Inventory"), "category:consumables");
    let rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows[0]).toBe("Consumables");
    expect(rows.slice(1).map((row) => row.split(" x")[0])).toEqual(["Croissant", "Potion of Healing"]);
    expect(screen.getByText("2 of 7")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Show Inventory"), "category:treasure");
    rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toEqual(["Treasure & keepsakes", expect.stringContaining("Lucky rock"), expect.stringContaining("Silver locket")]);
  });

  it("pins starred favourites to the top, whatever the sort, and stars on tap", async () => {
    installFakeStorage();
    const onEquipmentFavoriteToggle = vi.fn();
    renderTab({
      onEquipmentFavoriteToggle,
      equipment: [...EQUIPMENT.slice(0, 2), { ...EQUIPMENT[2] }, { index: "i4", name: "Rope", quantity: 1, favorite: true }],
    });

    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows[0]).toBe("♥ Favourites");
    expect(rows[1]).toContain("Rope");
    expect(rows[2]).toBe("Armor & shields");
    expect(screen.getByRole("button", { name: "Favourite Rope" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Favourite Pouch" }));
    expect(onEquipmentFavoriteToggle).toHaveBeenCalledWith(expect.objectContaining({ index: "i2" }));
  });

  it("can show only the favourites", async () => {
    installFakeStorage();
    renderTab({
      onEquipmentFavoriteToggle: vi.fn(),
      equipment: [...EQUIPMENT, { index: "i4", name: "Rope", quantity: 1, favorite: true }],
    });
    await userEvent.selectOptions(screen.getByLabelText("Show Inventory"), "favorites");
    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toEqual(["Gear & tools", expect.stringContaining("Rope")]);
  });

  it("splits some of a stack into a row of its own, from Manage", async () => {
    const onEquipmentSplit = vi.fn();
    renderTab({ onEquipmentSplit, equipment: [{ index: "a1", name: "Arrows", quantity: 10 }, EQUIPMENT[1]] });

    // No Split link under the name any more; only stacks of 2 or more offer it.
    expect(screen.queryByRole("button", { name: /Split stack/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Manage Pouch" }));
    expect(screen.queryByRole("button", { name: /Split stack/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Manage Arrows" }));
    await userEvent.click(screen.getByRole("button", { name: "Split stack of Arrows" }));
    const box = screen.getByLabelText("How many Arrows to split off");
    expect(box).toHaveValue(5);
    await waitFor(() => expect(box).toHaveFocus());
    await userEvent.clear(box);
    await userEvent.type(box, "3");
    await userEvent.click(screen.getByRole("button", { name: "Split" }));
    expect(onEquipmentSplit).toHaveBeenCalledTimes(1);
    expect(onEquipmentSplit).toHaveBeenCalledWith(expect.objectContaining({ index: "a1" }), 3);
    // Done: the form goes and Manage stays open.
    expect(screen.queryByLabelText("How many Arrows to split off")).toBeNull();
    expect(screen.getByRole("button", { name: "Manage Arrows" })).toHaveAttribute("aria-expanded", "true");
  });

  it("gives some of an item to another player at the table, from Manage", async () => {
    const onGiveItem = vi.fn().mockResolvedValue();
    renderTab({
      onGiveItem,
      giftReceivers: [{ userId: "u-bo", name: "Bo" }, { userId: "u-cy", name: "Cy" }],
      equipment: [{ index: "a1", name: "Arrows", quantity: 10 }],
    });

    await userEvent.click(screen.getByRole("button", { name: "Manage Arrows" }));
    await userEvent.click(screen.getByRole("button", { name: "Give Arrows…" }));
    await userEvent.selectOptions(screen.getByLabelText("Who to give Arrows to"), "u-cy");
    await userEvent.clear(screen.getByLabelText("How many Arrows to give"));
    await userEvent.type(screen.getByLabelText("How many Arrows to give"), "3");
    expect(onGiveItem).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Give" }));
    expect(onGiveItem).toHaveBeenCalledTimes(1);
    expect(onGiveItem).toHaveBeenCalledWith(expect.objectContaining({ index: "a1" }), "u-cy", 3);
  });

  it("keeps a failed gift's error in the form, and Cancel sends nothing", async () => {
    const onGiveItem = vi.fn().mockRejectedValue(new Error("Bo isn't at this table any more."));
    renderTab({ onGiveItem, giftReceivers: [{ userId: "u-bo", name: "Bo" }], equipment: [{ index: "r", name: "Rope", quantity: 1 }] });
    await userEvent.click(screen.getByRole("button", { name: "Manage Rope" }));
    await userEvent.click(screen.getByRole("button", { name: "Give Rope…" }));
    await userEvent.click(screen.getByRole("button", { name: "Give" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Bo isn't at this table any more.");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onGiveItem).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Who to give Rope to")).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: "Give Rope…" })).toHaveFocus());
  });

  it("only offers Give when there's someone at the table to give to", async () => {
    renderTab({ onGiveItem: vi.fn(), giftReceivers: [] });
    await userEvent.click(screen.getByRole("button", { name: "Manage Pouch" }));
    expect(screen.queryByRole("button", { name: /^Give/ })).not.toBeInTheDocument();
  });

  it("won't split off all of a stack", async () => {
    renderTab({ onEquipmentSplit: vi.fn(), equipment: [{ index: "a1", name: "Arrows", quantity: 10 }] });
    await userEvent.click(screen.getByRole("button", { name: "Manage Arrows" }));
    await userEvent.click(screen.getByRole("button", { name: "Split stack of Arrows" }));
    await userEvent.clear(screen.getByLabelText("How many Arrows to split off"));
    await userEvent.type(screen.getByLabelText("How many Arrows to split off"), "10");
    expect(screen.getByRole("button", { name: "Split" })).toBeDisabled();
  });

  it("shows one task at a time: Give replaces Split, and Escape closes the task first", async () => {
    renderTab({
      onEquipmentSplit: vi.fn(),
      onGiveItem: vi.fn(),
      giftReceivers: [{ userId: "u-bo", name: "Bo" }],
      equipment: [{ index: "a1", name: "Arrows", quantity: 10 }],
    });
    await userEvent.click(screen.getByRole("button", { name: "Manage Arrows" }));
    await userEvent.click(screen.getByRole("button", { name: "Split stack of Arrows" }));
    expect(screen.getByRole("button", { name: "Split stack of Arrows" })).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(screen.getByRole("button", { name: "Give Arrows…" }));
    expect(screen.queryByLabelText("How many Arrows to split off")).toBeNull();
    expect(screen.getByLabelText("Who to give Arrows to")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Split stack of Arrows" })).toHaveAttribute("aria-expanded", "false");

    screen.getByLabelText("Who to give Arrows to").focus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByLabelText("Who to give Arrows to")).toBeNull();
    expect(screen.getByRole("button", { name: "Manage Arrows" })).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(screen.getByRole("button", { name: "Give Arrows…" })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Manage Arrows" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Manage Arrows" })).toHaveFocus();
  });

  it("has no stars where favourites aren't offered", () => {
    renderTab();
    expect(screen.queryByRole("button", { name: /^Favourite / })).not.toBeInTheDocument();
  });

  it("has no inventory-wide Edit mode: Edit item and Delete item are under each Manage", async () => {
    const handlers = renderTab();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit Pouch" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Manage Pouch" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit Pouch" }));
    // The list's own editor takes the row's place.
    const name = screen.getByDisplayValue("Pouch");
    await userEvent.clear(name);
    await userEvent.type(name, "Belt pouch");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(handlers.onEquipmentUpdate).toHaveBeenCalledTimes(1);
    expect(handlers.onEquipmentUpdate).toHaveBeenCalledWith("i2", expect.objectContaining({ name: "Belt pouch" }));
    // Back to the same item's Manage panel, focus on Edit item.
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit Pouch" })).toHaveFocus());
  });

  it("asks before throwing away an unsaved edit for another one", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const handlers = renderTab();
    await userEvent.click(screen.getByRole("button", { name: "Manage Pouch" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit Pouch" }));
    await userEvent.type(screen.getByDisplayValue("Pouch"), "!");
    // Unchanged edits switch freely; this one was typed in, so it asks.
    await userEvent.click(screen.getByRole("button", { name: "Manage Chain Mail" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit Chain Mail" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toMatch(/Discard your changes to "Pouch"/);
    // Said no: still editing Pouch, with the typing kept.
    expect(screen.getByDisplayValue("Pouch!")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add Item" }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.getByDisplayValue("Pouch!")).toBeInTheDocument();
    expect(handlers.onEquipmentUpdate).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("deletes only after asking, says when it's the whole stack, and moves focus on", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const handlers = renderTab({ equipment: [{ index: "a1", name: "Arrows", quantity: 10 }, EQUIPMENT[1]] });
    await userEvent.click(screen.getByRole("button", { name: "Manage Arrows" }));
    const del = screen.getByRole("button", { name: "Delete Arrows" });
    await userEvent.click(del);
    expect(confirm.mock.calls[0][0]).toMatch(/Delete all 10 of "Arrows" \(the whole stack\)/);
    expect(handlers.onEquipmentRemove).not.toHaveBeenCalled();
    await userEvent.click(del);
    expect(handlers.onEquipmentRemove).toHaveBeenCalledTimes(1);
    expect(handlers.onEquipmentRemove).toHaveBeenCalledWith("a1");
    // Focus goes on to the next item's Manage, found by the item, not its place.
    await waitFor(() => expect(screen.getByRole("button", { name: "Manage Pouch" })).toHaveFocus());
    confirm.mockRestore();
  });

  it("labels Proficient and Attune with words, a picture and a check when on, under Manage", async () => {
    const handlers = renderTab();
    // Closed: no controls at all, so none are in the Tab order.
    expect(screen.queryByRole("button", { name: "Proficient with Chain Mail" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Manage Chain Mail" }));

    const proficient = screen.getByRole("button", { name: "Proficient with Chain Mail" });
    expect(proficient).toHaveAttribute("aria-pressed", "true");
    expect(proficient).toHaveTextContent(/^Proficient$/);
    expect(proficient.querySelector(".inventory-toggle__check")).not.toBeNull();
    expect(proficient.querySelector('svg[data-icon="proficient"]')).toHaveAttribute("aria-hidden", "true");
    // Chain Mail doesn't need attunement, so no Attune (the help says where to mark it).
    expect(screen.queryByRole("button", { name: /Attune/ })).toBeNull();
    expect(screen.getByText(/It shows for items marked/)).toHaveTextContent("Edit item, then Magic item");

    // An attuned item keeps its Attune (on), so it can always be undone.
    await userEvent.click(screen.getByRole("button", { name: "Manage Helm of Teleportation" }));
    const attune = screen.getByRole("button", { name: "Attuned to Helm of Teleportation" });
    expect(attune).toHaveAttribute("aria-pressed", "true");
    expect(attune.querySelector(".inventory-toggle__check")).not.toBeNull();

    // Each tap calls the existing handler once, with the item's current state.
    await userEvent.click(attune);
    expect(handlers.onEquipmentAttuneToggle).toHaveBeenCalledTimes(1);
    expect(handlers.onEquipmentAttuneToggle).toHaveBeenCalledWith("i3", true);
    await userEvent.click(screen.getByRole("button", { name: "Manage Chain Mail" }));
    await userEvent.click(screen.getByRole("button", { name: "Proficient with Chain Mail" }));
    expect(handlers.onEquipmentProficientToggle).toHaveBeenCalledTimes(1);
    expect(handlers.onEquipmentProficientToggle).toHaveBeenCalledWith("i1", true);
  });

  it("offers Attune only for items that need it, and Proficient only for weapons, keeping any that are on", async () => {
    installFakeStorage();
    renderTab({
      equipment: [
        { index: "r", name: "Rations", quantity: 5 },
        { index: "c", name: "Cloak of Protection", quantity: 1, requiresAttunement: true },
        { index: "s", name: "Longsword", quantity: 1 },
        // Saved before: still shown, so nothing is hidden or lost.
        { index: "p", name: "Potion of Healing", quantity: 1, proficient: true, attuned: true },
      ],
    });
    const panelButtons = async (name) => {
      await userEvent.click(screen.getByRole("button", { name: `Manage ${name}` }));
      const panel = document.getElementById(screen.getByRole("button", { name: `Manage ${name}` }).getAttribute("aria-controls"));
      return within(panel).getAllByRole("button", { pressed: undefined }).filter((b) => b.hasAttribute("aria-pressed")).map((b) => b.getAttribute("aria-label"));
    };
    expect(await panelButtons("Rations")).toEqual([]);
    expect(await panelButtons("Cloak of Protection")).toEqual(["Attune to Cloak of Protection"]);
    expect(await panelButtons("Longsword")).toEqual(["Equip Longsword", "Proficient with Longsword"]);
    expect(await panelButtons("Potion of Healing")).toEqual(["Proficient with Potion of Healing", "Attuned to Potion of Healing"]);
  });

  it("says so when the item details can't be looked up, with a way to try again", async () => {
    const retry = vi.fn();
    lookup.value = { findMatches: () => [], loadDetails: () => {}, status: "failed", retry };
    renderTab();

    expect(screen.getByRole("status")).toHaveTextContent("Couldn't look up item details right now");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });

  it("stays quiet when the look-up worked", () => {
    lookup.value = { findMatches: () => [], loadDetails: () => {}, status: "ready", retry: () => {} };
    renderTab();
    expect(screen.queryByText(/Couldn't look up item details/)).not.toBeInTheDocument();
  });
});

// Small category pictures: decoration only, from the same category the
// headings and filters use.
describe("inventory pictures", () => {
  const headingIcons = () =>
    [...document.querySelectorAll(".character-sheet__list-group")].map(
      (heading) => `${heading.textContent}=${heading.querySelector("svg.inventory-icon")?.dataset.icon}`,
    );
  const filterIcon = () =>
    screen.getByLabelText("Show Inventory").closest("label").querySelector("svg.inventory-icon")?.dataset.icon ?? null;

  const ALL_KINDS = [
    { index: "w", name: "Longsword", quantity: 1, wielded: true },
    { index: "a", name: "Chain Mail", quantity: 1, equipped: true, proficient: true },
    { index: "c", name: "Cloak of Protection", quantity: 1, attuned: true },
    { index: "g", name: "Mysterious Thingamajig", quantity: 1 },
    { index: "p", name: "Potion of Healing", quantity: 3 },
    { index: "t", name: "Lucky rock", quantity: 1, category: "treasure" },
  ];

  it("puts each category's picture before its heading, words unchanged", () => {
    installFakeStorage();
    renderTab({ equipment: ALL_KINDS });
    expect(headingIcons()).toEqual([
      "Weapons=weapons",
      "Armor & shields=armor",
      "Worn items=worn",
      // An item the app can't place goes under Gear & tools, picture and all.
      "Gear & tools=gear",
      "Consumables=consumables",
      "Treasure & keepsakes=treasure",
    ]);
    for (const svg of document.querySelectorAll("svg.inventory-icon")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg.closest("button, a, [tabindex]")).toBeNull();
    }
  });

  it("follows a picked category, never the picture's own idea", () => {
    installFakeStorage();
    renderTab({ equipment: [{ index: "x", name: "Longsword", quantity: 1, category: "treasure" }, ...EQUIPMENT] });
    expect(headingIcons()).toContain("Treasure & keepsakes=treasure");
    expect(headingIcons().some((entry) => entry.startsWith("Weapons"))).toBe(false);
  });

  it("shows the chosen filter's picture beside Show, keeping Worn items and Wearing apart", async () => {
    installFakeStorage();
    renderTab({ equipment: ALL_KINDS });
    const show = screen.getByLabelText("Show Inventory");
    expect(show.tagName).toBe("SELECT");
    expect(filterIcon()).toBe("all");

    await userEvent.selectOptions(show, "category:worn");
    expect(filterIcon()).toBe("worn");
    expect(screen.getAllByRole("listitem").map((row) => row.textContent).join(" ")).toContain("Cloak of Protection");
    expect(screen.getAllByRole("listitem").map((row) => row.textContent).join(" ")).not.toContain("Chain Mail");

    await userEvent.selectOptions(show, "worn");
    expect(filterIcon()).toBe("wearing");
    // Still the equipped-armor filter: Chain Mail only, not the cloak.
    const shown = screen.getAllByRole("listitem").map((row) => row.textContent).join(" ");
    expect(shown).toContain("Chain Mail");
    expect(shown).not.toContain("Cloak of Protection");

    await userEvent.selectOptions(show, "attuned");
    expect(filterIcon()).toBe("attuned");
    await userEvent.selectOptions(show, "wielded");
    expect(filterIcon()).toBe("wielded");
    await userEvent.selectOptions(show, "proficient");
    expect(filterIcon()).toBe("proficient");
  });

  it("adds no picture to Favourites, which has its own ♥", async () => {
    installFakeStorage();
    renderTab({
      onEquipmentFavoriteToggle: vi.fn(),
      equipment: ALL_KINDS.map((item) => (item.index === "p" ? { ...item, favorite: true } : item)),
    });
    await userEvent.selectOptions(screen.getByLabelText("Show Inventory"), "favorites");
    expect(filterIcon()).toBeNull();
  });

  it("shows no headings or pictures with nothing in the inventory", () => {
    installFakeStorage();
    renderTab({ equipment: [] });
    expect(document.querySelector("svg.inventory-icon")).toBeNull();
  });
});

// Manage: a calm row (what's on, in words, and one Manage button), with
// the item's controls in a panel under it. Same callbacks as before.
describe("inventory controls under Manage", () => {
  const GEAR = [
    { index: "w", name: "Longsword", quantity: 1, wielded: true, proficient: true },
    { index: "d", name: "Dagger", quantity: 2 },
    { index: "a", name: "Chain Mail", quantity: 1, equipped: true },
    { index: "s", name: "Shield", quantity: 1 },
  ];
  const armorOrShield = (item) => ["a", "s"].includes(item.index);
  const handlerProps = () => ({
    onEquipmentAdd: vi.fn(),
    onEquipmentUpdate: vi.fn(),
    onEquipmentRemove: vi.fn(),
    onEquipmentAttuneToggle: vi.fn(),
    onEquipmentProficientToggle: vi.fn(),
    onEquipToggle: vi.fn(),
    onWeaponEquipToggle: vi.fn(),
  });
  const gearProps = { isArmor: armorOrShield, isShield: (item) => item.index === "s" };
  const manage = (name) => screen.getByRole("button", { name: `Manage ${name}` });
  const rowOf = (name) => manage(name).closest("li");

  it("shows only what's on, in words, and nothing when nothing is on", () => {
    installFakeStorage();
    render(<CharacterSheetInventoryTab equipment={GEAR} {...handlerProps()} {...gearProps} />);
    expect(rowOf("Longsword").querySelector(".inventory-state-summary")).toHaveTextContent(/^Equipped · Proficient$/);
    expect(rowOf("Chain Mail").querySelector(".inventory-state-summary")).toHaveTextContent(/^Wearing$/);
    expect(rowOf("Dagger").querySelector(".inventory-state-summary")).toBeNull();
    // Words, not extra buttons.
    expect(within(rowOf("Longsword")).queryByRole("button", { name: /Equipped/ })).toBeNull();
  });

  it("is a real disclosure: closed at first, named after the item, tied to its panel", async () => {
    installFakeStorage();
    render(<CharacterSheetInventoryTab equipment={GEAR} {...handlerProps()} {...gearProps} />);
    const button = manage("Dagger");
    expect(button).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    expect(panel).not.toBeVisible();
    expect(within(panel).queryAllByRole("button", { hidden: true })).toHaveLength(0);

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(panel).toBeVisible();
    expect(within(panel).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
      "Equip Dagger",
      "Proficient with Dagger",
      "Edit Dagger",
      // (No Split here: this list wasn't given a way to split.)
      "Delete Dagger",
    ]);
    // Opening it changed nothing.
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("opens one item at a time, and stays open while several things are changed", async () => {
    installFakeStorage();
    const handlers = handlerProps();
    render(<CharacterSheetInventoryTab equipment={GEAR} {...handlers} {...gearProps} />);
    await userEvent.click(manage("Shield"));
    await userEvent.click(screen.getByRole("button", { name: "Equip Shield" }));
    expect(handlers.onEquipToggle).toHaveBeenCalledTimes(1);
    expect(handlers.onEquipToggle).toHaveBeenCalledWith("s", undefined);
    expect(manage("Shield")).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(manage("Longsword"));
    expect(manage("Shield")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Equip Shield" })).toBeNull();
    expect(screen.getByRole("button", { name: "Equipped Longsword" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Equipped Longsword" }));
    expect(handlers.onWeaponEquipToggle).toHaveBeenCalledTimes(1);
    expect(handlers.onWeaponEquipToggle).toHaveBeenCalledWith(expect.objectContaining({ index: "w" }));
  });

  it("says Wear/Wearing for armor and Equip/Equipped for shields", async () => {
    installFakeStorage();
    render(<CharacterSheetInventoryTab equipment={GEAR} {...handlerProps()} {...gearProps} />);
    await userEvent.click(manage("Chain Mail"));
    const wear = screen.getByRole("button", { name: "Wearing Chain Mail" });
    expect(wear).toHaveAttribute("aria-pressed", "true");
    expect(wear.querySelector('svg[data-icon="wear-armor"]')).not.toBeNull();
    await userEvent.click(manage("Shield"));
    expect(screen.getByRole("button", { name: "Equip Shield" })).toHaveAttribute("aria-pressed", "false");
  });

  it("updates the words, check and summary when the item changes from outside", async () => {
    installFakeStorage();
    const handlers = handlerProps();
    const { rerender } = render(<CharacterSheetInventoryTab equipment={GEAR} {...handlers} {...gearProps} />);
    await userEvent.click(manage("Dagger"));
    expect(screen.getByRole("button", { name: "Equip Dagger" })).toHaveAttribute("aria-pressed", "false");
    rerender(
      <CharacterSheetInventoryTab
        equipment={GEAR.map((item) => (item.index === "d" ? { ...item, wielded: true, attuned: true } : item))}
        {...handlers}
        {...gearProps}
      />,
    );
    const on = screen.getByRole("button", { name: "Equipped Dagger" });
    expect(on).toHaveAttribute("aria-pressed", "true");
    expect(on.querySelector(".inventory-toggle__check")).not.toBeNull();
    expect(rowOf("Dagger").querySelector(".inventory-state-summary")).toHaveTextContent(/^Equipped · Attuned$/);
    expect(manage("Dagger")).toHaveAttribute("aria-expanded", "true");
  });

  it("stays with the same item when sorted, and closes if the item is gone", async () => {
    installFakeStorage();
    const handlers = handlerProps();
    const { rerender } = render(<CharacterSheetInventoryTab equipment={GEAR} {...handlers} {...gearProps} />);
    await userEvent.click(manage("Dagger"));
    await userEvent.selectOptions(screen.getByLabelText("Sort Inventory"), "quantity");
    expect(manage("Dagger")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Equip Dagger" })).toBeInTheDocument();

    rerender(<CharacterSheetInventoryTab equipment={GEAR.filter((item) => item.index !== "d")} {...handlers} {...gearProps} />);
    expect(screen.queryByRole("button", { name: /Dagger/ })).toBeNull();
    for (const name of ["Longsword", "Chain Mail", "Shield"]) expect(manage(name)).toHaveAttribute("aria-expanded", "false");
  });

  it("closes with Escape and gives focus back to Manage", async () => {
    installFakeStorage();
    render(<CharacterSheetInventoryTab equipment={GEAR} {...handlerProps()} {...gearProps} />);
    manage("Dagger").focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Equip Dagger" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(manage("Dagger")).toHaveAttribute("aria-expanded", "false");
    expect(manage("Dagger")).toHaveFocus();
  });

  it("keeps the name's own button separate from Manage", async () => {
    installFakeStorage();
    lookup.value = { findMatches: (name) => (name === "Dagger" ? [{ name: "Dagger" }] : []), loadDetails: () => {}, status: "ready", retry: () => {} };
    render(<CharacterSheetInventoryTab equipment={GEAR} {...handlerProps()} {...gearProps} />);
    expect(screen.getByRole("button", { name: /^Dagger/ })).toHaveAttribute("aria-haspopup", "dialog");
    expect(manage("Dagger")).not.toHaveAttribute("aria-haspopup");
    lookup.value = { findMatches: () => [], loadDetails: () => {}, status: "ready", retry: () => {} };
  });

  it("explains the controls once, closed until opened, by keyboard too", async () => {
    installFakeStorage();
    render(<CharacterSheetInventoryTab equipment={GEAR} {...handlerProps()} {...gearProps} />);
    const help = screen.getAllByRole("button", { name: /What do these controls do\?/ });
    expect(help).toHaveLength(1);
    expect(help[0]).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/It doesn.t grant it/)).not.toBeVisible();
    help[0].focus();
    await userEvent.keyboard("{Enter}");
    expect(help[0]).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/It doesn.t grant it/)).toBeVisible();
    expect(screen.getByText(/separate from equipping or/)).toBeVisible();
  });

  it("keeps every picture out of the Tab order and away from screen readers, heart included", async () => {
    installFakeStorage();
    render(<CharacterSheetInventoryTab equipment={GEAR} {...handlerProps()} {...gearProps} onEquipmentFavoriteToggle={vi.fn()} />);
    await userEvent.click(manage("Dagger"));
    for (const svg of document.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
    }
    const heart = screen.getByRole("button", { name: "Favourite Dagger x2" });
    expect(heart.querySelector('svg[data-icon="favorite"]')).not.toHaveAttribute("data-filled");
    expect(heart).toHaveAttribute("aria-pressed", "false");
  });
});
