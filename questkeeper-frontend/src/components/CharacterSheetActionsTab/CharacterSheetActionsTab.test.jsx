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
      screen.getByText(/Tap \+ Add weapon and start typing/),
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
      "Couldn't look up Dagger right now. Tap + Add weapon to type it in instead.",
    );
    expect(onAttackAdd).not.toHaveBeenCalled();
  });

  it("explains what To Hit means before a weapon is chosen", async () => {
    const user = userEvent.setup();
    renderTab({ equipment: [] });

    await user.click(screen.getByRole("button", { name: "+ Add weapon" }));

    expect(
      screen.getByText(/To Hit is what you add to a d20 when you attack/),
    ).toBeInTheDocument();
    expect(screen.getByText(/add your Dexterity \(\+3\)/)).toBeInTheDocument();
  });

  it("fills in to hit and damage for a known weapon, including magic ones", async () => {
    getWeaponDetails.mockResolvedValue(dagger);
    const user = userEvent.setup();
    renderTab({ equipment: [] });

    await user.click(screen.getByRole("button", { name: "+ Add weapon" }));
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

    await user.click(screen.getByRole("button", { name: "+ Add weapon" }));
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

describe("the attack rows", () => {
  const bow = {
    index: "a1",
    name: "Wisteria's Kiss",
    baseWeapon: "Longbow",
    magicBonus: 2,
    toHit: 13,
    damage: "1d8+7",
    damageType: "Piercing",
    extraDamage: [{ dice: "1d4", type: "psychic", source: "Wisteria's Kiss", condition: "" }],
    notes: "",
  };

  it("says once how to roll, and shows Sharpshooter's Off/On in words with its trade", async () => {
    const onSharpshooterToggle = vi.fn();
    renderTab({
      attacks: [bow],
      sharpshooterFor: () => ({ on: false }),
      onSharpshooterToggle,
    });
    // How to roll is said once, behind "How attacks work" (not above the list).
    const how = screen.getByRole("button", { name: /How attacks work/ });
    expect(how).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/Roll to hit first/)).not.toBeVisible();
    await userEvent.click(how);
    expect(screen.getByText(/Roll to hit first/)).toBeVisible();
    expect(screen.getAllByText(/Roll to hit first/)).toHaveLength(1);
    // The Edit button shows a pencil and "Edit", and is still called "Edit attacks".
    expect(screen.getByRole("button", { name: "Edit attacks" })).toHaveTextContent(/^\s*Edit$/);
    // The Damage heading says the chips roll too.
    expect(screen.getByText("Roll after a hit")).toBeInTheDocument();
    // "Details" says whether the notes are open.
    expect(screen.queryByRole("button", { name: "Details" })).toBeNull();
    const switchButton = screen.getByRole("button", { name: "Sharpshooter for Wisteria's Kiss: off" });
    expect(switchButton).toHaveTextContent("Sharpshooter Off");
    expect(switchButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("−5 hit / +10 damage")).toBeInTheDocument();
    await userEvent.click(switchButton);
    expect(onSharpshooterToggle).toHaveBeenCalledTimes(1);
  });

  it("keeps on-hit damage in its own strip, not added to the weapon", () => {
    renderTab({
      attacks: [bow],
      onHitFeatures: [
        { key: "dreadful", name: "Dreadful Strikes", dice: "1d6", type: "psychic", note: "Each creature can take it once per turn." },
      ],
    });
    const strip = screen.getByText("Dreadful Strikes").closest("p");
    expect(strip).toHaveTextContent("+1d6 psychic");
    expect(strip).toHaveTextContent("Each creature can take it once per turn.");
    const row = screen.getByText("Wisteria's Kiss").closest(".character-sheet__attacks-row");
    expect(within(row).queryByText(/1d6/)).toBeNull();
  });
});

describe("damage buttons", () => {
  it("name the weapon, the dice and the type, one button per damage type", async () => {
    const { RollContext } = await import("../RollDock/rollContext");
    const { getEffectiveAttack } = await import("../../utils/combatEffects");
    const roller = { roll: vi.fn(), rollDamage: vi.fn() };
    render(
      <RollContext.Provider value={roller}>
        <CharacterSheetActionsTab
          attacks={[
            {
              index: "a1",
              name: "Moonpetal Bow",
              toHit: 13,
              damage: "1d8+7",
              damageType: "Piercing",
              extraDamage: [{ dice: "1d4", type: "psychic", source: "Moonpetal Bow", condition: "" }],
              notes: "Silver string",
            },
          ]}
          onAttackAdd={vi.fn()}
          onAttackUpdate={vi.fn()}
          onAttackRemove={vi.fn()}
          equipment={[]}
          abilityScores={{}}
          effectiveAttackFor={(attack) => getEffectiveAttack({}, attack)}
        />
      </RollContext.Provider>,
    );
    expect(screen.getByRole("button", { name: "Roll Moonpetal Bow attack, +13" })).toBeInTheDocument();
    const main = screen.getByRole("button", { name: "Roll Moonpetal Bow damage, piercing, 1d8+7" });
    await userEvent.click(screen.getByRole("button", { name: "Roll Moonpetal Bow extra damage, psychic, 1d4" }));
    expect(roller.rollDamage).toHaveBeenCalledWith("Moonpetal Bow extra damage, psychic", "1d4");
    await userEvent.click(main);
    expect(roller.rollDamage).toHaveBeenLastCalledWith("Moonpetal Bow damage, piercing", "1d8+7");

    const details = screen.getByRole("button", { name: "Details" });
    expect(details).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(details);
    expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute("aria-expanded", "true");
  });
});

