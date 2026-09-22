import { useEffect, useState } from "react";
import EditableItemList from "../EditableItemList/EditableItemList";
import { getWeapons, getWeaponDetails } from "../../utils/api";
import { formatModifier } from "../../utils/characterSheet";

function CharacterSheetActionsTab({
  attacks,
  onAttackAdd,
  onAttackUpdate,
  onAttackRemove,
}) {
  const [allWeapons, setAllWeapons] = useState([]);

  useEffect(() => {
    getWeapons()
      .then(setAllWeapons)
      .catch(() => {
        // Autocomplete is a nice-to-have - freeform entry still works if this fails.
      });
  }, []);

  function getWeaponAutofill(name) {
    const match = allWeapons.find(
      (weapon) => weapon.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (!match) return null;

    return getWeaponDetails(match.index)
      .then((details) => {
        const isFinesse = (details.properties ?? []).some(
          (property) => property.name === "Finesse",
        );
        const toHitHint = isFinesse
          ? "Uses STR or DEX (Finesse)"
          : details.weapon_range === "Ranged"
            ? "Uses DEX"
            : "Uses STR";

        return {
          damage: details.damage?.damage_dice ?? "",
          damageType: details.damage?.damage_type?.name ?? "",
          toHitHint,
        };
      })
      .catch(() => null);
  }

  return (
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
          getHint: (values) => values.toHitHint || null,
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
      emptyText="No attacks recorded yet."
      addButtonLabel="Add Weapon"
      onAdd={onAttackAdd}
      onUpdate={onAttackUpdate}
      onRemove={onAttackRemove}
    />
  );
}

export default CharacterSheetActionsTab;
