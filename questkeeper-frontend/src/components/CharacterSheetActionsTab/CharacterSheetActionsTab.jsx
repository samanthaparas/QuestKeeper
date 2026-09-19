import EditableItemList from "../EditableItemList/EditableItemList";
import { formatModifier } from "../../utils/characterSheet";

function CharacterSheetActionsTab({
  attacks,
  onAttackAdd,
  onAttackUpdate,
  onAttackRemove,
}) {
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
        },
        { key: "toHit", type: "number", placeholder: "To Hit" },
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