// A small picture of each weapon before its name, from what the weapon is.
describe("weapon pictures", () => {
  // The name as shown: "Old Faithful 🎒" for a weapon from the inventory.
  const nameOf = (name) => screen.getByText((text, element) => element.classList.contains("character-sheet__item-label") && text.startsWith(name));
  const row = (name) => nameOf(name).closest(".character-sheet__attacks-row");
  const pictureIn = (name) => row(name).querySelector("svg.weapon-icon");
  const attack = (index, name, extra = {}) => ({ index, name, toHit: 5, damage: "1d6+3", damageType: "Piercing", ...extra });

  it("shows the weapon type's picture right before the name, renamed and +1 weapons included", () => {
    renderTab({
      attacks: [
        attack("a1", "Wisteria's Kiss", { baseWeapon: "Longbow", magicBonus: 2 }),
        attack("a2", "+1 Dagger"),
        attack("a3", "Crossbow, light"),
        attack("a4", "Light Crossbow"),
        attack("a5", "Frost Bow of Secrets"),
      ],
    });
    expect(pictureIn("Wisteria's Kiss")).toHaveAttribute("data-icon", "longbow");
    expect(pictureIn("+1 Dagger")).toHaveAttribute("data-icon", "dagger");
    expect(pictureIn("Crossbow, light")).toHaveAttribute("data-icon", "crossbow-light");
    expect(pictureIn("Light Crossbow")).toHaveAttribute("data-icon", "crossbow-light");
    // Unknown: the plain picture, not a guess from "Bow".
    expect(pictureIn("Frost Bow of Secrets")).toHaveAttribute("data-icon", "custom-weapon");
    // One picture per row, just before the name, in the same title line.
    expect(nameOf("Wisteria's Kiss").previousElementSibling).toBe(pictureIn("Wisteria's Kiss"));
    expect(row("Wisteria's Kiss").querySelectorAll("svg.weapon-icon")).toHaveLength(1);
  });

  it("uses a linked inventory weapon's type", () => {
    const item = { index: "item-9", name: "Old Faithful", baseWeapon: "Warhammer", wielded: true };
    renderTab({
      attacks: [attack("a1", "Old Faithful", { inventoryIndex: "item-9" })],
      linkedItemFor: (linked) => (linked.inventoryIndex === "item-9" ? item : null),
    });
    expect(pictureIn("Old Faithful")).toHaveAttribute("data-icon", "warhammer");
  });

  it("is decoration: hidden from screen readers, no tab stop, names unchanged", () => {
    renderTab({ attacks: [attack("a1", "Longbow")] });
    const picture = pictureIn("Longbow");
    expect(picture).toHaveAttribute("aria-hidden", "true");
    expect(picture).toHaveAttribute("focusable", "false");
    expect(picture.closest("button")).toBeNull();
    expect(picture).not.toHaveAttribute("tabindex");
    // The to-hit roll keeps its own "Roll" (and d20); the picture is only by the name.
    expect(within(row("Longbow")).getByText("Roll")).toBeInTheDocument();
    expect(within(row("Longbow")).getByText("Roll").closest(".character-sheet__resource-name")).toBeNull();
  });

  it("gives a spell typed in as an attack no weapon picture", () => {
    renderTab({ attacks: [attack("a1", "Fire Bolt"), attack("a2", "Dagger")], spellNames: ["Fire Bolt"] });
    expect(pictureIn("Fire Bolt")).toBeNull();
    expect(pictureIn("Dagger")).toHaveAttribute("data-icon", "dagger");
  });

  it("still shows every row when the weapon list can't be loaded", async () => {
    const api = await import("../../utils/api");
    api.getWeapons.mockRejectedValueOnce(new Error("offline"));
    renderTab({ attacks: [attack("a1", "Wisteria's Kiss", { baseWeapon: "Longbow" })] });
    expect(pictureIn("Wisteria's Kiss")).toHaveAttribute("data-icon", "longbow");
    expect(within(row("Wisteria's Kiss")).getByText("Roll")).toBeInTheDocument();
  });
});
