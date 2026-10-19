import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSheetActionsTab from "./CharacterSheetActionsTab";
import { getWeaponDetails } from "../../utils/api";
import { installFakeStorage } from "../../test/fakeStorage";

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
    await user.type(screen.getByLabelText("Weapon name"), "+1 Dagger");

    expect(
      await screen.findByText("When you attack, roll a d20 and add 6."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("To hit")).toHaveValue(6);
    expect(screen.getByLabelText("Damage")).toHaveValue("1d4+4");
  });

  it("keeps the full breakdown behind a toggle under the row of boxes", async () => {
    getWeaponDetails.mockResolvedValue(dagger);
    const user = userEvent.setup();
    renderTab({ equipment: [] });

    await user.click(screen.getByRole("button", { name: "Add Weapon" }));
    await user.type(screen.getByLabelText("Weapon name"), "+1 Dagger");

    const summary = await screen.findByText("How is this worked out?");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("+1 because it's magic.");

    await user.click(summary);
    expect(details).toHaveAttribute("open");
  });

  it("uses pencil and trash buttons named after the attack", async () => {
    const onAttackRemove = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTab({
      attacks: [{ id: "a1", name: "Longsword", toHit: 5, damage: "1d8+3", damageType: "Slashing" }],
      onAttackRemove,
    });

    // Hidden in play; "Edit attacks" shows them, "Done" hides them again.
    expect(screen.queryByRole("button", { name: "Edit Longsword" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Edit attacks" }));
    expect(screen.getByRole("button", { name: "Edit Longsword" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove Longsword" }));
    expect(onAttackRemove).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("button", { name: "Remove Longsword" })).toBeNull();
  });

  it("edits an attack in its own row, and saves from there", async () => {
    const onAttackUpdate = vi.fn();
    renderTab({
      attacks: [
        { index: "a1", name: "Wisteria's Kiss", toHit: 9, damage: "1d8+4", damageType: "Piercing", notes: "" },
        { index: "a2", name: "Dagger", toHit: 7, damage: "1d4+4", damageType: "Piercing", notes: "" },
      ],
      onAttackUpdate,
    });
    await userEvent.click(screen.getByRole("button", { name: "Edit attacks" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit Dagger" }));

    const form = document.querySelector(".character-sheet__inline-edit");
    expect(within(form).getByDisplayValue("Dagger")).toBeInTheDocument();
    // Wisteria's Kiss is still an ordinary row above the form.
    expect(form.previousElementSibling).toHaveTextContent("Wisteria's Kiss");
    await userEvent.click(within(form).getByRole("button", { name: "Save Changes" }));
    expect(onAttackUpdate).toHaveBeenCalledWith("a2", expect.objectContaining({ name: "Dagger" }));
    expect(document.querySelector(".character-sheet__inline-edit")).toBeNull();
  });

  it("sorts attacks by to-hit or damage type, and shows one damage type", async () => {
    installFakeStorage();
    renderTab({
      equipment: [],
      attacks: [
        { index: "a1", name: "Dagger", toHit: 7, damage: "1d4+4", damageType: "Piercing" },
        { index: "a2", name: "Wisteria's Kiss", toHit: 9, damage: "1d8+4", damageType: "Piercing" },
        { index: "a3", name: "Club", toHit: 3, damage: "1d4+1", damageType: "Bludgeoning" },
      ],
    });
    const names = () =>
      [...document.querySelectorAll(".character-sheet__attacks-row, .character-sheet__list-group")].map((row) =>
        row.classList.contains("character-sheet__list-group") ? `# ${row.textContent}` : row.textContent.split("+")[0],
      );

    await userEvent.selectOptions(screen.getByLabelText("Sort Attacks"), "toHit");
    expect(names()).toEqual(["Wisteria's Kiss", "Dagger", "Club"]);

    await userEvent.selectOptions(screen.getByLabelText("Sort Attacks"), "type");
    expect(names()).toEqual(["# Bludgeoning", "Club", "# Piercing", "Dagger", "Wisteria's Kiss"]);

    await userEvent.selectOptions(screen.getByLabelText("Show Attacks"), "type:bludgeoning");
    expect(names()).toEqual(["# Bludgeoning", "Club"]);
  });
});
