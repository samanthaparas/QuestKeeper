import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CombatantEditPanel from "./CombatantEditPanel";

const combatant = { id: "c1", name: "Goblin" };
const secret = {
  max_hp: 7,
  current_hp: 4,
  armor_class: 13,
  stat_block: { attacks: [{ name: "Scimitar", toHit: 4, damage: "1d6+2" }], notes: "Cowardly" },
};

function setup(overrides = {}) {
  const props = {
    combatant,
    secret,
    onSave: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<CombatantEditPanel {...props} />);
  return props;
}

describe("CombatantEditPanel", () => {
  it("starts with the current values", () => {
    setup();

    expect(screen.getByLabelText("Edit name")).toHaveValue("Goblin");
    expect(screen.getByLabelText("Edit max HP")).toHaveValue(7);
    expect(screen.getByLabelText("Edit current HP")).toHaveValue(4);
    expect(screen.getByLabelText("Edit AC")).toHaveValue(13);
    expect(screen.getByLabelText("Attack 1 name")).toHaveValue("Scimitar");
    expect(screen.getByLabelText("Notes")).toHaveValue("Cowardly");
  });

  it("saves the changes", async () => {
    const props = setup();

    await userEvent.clear(screen.getByLabelText("Edit name"));
    await userEvent.type(screen.getByLabelText("Edit name"), "Goblin Boss");
    await userEvent.clear(screen.getByLabelText("Edit max HP"));
    await userEvent.type(screen.getByLabelText("Edit max HP"), "20");
    await userEvent.clear(screen.getByLabelText("Edit current HP"));
    await userEvent.type(screen.getByLabelText("Edit current HP"), "20");
    await userEvent.clear(screen.getByLabelText("Edit AC"));
    await userEvent.type(screen.getByLabelText("Edit AC"), "15");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(props.onSave).toHaveBeenCalledWith({
      id: "c1",
      name: "Goblin Boss",
      maxHp: 20,
      currentHp: 20,
      armorClass: 15,
      statBlock: { attacks: [{ name: "Scimitar", toHit: 4, damage: "1d6+2" }], notes: "Cowardly" },
    });
  });

  it("allows clearing the AC", async () => {
    const props = setup();

    await userEvent.clear(screen.getByLabelText("Edit AC"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ armorClass: null }));
  });

  it("refuses an empty name, zero max HP, or negative current HP", async () => {
    const props = setup();

    await userEvent.clear(screen.getByLabelText("Edit name"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/name/i);

    await userEvent.type(screen.getByLabelText("Edit name"), "Goblin");
    await userEvent.clear(screen.getByLabelText("Edit max HP"));
    await userEvent.type(screen.getByLabelText("Edit max HP"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Max HP/);

    await userEvent.clear(screen.getByLabelText("Edit max HP"));
    await userEvent.type(screen.getByLabelText("Edit max HP"), "7");
    await userEvent.clear(screen.getByLabelText("Edit current HP"));
    await userEvent.type(screen.getByLabelText("Edit current HP"), "-3");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/negative/);

    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("shows the server's error and can be cancelled", async () => {
    const props = setup({ onSave: vi.fn().mockRejectedValue(new Error("Only the DM can edit this")) });

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Only the DM can edit this");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onCancel).toHaveBeenCalled();
  });

  it("lets the DM tag a monster with an icon, keeping the name", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<CombatantEditPanel combatant={combatant} secret={secret} onSave={onSave} onCancel={() => {}} />);

    await userEvent.selectOptions(screen.getByLabelText("Edit icon"), "🦆");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "🦆 Goblin" }));
  });

  it("shows an existing icon in the icon box, not in the name box", () => {
    render(
      <CombatantEditPanel
        combatant={{ id: "c1", name: "🐧 Goblin 2" }}
        secret={secret}
        onSave={vi.fn()}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByLabelText("Edit icon")).toHaveValue("🐧");
    expect(screen.getByLabelText("Edit name")).toHaveValue("Goblin 2");
  });
});
