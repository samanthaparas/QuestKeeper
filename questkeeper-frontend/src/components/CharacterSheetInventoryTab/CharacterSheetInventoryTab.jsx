import EditableItemList from "../EditableItemList/EditableItemList";
import { getAttunedCount } from "../../utils/characterSheet";

function CharacterSheetInventoryTab({
  equipment,
  onEquipmentAdd,
  onEquipmentUpdate,
  onEquipmentRemove,
  onEquipmentAttuneToggle,
}) {
  return (
    <section className="character-sheet__section">
      <p className="character-sheet__attunement-summary">
        Attuned Items: {getAttunedCount(equipment)} / 3
      </p>
      <EditableItemList
        title="Equipment"
        items={equipment}
        getItemId={(item) => item.index}
        fields={[
          {
            key: "name",
            type: "text",
            placeholder: "Item name (e.g. Night Terror Longsword)",
          },
          {
            key: "quantity",
            type: "number",
            placeholder: "Qty",
            width: "small",
            min: 1,
            defaultValue: "1",
          },
          {
            key: "description",
            type: "textarea",
            placeholder: "Description (optional) - one line per bullet point",
          },
        ]}
        formatPrimaryLabel={(item) =>
          `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`
        }
        emptyText="No equipment recorded yet."
        addButtonLabel="Add Item"
        onAdd={onEquipmentAdd}
        onUpdate={onEquipmentUpdate}
        onRemove={onEquipmentRemove}
        extraRowContent={(item) => (
          <button
            type="button"
            className={`character-sheet__attune-toggle${
              item.attuned ? " character-sheet__attune-toggle--active" : ""
            }`}
            onClick={() => onEquipmentAttuneToggle(item.index, item.attuned)}
          >
            {item.attuned ? "★ Attuned" : "☆ Attune"}
          </button>
        )}
      />
    </section>
  );
}

export default CharacterSheetInventoryTab;
