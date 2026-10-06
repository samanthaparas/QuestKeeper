import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSheetActionsTab from "./CharacterSheetActionsTab";
import { getWeaponDetails } from "../../utils/api";

vi.mock("../../utils/api", () => ({
  getWeapons: vi.fn().mockResolvedValue([
    { index: "dagger", name: "Dagger" },
    { index: "longbow", name: "Longbow" },
  ]),
  getWeaponDetails: vi.fn(),
  getEquipment: vi.fn().mockResolvedValue([]),
  getEquipmentDetails: vi.fn(),
  getMagicItems: vi.fn().mockResolvedValue([]),
  getMagicItemDetails: vi.fn(),
}));

const dagger = {
  index: "dagger",
  name: "Dagger",
  weapon_category: "Simple",
  weapon_range: "Melee",
  damage: { damage_dice: "1d4", damage_type: { name: "Piercing" } },
  properties: [{ index: "finesse", name: "Finesse" }],
  throw_range: { normal: 20, long: 60 },
};

function renderTab(props = {}) {
  const onAttackAdd = vi.fn();
  render(
    <CharacterSheetActionsTab
      attacks={[]}
      onAttackAdd={onAttackAdd}
      onAttackUpdate={vi.fn()}
      onAttackRemove={vi.fn()}
      equipment={[{ index: "item-1", name: "Dagger", quantity: 2 }]}
      abilityScores={{ strength: 10, dexterity: 16 }}
      proficiencyNames={["Simple Weapons"]}
      proficiencyBonus={2}
      {...props}
    />,
  );
  return { onAttackAdd };
}

describe("CharacterSheetActionsTab", () => {
  beforeEach(() => {
    getWeaponDetails.mockReset();
  });

  it("tells a new player what to do when there are no attacks", () => {
    renderTab({ equipment: [] });

    expect(
      screen.getByText(/Tap Add Weapon and start typing/),
    ).toBeInTheDocument();
  });

  it("turns an inventory weapon into an attack with one tap", async () => {
    getWeaponDetails.mockResolvedValue(dagger);
    const user = userEvent.setup();
    const { onAttackAdd } = renderTab();

    await user.click(
      await screen.findByRole("button", { name: "Add Dagger as an attack" }),
    );

    expect(getWeaponDetails).toHaveBeenCalledWith("dagger");
    expect(onAttackAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Dagger",
        toHit: 5,
        damage: "1d4+3",
        damageType: "Piercing",
      }),
    );
  });

  it("counts the inventory Proficient toggle when working out to-hit", async () => {
    getWeaponDetails.mockResolvedValue(dagger);
    const user = userEvent.setup();
    const { onAttackAdd } = renderTab({
      proficiencyNames: [],
      equipment: [{ index: "item-1", name: "Dagger", proficient: true }],
    });

    await user.click(
      await screen.findByRole("button", { name: "Add Dagger as an attack" }),
    );

    expect(onAttackAdd).toHaveBeenCalledWith(
      expect.objectContaining({ toHit: 5 }),
    );
  });

  it("does not offer weapons that are already attacks", async () => {
    renderTab({
      attacks: [{ index: "a1", name: "Dagger", toHit: 5, damage: "1d4+3" }],
      equipment: [
        { index: "item-1", name: "Dagger" },
        { index: "item-2", name: "Longbow" },
      ],
    });

    expect(
      await screen.findByRole("button", { name: "Add Longbow as an attack" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add Dagger as an attack" }),
    ).not.toBeInTheDocument();
  });

  it("explains what to do if the weapon can't be looked up", async () => {
    getWeaponDetails.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    const { onAttackAdd } = renderTab();

    await user.click(
      await screen.findByRole("button", { name: "Add Dagger as an attack" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't look up Dagger right now. Tap Add Weapon to type it in instead.",
    );
    expect(onAttackAdd).not.toHaveBeenCalled();
  });

  it("explains what To Hit means before a weapon is chosen", async () => {
    const user = userEvent.setup();
    renderTab({ equipment: [] });

    await user.click(screen.getByRole("button", { name: "Add Weapon" }));

    expect(
      screen.getByText(/To Hit is what you add to a d20 when you attack/),
    ).toBeInTheDocument();
    expect(screen.getByText(/add your Dexterity \(\+3\)/)).toBeInTheDocument();
  });

  it("fills in to hit and damage for a known weapon, including magic ones", async () => {
    getWeaponDetails.mockResolvedValue(dagger);
    const user = userEvent.setup();
    renderTab({ equipment: [] });

    await user.click(screen.getByRole("button", { name: "Add Weapon" }));
    await user.type(screen.getByPlaceholderText(/Weapon name/), "+1 Dagger");

    expect(
      await screen.findByText("When you attack, roll a d20 and add 6."),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("To Hit")).toHaveValue(6);
    expect(screen.getByPlaceholderText(/Damage/)).toHaveValue("1d4+4");
  });

  it("keeps the full breakdown behind a toggle under the row of boxes", async () => {
    getWeaponDetails.mockResolvedValue(dagger);
    const user = userEvent.setup();
    renderTab({ equipment: [] });

    await user.click(screen.getByRole("button", { name: "Add Weapon" }));
    await user.type(screen.getByPlaceholderText(/Weapon name/), "+1 Dagger");

    const summary = await screen.findByText("How is this worked out?");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("+1 because it's magic.");

    await user.click(summary);
    expect(details).toHaveAttribute("open");
  });
});
