import { useEffect, useState } from "react";
import EditableItemList from "../EditableItemList/EditableItemList";
import SrdDetailDialog from "../SrdDetailDialog/SrdDetailDialog";
import { useSrdDetailView } from "../../hooks/useSrdDetailView";
import { useSrdEquipmentLookup } from "../../hooks/useSrdEquipmentLookup";
import Button from "../Button/Button";
import { getWeapons, getWeaponDetails } from "../../utils/api";
import {
  buildStartingAttacks,
  describeToHitBasics,
  describeToHitMath,
  findInventoryWeapons,
  formatModifier,
  getWeaponAttackMath,
  splitMagicWeaponName,
} from "../../utils/characterSheet";

function CharacterSheetActionsTab({
  onAttack,
  attacks,
  onAttackAdd,
  onAttackUpdate,
  onAttackRemove,
  equipment = [],
  abilityScores,
  proficiencyNames = [],
  proficiencyBonus = 2,
}) {
  const [allWeapons, setAllWeapons] = useState([]);
  const [addingWeapon, setAddingWeapon] = useState(null);
  const [inventoryError, setInventoryError] = useState("");
  const equipmentLookup = useSrdEquipmentLookup();
  const detailView = useSrdDetailView();

  useEffect(() => {
    getWeapons()
      .then(setAllWeapons)
      .catch(() => {
        // Autocomplete is a nice-to-have - freeform entry still works if this fails.
      });
  }, []);

  // When the name is a known weapon (or a magic one like "+1 Longsword"),
  // fill in to hit and damage from the character's own scores and say how
  // the to-hit number was worked out.
  function getWeaponAutofill(name) {
    const { baseName, magicBonus } = splitMagicWeaponName(name);
    const match = allWeapons.find(
      (weapon) => weapon.name.toLowerCase() === baseName.toLowerCase(),
    );
    if (!match) return { toHitHint: "" };

    return getWeaponDetails(match.index)
      .then((details) => {
        const math = getWeaponAttackMath({
          weapon: details,
          scores: abilityScores,
          proficiencyNames,
          proficiencyBonus,
          magicBonus,
        });

        return {
          toHit: String(math.toHit),
          damage: math.damage,
          damageType: details.damage?.damage_type?.name ?? "",
          toHitHint: describeToHitMath(math),
        };
      })
      .catch(() => null);
  }

  const genericToHitHint = describeToHitBasics({
    scores: abilityScores,
    proficiencyBonus,
  });

  // One tap turns an inventory weapon into an attack, with to-hit and damage
  // worked out the same way character creation does it.
  function addFromInventory({ item, weapon }) {
    setAddingWeapon(weapon.index);
    setInventoryError("");

    getWeaponDetails(weapon.index)
      .then((details) => {
        const [attack] = buildStartingAttacks({
          gear: [{ ...details, quantity: item.quantity ?? 1 }],
          scores: abilityScores,
          proficiencyNames: item.proficient
            ? [...proficiencyNames, details.name]
            : proficiencyNames,
          proficiencyBonus,
        });
        if (attack) onAttackAdd(attack);
      })
      .catch(() => {
        setInventoryError(
          `Couldn't look up ${weapon.name} right now. Tap Add Weapon to type it in instead.`,
        );
      })
      .finally(() => setAddingWeapon(null));
  }

  const inventoryWeapons = findInventoryWeapons(equipment, allWeapons, attacks);

  const inventoryFooter =
    inventoryWeapons.length > 0 ? (
      <div className="character-sheet__inventory-weapons">
        <span className="character-sheet__inventory-weapons-label">
          From your inventory:
        </span>
        {inventoryWeapons.map((entry) => (
          <Button
            key={entry.weapon.index}
            variant="secondary"
            aria-label={`Add ${entry.weapon.name} as an attack`}
            disabled={addingWeapon !== null}
            onClick={() => addFromInventory(entry)}
          >
            {addingWeapon === entry.weapon.index
              ? "Adding..."
              : `+ ${entry.weapon.name}`}
          </Button>
        ))}
        {inventoryError && (
          <p className="character-sheet__inventory-weapons-error" role="alert">
            {inventoryError}
          </p>
        )}
      </div>
    ) : null;

  function openAttackDetails(attack) {
    const matches = equipmentLookup.findMatches(attack.name);
    detailView.open(matches[0].name, () =>
      Promise.all(matches.map(equipmentLookup.loadDetails)),
    );
  }

  return (
    <>
      <EditableItemList
        title="Attacks"
        items={attacks}
        getItemId={(item) => item.index}
        fields={[
          {
            key: "name",
            type: "text",
            label: "Weapon",
            placeholder: "Weapon name (e.g. Night Terror Longsword)",
            datalistId: "weapon-name-suggestions",
            datalistOptions: allWeapons.map((weapon) => weapon.name),
            getAutofill: getWeaponAutofill,
          },
          {
            key: "toHit",
            type: "number",
            placeholder: "To Hit",
            getHint: (values) => values.toHitHint || genericToHitHint,
          },
          {
            key: "damage",
            type: "text",
            placeholder: "Damage (e.g. 2d8+10)",
          },
          {
            key: "damageType",
            type: "text",
            placeholder: "Type (e.g. Slashing)",
          },
          {
            key: "notes",
            type: "textarea",
            placeholder: "Notes (optional) - one line per bullet point",
          },
        ]}
        columns={[
          {
            key: "toHit",
            label: "To Hit",
            width: "70px",
            format: (item) => formatModifier(item.toHit),
          },
          { key: "damage", label: "Damage", width: "100px" },
          { key: "damageType", label: "Type", width: "110px" },
        ]}
        emptyText="Weapons and other attacks go here. Tap Add Weapon and start typing a weapon's name: its damage fills in for you. Attack spells like Fire Bolt live on the Spells tab."
        footer={inventoryFooter}
        addButtonLabel="Add Weapon"
        rowAction={onAttack ? { label: "Attack", onClick: onAttack } : null}
        onAdd={onAttackAdd}
        onUpdate={onAttackUpdate}
        onRemove={onAttackRemove}
        isNameClickable={(attack) =>
          equipmentLookup.findMatches(attack.name).length > 0
        }
        onNameClick={openAttackDetails}
      />
      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </>
  );
}

export default CharacterSheetActionsTab;
