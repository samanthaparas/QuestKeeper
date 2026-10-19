import EditableItemList from "../EditableItemList/EditableItemList";
import SrdDetailDialog from "../SrdDetailDialog/SrdDetailDialog";
import { useSrdDetailView } from "../../hooks/useSrdDetailView";
import { useSrdEquipmentLookup } from "../../hooks/useSrdEquipmentLookup";
import {
  getAttunedCount,
  getInventoryCategory,
  INVENTORY_CATEGORIES,
  inventoryCategoryLabel,
  isWeaponItem,
  MAGIC_OPTIONS,
  magicChoiceFor,
  ITEM_RARITIES,
  ITEM_TYPES,
  RESET_OPTIONS,
  describeMagicItem,
  describeReset,
} from "../../utils/characterSheet";
import UsePips, { MAX_PIPS } from "../UsePips/UsePips";
import { RegainField } from "../CharacterSheetResourcesTab/CharacterSheetResourcesTab";

// "Magic item details" in the item editor, closed unless the item already
// has some: rarity, type, whether it needs attunement (and by whom), and
// charges. Charges can be new, or an existing resource taken over with the
// uses already spent. A plain item (rope, torches) never needs to open it.
// value: { rarity, itemType, requiresAttunement, attunementBy, chargesMax,
// chargesResetOn, chargesRegain, linkResourceId }.
function MagicItemFields({ value, onChange, freeResources }) {
  const details = value ?? {};
  const set = (key, next) => onChange({ ...details, [key]: next });
  const hasAny = Boolean(
    details.rarity || details.itemType || details.requiresAttunement || Number(details.chargesMax) > 0,
  );
  return (
    <details className="character-sheet__magic-details" open={hasAny || undefined}>
      <summary>Magic item details (optional)</summary>
      <div className="character-sheet__extra-damage-row">
        <label className="character-sheet__labeled-box">
          <span>Rarity</span>
          <select
            className="character-sheet__resource-form-select"
            value={details.rarity ?? ""}
            onChange={(event) => set("rarity", event.target.value)}
          >
            {ITEM_RARITIES.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity || "Not set"}
              </option>
            ))}
          </select>
        </label>
        <label className="character-sheet__labeled-box">
          <span>Item type</span>
          <input
            className="character-sheet__resource-form-input"
            list="magic-item-types"
            placeholder="Wand"
            value={details.itemType ?? ""}
            onChange={(event) => set("itemType", event.target.value)}
          />
          <datalist id="magic-item-types">
            {ITEM_TYPES.filter(Boolean).map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </label>
      </div>
      <div className="character-sheet__extra-damage-row">
        <label className="character-sheet__resource-form-check">
          <input
            type="checkbox"
            checked={Boolean(details.requiresAttunement)}
            onChange={(event) => set("requiresAttunement", event.target.checked)}
          />
          Requires attunement
        </label>
        {details.requiresAttunement && (
          <label className="character-sheet__labeled-box">
            <span>By (optional)</span>
            <input
              className="character-sheet__resource-form-input"
              placeholder="a ranger or druid"
              value={details.attunementBy ?? ""}
              onChange={(event) => set("attunementBy", event.target.value)}
            />
          </label>
        )}
      </div>
      <div className="character-sheet__extra-damage-row">
        <label className="character-sheet__labeled-box character-sheet__labeled-box--dice">
          <span>Charges</span>
          <input
            className="character-sheet__resource-form-input"
            type="number"
            min="0"
            placeholder="0"
            value={details.chargesMax ?? ""}
            disabled={Boolean(details.linkResourceId)}
            onChange={(event) => set("chargesMax", event.target.value)}
          />
        </label>
        {Number(details.chargesMax) > 0 && !details.linkResourceId && (
          <>
            <label className="character-sheet__labeled-box">
              <span>Recharge</span>
              <select
                className="character-sheet__resource-form-select"
                value={details.chargesResetOn ?? "dawn"}
                onChange={(event) => set("chargesResetOn", event.target.value)}
              >
                {RESET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <RegainField
              value={details.chargesRegain}
              onChange={(next) => set("chargesRegain", next)}
              resetOn={details.chargesResetOn ?? "dawn"}
            />
          </>
        )}
        {/* Already tracking it on the Resources tab? Take that one over. */}
        {!(Number(details.chargesMax) > 0) && freeResources.length > 0 && (
          <label className="character-sheet__labeled-box">
            <span>Or use a resource you have</span>
            <select
              className="character-sheet__resource-form-select"
              value={details.linkResourceId ?? ""}
              onChange={(event) => set("linkResourceId", event.target.value)}
            >
              <option value="">None</option>
              {freeResources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name} ({resource.current}/{resource.max})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </details>
  );
}
import { ExtraDamageEditor } from "../CharacterSheetActionsTab/CharacterSheetActionsTab";

// A weapon's setup in the item editor: what it is, its magic, extra damage,
// and whether it's equipped (which puts its attack on the Actions tab).
// Shown only for weapons. value: { baseWeapon, magic, extraDamage, wielded }.
function WeaponItemFields({ value, values, onChange }) {
  // known: the item was already a weapon when the editor opened.
  if (!value?.known && !isWeaponItem({ name: values.name, category: values.category })) return null;
  const weapon = value ?? {};
  const set = (key, next) => onChange({ ...weapon, [key]: next });
  return (
    <fieldset className="character-sheet__extra-damage-editor">
      <legend>Weapon</legend>
      <div className="character-sheet__extra-damage-row">
        <label className="character-sheet__labeled-box">
          <span>Weapon type</span>
          <input
            className="character-sheet__resource-form-input"
            placeholder="Longbow"
            value={weapon.baseWeapon ?? ""}
            onChange={(event) => set("baseWeapon", event.target.value)}
          />
        </label>
        <label className="character-sheet__labeled-box">
          <span>Magic</span>
          <select
            className="character-sheet__resource-form-select"
            value={weapon.magic ?? ""}
            onChange={(event) => set("magic", event.target.value)}
          >
            {MAGIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="character-sheet__resource-form-check">
          <input
            type="checkbox"
            checked={Boolean(weapon.wielded)}
            onChange={(event) => set("wielded", event.target.checked)}
          />
          Equipped (its attack shows on Actions)
        </label>
      </div>
      <ExtraDamageEditor
        value={weapon.extraDamage ?? []}
        onChange={(rows) => set("extraDamage", rows)}
        weaponName={values.name}
      />
    </fieldset>
  );
}

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
  // Weapons can be equipped too: their linked attacks then show on Actions
  // (see equipWeapon). linkedCountFor(item): how many attacks use it.
  // linkChoiceFor(item): the "an attack already matches" choice under the
  // item, or null.
  isWeapon = (item) => isWeaponItem(item),
  onWeaponEquipToggle = () => {},
  linkedCountFor = () => 0,
  linkChoiceFor = () => null,
  // A warning shown above the list (wearing two armors or two shields).
  armorWarning = null,
  // An item's charges: chargesFor(item) is its resource (or null),
  // freeResources the resources no item has yet, onChargesChange(id, n)
  // spends or restores them (the same resource the Resources tab shows).
  chargesFor = () => null,
  freeResources = [],
  onChargesChange = () => {},
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
    { key: "wielded", label: "Equipped weapons", match: (item) => Boolean(item.wielded) },
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
      {armorWarning}
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
            key: "weapon",
            type: "custom",
            defaultValue: {},
            fromItem: (item) => ({
              baseWeapon: item.baseWeapon ?? "",
              magic: magicChoiceFor(item),
              extraDamage: (item.extraDamage ?? []).map((row) => ({ ...row })),
              wielded: Boolean(item.wielded),
              known: isWeapon(item),
            }),
            render: (props) => <WeaponItemFields {...props} />,
          },
          {
            key: "magicDetails",
            type: "custom",
            defaultValue: {},
            fromItem: (item) => {
              const charges = chargesFor(item);
              return {
                rarity: item.rarity ?? "",
                itemType: item.itemType ?? "",
                requiresAttunement: Boolean(item.requiresAttunement),
                attunementBy: item.attunementBy ?? "",
                chargesMax: charges ? String(charges.max) : "",
                chargesResetOn: charges?.resetOn ?? "dawn",
                chargesRegain: charges?.regain ?? "",
              };
            },
            render: ({ value, onChange }) => (
              <MagicItemFields value={value} onChange={onChange} freeResources={freeResources} />
            ),
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
        removeConfirmText={(item) =>
          linkedCountFor(item) > 0
            ? `Remove "${item.name}" from your inventory? Its ${
                linkedCountFor(item) === 1 ? "attack stays" : `${linkedCountFor(item)} attacks stay`
              } on the Actions tab, no longer linked.`
            : null
        }
        rowPanel={(item) => linkChoiceFor(item)}
        // Under the name: what kind of magic item it is, whether it needs
        // attunement, and its charges to spend right here.
        primaryExtra={(item) => {
          const about = describeMagicItem(item);
          const charges = chargesFor(item);
          if (!about && !charges) return null;
          return (
            <span className="character-sheet__item-meta">
              {about && (
                <span>
                  {about}
                  {item.requiresAttunement ? (item.attuned ? " (attuned)" : " (not attuned yet)") : ""}
                </span>
              )}
              {charges && (
                <span className="character-sheet__item-charges">
                  <span className="character-sheet__item-charges-label">Charges</span>
                  {charges.max <= MAX_PIPS ? (
                    <UsePips
                      label={`${item.name} charges`}
                      current={charges.current}
                      max={charges.max}
                      onChange={(next) => onChargesChange(charges.id, next)}
                    />
                  ) : (
                    <span className="character-sheet__resource-count">
                      <input
                        type="number"
                        className="character-sheet__resource-input"
                        aria-label={`${item.name} charges left`}
                        value={charges.current}
                        min={0}
                        max={charges.max}
                        onChange={(event) => onChargesChange(charges.id, event.target.value)}
                      />
                      {" / "}
                      {charges.max}
                    </span>
                  )}
                  <span className="character-sheet__damage-type">{describeReset(charges)}</span>
                </span>
              )}
            </span>
          );
        }}
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
            {/* ⚔ Equipped as a weapon: its attacks show on Actions. */}
            {isWeapon(item) && !isArmor(item) && (
              <button
                type="button"
                className={`character-sheet__icon-toggle${
                  item.wielded ? " character-sheet__icon-toggle--on" : ""
                }`}
                aria-pressed={Boolean(item.wielded)}
                aria-label={`Equip ${item.name} as a weapon`}
                title={
                  item.wielded
                    ? `${item.name} is equipped${linkedCountFor(item) ? `: its attack${linkedCountFor(item) > 1 ? "s show" : " shows"} on Actions` : ""}. Tap to put it away.`
                    : `Equip ${item.name} so its attack shows on Actions`
                }
                onClick={() => onWeaponEquipToggle(item)}
              >
                ⚔
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
