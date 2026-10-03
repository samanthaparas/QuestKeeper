import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddCombatantForm from "./AddCombatantForm";

const templates = [
  {
    id: "tpl-1",
    name: "Bugbear",
    kind: "monster",
    max_hp: 27,
    armor_class: 16,
    stat_block: { attacks: [{ name: "Morningstar", toHit: 4, damage: "2d8+2" }], notes: "Sneaky" },
  },
  { id: "tpl-2", name: "Sir Pip", kind: "ally", max_hp: 20, armor_class: null, stat_block: {} },
];

async function fill(label, value) {
  await userEvent.type(screen.getByLabelText(label), value);
}

describe("AddCombatantForm", () => {
  it("cannot be submitted without a name and HP", async () => {
    render(<AddCombatantForm onAdd={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    await fill("Name", "Goblin");
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    await fill("HP", "7");
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("adds an enemy with its numbers and cleaned stat block", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    render(<AddCombatantForm onAdd={onAdd} />);

    await fill("Name", "Goblin");
    await fill("HP", "7");
    await fill("AC", "13");
    await fill("Initiative", "12");
    await userEvent.click(screen.getByRole("button", { name: "Attacks and notes" }));
    await userEvent.click(screen.getByRole("button", { name: "+ Add attack" }));
    await userEvent.type(screen.getByLabelText("Attack 1 name"), "Scimitar");
    await userEvent.type(screen.getByLabelText("Attack 1 to hit"), "4");
    await userEvent.type(screen.getByLabelText("Attack 1 damage"), "1d6+2");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).toHaveBeenCalledWith({
      kind: "monster",
      name: "Goblin",
      count: 1,
      maxHp: 7,
      armorClass: 13,
      initiative: 12,
      statBlock: { attacks: [{ name: "Scimitar", toHit: 4, damage: "1d6+2" }], notes: "" },
      saveToLibrary: false,
      pieces: [],
    });
  });

  it("adds a friendly NPC or party member", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    render(<AddCombatantForm onAdd={onAdd} />);

    await userEvent.click(screen.getByLabelText("Friendly NPC or party member"));
    await fill("Name", "Billie");
    await fill("HP", "117");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ kind: "ally", name: "Billie", maxHp: 117 }));
  });

  it("labels the button with how many will be added", async () => {
    render(<AddCombatantForm onAdd={vi.fn()} />);

    await userEvent.clear(screen.getByLabelText("How many"));
    await userEvent.type(screen.getByLabelText("How many"), "5");

    expect(screen.getByRole("button", { name: "Add 5" })).toBeInTheDocument();
  });

  it("can save what it adds to the library", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    render(<AddCombatantForm onAdd={onAdd} />);

    await fill("Name", "Ogre");
    await fill("HP", "59");
    await userEvent.click(screen.getByLabelText("Also save to my library"));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ saveToLibrary: true }));
  });

  it("fills the form from a saved library entry", async () => {
    render(<AddCombatantForm onAdd={vi.fn()} templates={templates} />);

    await userEvent.selectOptions(screen.getByLabelText("Add from my library"), "tpl-1");

    expect(screen.getByLabelText("Name")).toHaveValue("Bugbear");
    expect(screen.getByLabelText("HP")).toHaveValue(27);
    expect(screen.getByLabelText("AC")).toHaveValue(16);
    expect(screen.getByLabelText("Attack 1 name")).toHaveValue("Morningstar");
    expect(screen.getByLabelText("Notes")).toHaveValue("Sneaky");
  });

  it("switches to friendly when an ally is picked from the library", async () => {
    render(<AddCombatantForm onAdd={vi.fn()} templates={templates} />);

    await userEvent.selectOptions(screen.getByLabelText("Add from my library"), "tpl-2");

    expect(screen.getByLabelText("Friendly NPC or party member")).toBeChecked();
    expect(screen.getByLabelText("AC")).toHaveValue(null);
  });

  it("clears itself after a successful add, but keeps what was typed after a failure", async () => {
    const onAdd = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<AddCombatantForm onAdd={onAdd} />);
    await fill("Name", "Goblin");
    await fill("HP", "7");

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Goblin");

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("lets the DM nickname and tag each of several monsters", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    render(<AddCombatantForm onAdd={onAdd} />);

    await fill("Name", "Goblin");
    await userEvent.clear(screen.getByLabelText("How many"));
    await fill("How many", "2");
    await fill("HP", "7");
    await userEvent.click(screen.getByRole("button", { name: "Tell them apart" }));
    await userEvent.selectOptions(screen.getByLabelText("Icon for monster 1"), "🦆");
    await userEvent.type(screen.getByLabelText("Nickname for monster 1"), "red duck");

    expect(screen.getByText("🦆 Goblin (red duck)")).toBeInTheDocument();
    expect(screen.getByText("Goblin 2")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add 2" }));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
        pieces: [{ icon: "🦆", label: "red duck" }],
      }),
    );
  });

  it("explains how to add several of the same monster", () => {
    render(<AddCombatantForm onAdd={vi.fn()} />);

    expect(screen.getByText(/Adding several of the same monster\?/)).toBeInTheDocument();
  });
});
