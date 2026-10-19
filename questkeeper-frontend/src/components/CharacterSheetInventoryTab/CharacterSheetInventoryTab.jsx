import EditableItemList from "../EditableItemList/EditableItemList";
import SrdDetailDialog from "../SrdDetailDialog/SrdDetailDialog";
import { useSrdDetailView } from "../../hooks/useSrdDetailView";
import { useSrdEquipmentLookup } from "../../hooks/useSrdEquipmentLookup";
import {
  getAttunedCount,
  getInventoryCategory,
  INVENTORY_CATEGORIES,
  inventoryCategoryLabel,
} from "../../utils/characterSheet";

const ORDER = INVENTORY_CATEGORIES.map((category) => category.key);

function CharacterSheetInventoryTab({
  equipment,
  onEquipmentAdd,
  onEquipmentUpdate,
  onEquipmentRemove,
  onEquipmentAttuneToggle,
  onEquipmentProficientToggle,
  // Armor and shields can be equipped; their AC then counts on the sheet.
  isArmor = () => false,
  onEquipToggle = () => {},
  // An item's category: the one picked, or a guess (see getInventoryCategory).
  categoryOf = (item) => getInventoryCategory(item),
}) {
  const equipmentLookup = useSrdEquipmentLookup();
  const detailView = useSrdDetailView();

  function openItemDetails(item) {
    const matches = equipmentLookup.findMatches(item.name);
    detailView.open(matches[0].name, () =>
      Promise.all(matches.map(equipmentLookup.loadDetails)),
    );
  }

  // Attuned items first, so the magic you're bonded to is always on top.
  const sortedEquipment = [
    ...equipment.filter((item) => item.attuned),
    ...equipment.filter((item) => !item.attuned),
  ];

  // Sort: by category (the default, with a heading over each), A to Z, most
  // first, or as added. Show: one category, or what's attuned, worn or
  // proficient.
  const categoryLabel = (item) => inventoryCategoryLabel(categoryOf(item));
  const sortOptions = [
    {
      key: "category",
      label: "Category",
      // Attuned items first within their category.
      compare: (a, b) =>
        ORDER.indexOf(categoryOf(a)) - ORDER.indexOf(categoryOf(b)) ||
        Number(Boolean(b.attuned)) - Number(Boolean(a.attuned)),
      groupOf: categoryLabel,
    },
    { key: "name", label: "Name (A–Z)", compare: () => 0 },
    { key: "quantity", label: "Quantity (most first)", compare: (a, b) => (b.quantity ?? 1) - (a.quantity ?? 1) },
    { key: "added", label: "Order added" },
  ];
  const filterOptions = [
    ...INVENTORY_CATEGORIES.map((category) => ({
      key: `category:${category.key}`,
      label: category.label,
      match: (item) => categoryOf(item) === category.key,
    })),
    { key: "attuned", label: "Attuned", match: (item) => Boolean(item.attuned) },
    { key: "worn", label: "Wearing (armor)", match: (item) => Boolean(item.equipped) },
    { key: "proficient", label: "Proficient", match: (item) => Boolean(item.proficient) },
  ];

  return (
    <section className="character-sheet__section">
      {/* If the item look-up can't reach the rules server, say so (item names
          can't link to their details and armor isn't recognised), with a retry. */}
      {equipmentLookup.status === "failed" && (
        <p className="character-sheet__lookup-notice" role="status">
          Couldn&apos;t look up item details right now, so names can&apos;t open their descriptions and armor
          won&apos;t count toward your AC yet. The rules server may be waking up.{" "}
          <button type="button" className="character-sheet__lookup-retry" onClick={equipmentLookup.retry}>
            Try again
          </button>
        </p>
      )}
      <p className="character-sheet__attunement-summary">
        Attuned Items: {getAttunedCount(equipment)} / 3
      </p>
      <EditableItemList
        title="Inventory"
        items={sortedEquipment}
        viewKey="inventory"
        sortOptions={sortOptions}
        filterOptions={filterOptions}
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
            // Left on "Guess for me", the sheet guesses from the name.
            key: "category",
            type: "select",
            defaultValue: "",
            options: [
              { value: "", label: "Category: guess for me" },
              ...INVENTORY_CATEGORIES.map((category) => ({ value: category.key, label: category.label })),
            ],
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
        hasEditToggle
        onAdd={onEquipmentAdd}
        onUpdate={onEquipmentUpdate}
        onRemove={onEquipmentRemove}
        isNameClickable={(item) =>
          equipmentLookup.findMatches(item.name).length > 0
        }
        onNameClick={openItemDetails}
        extraRowContent={(item) => (
          <>
            {/* 🛡 Wearing it: equipped armor and shields set the AC. */}
            {isArmor(item) && (
              <button
                type="button"
                className={`character-sheet__icon-toggle${
                  item.equipped ? " character-sheet__icon-toggle--on" : ""
                }`}
                aria-pressed={Boolean(item.equipped)}
                aria-label={`Wearing ${item.name}`}
                title={
                  item.equipped
                    ? `Wearing ${item.name}. Your AC counts it.`
                    : `Put on ${item.name} so your AC counts it`
                }
                onClick={() => onEquipToggle(item.index, item.equipped)}
              >
                🛡
              </button>
            )}
            {/* "P" like the Skills list's proficiency dots; ★ for attunement.
                Hover (or a screen reader) says which item and what it does. */}
            <button
              type="button"
              className={`character-sheet__icon-toggle${
                item.proficient ? " character-sheet__icon-toggle--on" : ""
              }`}
              aria-pressed={Boolean(item.proficient)}
              aria-label={`Proficient with ${item.name}`}
              title={item.proficient ? `Proficient with ${item.name}` : `Not proficient with ${item.name}. Tap if you are.`}
              onClick={() =>
                onEquipmentProficientToggle(item.index, item.proficient)
              }
            >
              P
            </button>
            <button
              type="button"
              className={`character-sheet__icon-toggle character-sheet__icon-toggle--star${
                item.attuned ? " character-sheet__icon-toggle--on" : ""
              }`}
              aria-pressed={Boolean(item.attuned)}
              aria-label={`Attuned to ${item.name}`}
              title={item.attuned ? `Attuned to ${item.name}` : `Attune to ${item.name} (up to 3 items)`}
              onClick={() => onEquipmentAttuneToggle(item.index, item.attuned)}
            >
              {item.attuned ? "★" : "☆"}
            </button>
          </>
        )}
      />
      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </section>
  );
}

export default CharacterSheetInventoryTab;
