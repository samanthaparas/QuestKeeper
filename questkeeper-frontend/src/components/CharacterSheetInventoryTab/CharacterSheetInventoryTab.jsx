import EditableItemList from "../EditableItemList/EditableItemList";
import SrdDetailDialog from "../SrdDetailDialog/SrdDetailDialog";
import { useSrdDetailView } from "../../hooks/useSrdDetailView";
import { useSrdEquipmentLookup } from "../../hooks/useSrdEquipmentLookup";
import { getAttunedCount } from "../../utils/characterSheet";

function CharacterSheetInventoryTab({
  equipment,
  onEquipmentAdd,
  onEquipmentUpdate,
  onEquipmentRemove,
  onEquipmentAttuneToggle,
  onEquipmentProficientToggle,
}) {
  const equipmentLookup = useSrdEquipmentLookup();
  const detailView = useSrdDetailView();

  function openItemDetails(item) {
    const matches = equipmentLookup.findMatches(item.name);
    detailView.open(matches[0].name, () =>
      Promise.all(matches.map(equipmentLookup.loadDetails)),
    );
  }

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
        emptyText="Track what you carry: weapons, armor, potions and treasure. Tap Add Item to add your first thing. Weapons you add here can be turned into attacks on the Actions tab with one tap."
        addButtonLabel="Add Item"
        onAdd={onEquipmentAdd}
        onUpdate={onEquipmentUpdate}
        onRemove={onEquipmentRemove}
        isNameClickable={(item) =>
          equipmentLookup.findMatches(item.name).length > 0
        }
        onNameClick={openItemDetails}
        extraRowContent={(item) => (
          <>
            <button
              type="button"
              className={`character-sheet__attune-toggle${
                item.proficient ? " character-sheet__attune-toggle--active" : ""
              }`}
              aria-pressed={Boolean(item.proficient)}
              onClick={() =>
                onEquipmentProficientToggle(item.index, item.proficient)
              }
            >
              {item.proficient ? "✓ Proficient" : "Proficient?"}
            </button>
            <button
              type="button"
              className={`character-sheet__attune-toggle${
                item.attuned ? " character-sheet__attune-toggle--active" : ""
              }`}
              onClick={() => onEquipmentAttuneToggle(item.index, item.attuned)}
            >
              {item.attuned ? "★ Attuned" : "☆ Attune"}
            </button>
          </>
        )}
      />
      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </section>
  );
}

export default CharacterSheetInventoryTab;
