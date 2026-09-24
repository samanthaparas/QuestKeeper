import { useEffect, useMemo, useState } from "react";
import EditableItemList from "../EditableItemList/EditableItemList";
import SrdDetailDialog from "../SrdDetailDialog/SrdDetailDialog";
import { useSrdDetailView } from "../../hooks/useSrdDetailView";
import {
  getEquipment,
  getEquipmentDetails,
  getMagicItems,
  getMagicItemDetails,
} from "../../utils/api";
import { getAttunedCount } from "../../utils/characterSheet";
import {
  createSrdNameLookup,
  formatEquipmentDetails,
  formatMagicItemDetails,
} from "../../utils/srdDetails";

function withSource(source) {
  return (entries) => entries.map((entry) => ({ ...entry, source }));
}

function loadItemDetails(match) {
  return match.source === "magic-items"
    ? getMagicItemDetails(match.index, match.edition).then(
        formatMagicItemDetails,
      )
    : getEquipmentDetails(match.index, match.edition).then(
        formatEquipmentDetails,
      );
}

function CharacterSheetInventoryTab({
  equipment,
  onEquipmentAdd,
  onEquipmentUpdate,
  onEquipmentRemove,
  onEquipmentAttuneToggle,
}) {
  const [srdItems, setSrdItems] = useState([]);
  const detailView = useSrdDetailView();

  useEffect(() => {
    Promise.allSettled([
      getEquipment("2014").then(withSource("equipment")),
      getMagicItems("2014").then(withSource("magic-items")),
      getEquipment("2024").then(withSource("equipment")),
      getMagicItems("2024").then(withSource("magic-items")),
    ]).then((results) =>
      setSrdItems(
        results.flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        ),
      ),
    );
  }, []);

  const findItemMatches = useMemo(
    () => createSrdNameLookup(srdItems),
    [srdItems],
  );

  function openItemDetails(item) {
    const matches = findItemMatches(item.name);
    detailView.open(matches[0].name, () =>
      Promise.all(matches.map(loadItemDetails)),
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
        emptyText="No equipment recorded yet."
        addButtonLabel="Add Item"
        onAdd={onEquipmentAdd}
        onUpdate={onEquipmentUpdate}
        onRemove={onEquipmentRemove}
        isNameClickable={(item) => findItemMatches(item.name).length > 0}
        onNameClick={openItemDetails}
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
      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </section>
  );
}

export default CharacterSheetInventoryTab;
