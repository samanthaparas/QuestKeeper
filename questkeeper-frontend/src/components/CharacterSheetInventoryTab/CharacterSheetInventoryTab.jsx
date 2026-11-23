import { useRef, useState } from "react";
import EditableItemList from "../EditableItemList/EditableItemList";
import Button from "../Button/Button";
import GiftBox from "../GiftBox/GiftBox";
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
  describeRecovery,
  formatModifier,
  itemSpellNumbers,
} from "../../utils/characterSheet";
import RollButton from "../RollDock/RollButton";
import InventoryIcon from "../InventoryIcon/InventoryIcon";
import ControlIcon from "../ControlIcon/ControlIcon";
import { inventoryCategoryIconId, inventoryFilterIconId } from "../../utils/inventoryIcons";

// "Save DC" or "Spell attack" in the editor: not used, the item's own
// number, or the wielder's own (worked out from their spellcasting).
function ItemNumberField({ label, mode, value, onMode, onValue, placeholder }) {
  return (
    <span className="character-sheet__item-number">
      <label className="character-sheet__labeled-box">
        <span>{label}</span>
        <select
          className="character-sheet__resource-form-select"
          value={mode ?? ""}
          onChange={(event) => onMode(event.target.value)}
        >
          <option value="">Not used</option>
          <option value="fixed">Its own number</option>
          <option value="mine">Use mine</option>
        </select>
      </label>
      {mode === "fixed" && (
        <label className="character-sheet__labeled-box character-sheet__labeled-box--dice">
          <span>Number</span>
          <input
            className="character-sheet__resource-form-input"
            type="number"
            placeholder={placeholder}
            value={value ?? ""}
            onChange={(event) => onValue(event.target.value)}
          />
        </label>
      )}
    </span>
  );
}
import UseCounter from "../UseCounter/UseCounter";
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
    details.rarity ||
      details.itemType ||
      details.requiresAttunement ||
      Number(details.chargesMax) > 0 ||
      details.saveDcMode ||
      details.attackMode ||
      Number(details.spellDcBonus) > 0 ||
      Number(details.spellAttackBonus) > 0,
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
      {/* Raises the wielder's own spell save DC / spell attack (Moon
          Sickle: +1 and +1), while attuned if it needs attunement. */}
      <div className="character-sheet__extra-damage-row">
        <label className="character-sheet__labeled-box character-sheet__labeled-box--dice">
          <span>+ to your spell save DC</span>
          <input
            className="character-sheet__resource-form-input"
            type="number"
            min="0"
            max="5"
            placeholder="0"
            value={details.spellDcBonus ?? ""}
            onChange={(event) => set("spellDcBonus", event.target.value)}
          />
        </label>
        <label className="character-sheet__labeled-box character-sheet__labeled-box--dice">
          <span>+ to your spell attack</span>
          <input
            className="character-sheet__resource-form-input"
            type="number"
            min="0"
            max="5"
            placeholder="0"
            value={details.spellAttackBonus ?? ""}
            onChange={(event) => set("spellAttackBonus", event.target.value)}
          />
        </label>
      </div>

      {/* Its spells' save DC and attack: its own, or the wielder's. */}
      <div className="character-sheet__extra-damage-row">
        <ItemNumberField
          label="Save DC"
          mode={details.saveDcMode}
          value={details.saveDcValue}
          placeholder="15"
          onMode={(next) => set("saveDcMode", next)}
          onValue={(next) => set("saveDcValue", next)}
        />
        <ItemNumberField
          label="Spell attack"
          mode={details.attackMode}
          value={details.attackValue}
          placeholder="+7"
          onMode={(next) => set("attackMode", next)}
          onValue={(next) => set("attackValue", next)}
        />
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

// A small check mark drawn on a control that's on, so "on" never rests on
// colour alone (the words change too: Equip -> Equipped).
function CheckMark() {
  return (
    <svg className="inventory-toggle__check" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// One of an item's controls: a drawn picture and a short word ("Equip",
// "Equipped" once on, with a check). Its name for screen readers is the
// word plus the item ("Equipped Longsword", "Proficient with Chain Mail"),
// and aria-pressed says on or off. The tooltip (title) adds a little more for mouse users; the same
// explanations are in "What do these controls do?" for everyone.
function InventoryToggle({ icon, on, offText, onText = offText, joiner = "", itemName, title, onClick }) {
  const word = on ? onText : offText;
  return (
    <button
      type="button"
      className={`inventory-toggle${on ? " inventory-toggle--on" : ""}`}
      aria-pressed={on}
      // Starts with the word on screen, then says which item.
      aria-label={[word, joiner, itemName].filter(Boolean).join(" ")}
      title={title}
      onClick={onClick}
    >
      <ControlIcon name={icon} />
      <span className="inventory-toggle__text">{word}</span>
      {on && <CheckMark />}
    </button>
  );
}

// "What do these controls do?": once, by the Sort and Show controls,
// closed until opened. Each line says what the control really does here
// (the controls themselves are under each item's Manage).
function InventoryControlsHelp() {
  const [open, setOpen] = useState(false);
  return (
    <span className="inventory-help">
      <button
        type="button"
        className="character-sheet__jump-link inventory-help__toggle"
        aria-expanded={open}
        aria-controls="inventory-controls-help"
        onClick={() => setOpen((value) => !value)}
      >
        <ControlIcon name="help" size={18} />
        What do these controls do? <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      <span id="inventory-controls-help" className="inventory-help__text" hidden={!open}>
        <span>
          <ControlIcon name="favorite" size={18} />
          <span>
            <strong>Favourite:</strong> keeps the item near the top of the list.
          </span>
        </span>
        <span>
          <ControlIcon name="equip-weapon" size={18} />
          <span>
            <strong>Equip</strong> a weapon: its attack shows on the Actions tab (putting it away keeps the attack).
          </span>
        </span>
        <span>
          <ControlIcon name="wear-armor" size={18} />
          <span>
            <strong>Wear</strong> armor or <strong>Equip</strong> a shield: it counts toward your AC while AC is
            worked out automatically.
          </span>
        </span>
        <span>
          <ControlIcon name="proficient" size={18} />
          <span>
            <strong>Proficient</strong> (weapons): records training your character already has. It doesn&apos;t
            grant it.
          </span>
        </span>
        <span>
          <ControlIcon name="attune" size={18} />
          <span>
            <strong>Attune:</strong> tracks your bond with a magic item (up to 3), separate from equipping or
            favouriting it. It shows for items marked &ldquo;Requires attunement&rdquo; (Edit item, then Magic item
            details).
          </span>
        </span>
        <span>
          <ControlIcon name="edit" size={18} />
          <span>
            <strong>Manage</strong> on each item also has Edit item, Split stack (for a stack), Give… (at a table) and
            Delete item.
          </span>
        </span>
      </span>
    </span>
  );
}

// "Split" under a stack of 2 or more: how many to move into a stack of their
// own (to hand some to a friend, or keep a few apart). The new stack is a copy
// that starts unequipped and unattuned.
function SplitForm({ item, onSplit, onCancel, id }) {
  const total = Number(item.quantity) || 0;
  const [amount, setAmount] = useState(String(Math.floor(total / 2)));
  const count = Number(amount);
  const isValid = Number.isInteger(count) && count >= 1 && count < total;
  return (
    <form
      id={id}
      className="character-sheet__split inventory-task"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isValid) return;
        onSplit(count);
      }}
    >
      <label>
        Move
        <input
          type="number"
          className="character-sheet__resource-input"
          aria-label={`How many ${item.name} to split off`}
          min={1}
          max={total - 1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        of {total} into their own stack
      </label>
      <Button type="submit" variant="secondary" disabled={!isValid}>
        Split
      </Button>
      <button type="button" className="character-sheet__split-open" onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

// "Give…" from an item's Manage panel, when the character is at a table
// with other players: who to give it to, and how many. The item then waits
// in their gift box until they take it. Nothing is sent until Give.
function GiveForm({ item, receivers, onGive, onCancel, onDone, id }) {
  const total = Number(item.quantity) || 1;
  const [to, setTo] = useState(receivers[0]?.userId ?? "");
  const [amount, setAmount] = useState(String(total));
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const count = Number(amount);
  const isValid = Boolean(to) && Number.isInteger(count) && count >= 1 && count <= total;
  return (
    <form
      id={id}
      className="character-sheet__split inventory-task"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!isValid) return;
        setError("");
        setIsBusy(true);
        try {
          await onGive(item, to, count);
          onDone(count >= total);
        } catch (failure) {
          setError(failure?.message ?? "Couldn't give that. Try again in a moment.");
          setIsBusy(false);
        }
      }}
    >
      <label>
        Give to
        <select aria-label={`Who to give ${item.name} to`} value={to} onChange={(event) => setTo(event.target.value)}>
          {receivers.map((person) => (
            <option key={person.userId} value={person.userId}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      {total > 1 && (
        <label>
          How many
          <input
            type="number"
            className="character-sheet__resource-input"
            aria-label={`How many ${item.name} to give`}
            min={1}
            max={total}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
      )}
      <Button type="submit" variant="secondary" disabled={!isValid || isBusy}>
        {isBusy ? "Giving…" : "Give"}
      </Button>
      <button type="button" className="character-sheet__split-open" onClick={onCancel} disabled={isBusy}>
        Cancel
      </button>
      {error && (
        <span className="gift-box__error" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}

// One of an item's actions in its Manage panel: a picture and words.
function ItemAction({ icon, children, label, danger = false, ...props }) {
  return (
    <button
      type="button"
      className={`inventory-action${danger ? " inventory-action--danger" : ""}`}
      aria-label={label}
      {...props}
    >
      <ControlIcon name={icon} />
      <span>{children}</span>
    </button>
  );
}

function CharacterSheetInventoryTab({
  equipment,
  onEquipmentAdd,
  onEquipmentUpdate,
  onEquipmentRemove,
  onEquipmentAttuneToggle,
  onEquipmentProficientToggle,
  // ♥ Favourites: these items are pinned to the top of the list.
  onEquipmentFavoriteToggle = null,
  // Split a stack: onEquipmentSplit(item, amount) moves that many into a new row.
  onEquipmentSplit = null,
  // Giving to another player at the table: who can be given to
  // ([{ userId, name }]) and onGiveItem(item, toUserId, amount).
  giftReceivers = [],
  onGiveItem = null,
  // The gift box: { incoming, outgoing } and its three buttons.
  gifts = null,
  onTakeGift = null,
  onReturnGift = null,
  onCancelGift = null,
  // Armor and shields can be equipped; their AC then counts on the sheet.
  isArmor = () => false,
  // Shields say "Equip"; other armor says "Wear".
  isShield = () => false,
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
  // The character's own { saveDc, spellAttack } for "Use mine" items, or
  // null when they don't cast spells.
  mySpellNumbers = null,
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
      // The category's picture before its heading, from the same category
      // the heading uses (decoration only).
      groupIconOf: (item) => <InventoryIcon name={inventoryCategoryIconId(categoryOf(item))} />,
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

  // Under an item's name: what kind of magic item it is, whether it needs
  // attunement, its spells' numbers, and its charges to spend right here.
  // Manage: one item's controls open at a time, under that item. Remembered
  // by the item's own index, so sorting or filtering keeps it with the
  // same item; if the item is gone (removed, given away), nothing is open.
  const [manageOpen, setManageOpen] = useState(null);
  const openManage = equipment.some((item) => item.index === manageOpen) ? manageOpen : null;
  // One task at a time inside the open panel: "split" or "give" (editing
  // uses the list's own editor, which takes the item's place).
  const [task, setTask] = useState(null);
  const openTask = task && task.index === openManage ? task.kind : null;
  // Where focus goes if a gift takes the whole item (worked out before
  // sending, while the item is still on the list).
  const giveNeighbour = useRef(null);
  function chooseManage(index) {
    setManageOpen(index);
    setTask(null);
  }

  // Ids for an item's Manage button and actions, by its own index (not its
  // place in the list), so focus finds the same item after a sort or split.
  const manageId = (index) => `inventory-manage-${index}`;
  function focusSoon(id, fallbackId = null) {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(id) ?? (fallbackId && document.getElementById(fallbackId));
      target?.focus();
    });
  }
  // The item's neighbour in the list as shown (for focus after it goes).
  function neighbourOf(index) {
    const buttons = [...document.querySelectorAll(".inventory-section .inventory-manage")];
    const at = buttons.findIndex((button) => button.id === `${manageId(index)}-button`);
    return (buttons[at + 1] ?? buttons[at - 1])?.id ?? null;
  }
  // After an item goes (deleted, or all of it given away): its neighbour's
  // Manage (worked out before it went), or Add Item when it was the last.
  function focusNeighbour(next) {
    window.requestAnimationFrame(() => {
      const target =
        (next && document.getElementById(next)) ??
        document.querySelector(".inventory-section .character-sheet__section-header-actions button:last-child");
      target?.focus();
    });
  }

  // An item's controls, in order: Wear/Equip (armor or shield) or Equip
  // (weapon), then Proficient and Attune. The same handlers as always;
  // which controls an item gets hasn't changed.
  function controlsFor(item) {
    const controls = [];
    if (isArmor(item)) {
      const shield = isShield(item);
      controls.push({
        key: "equip",
        icon: "wear-armor",
        on: Boolean(item.equipped),
        offText: shield ? "Equip" : "Wear",
        onText: shield ? "Equipped" : "Wearing",
        title: item.equipped
          ? `${shield ? "Using" : "Wearing"} ${item.name}. Your AC counts it.`
          : `${shield ? "Equip" : "Put on"} ${item.name} so your AC counts it`,
        onClick: () => onEquipToggle(item.index, item.equipped),
      });
    } else if (isWeapon(item)) {
      controls.push({
        key: "equip",
        icon: "equip-weapon",
        on: Boolean(item.wielded),
        offText: "Equip",
        onText: "Equipped",
        title: item.wielded
          ? `${item.name} is equipped${linkedCountFor(item) ? `: its attack${linkedCountFor(item) > 1 ? "s show" : " shows"} on Actions` : ""}. Tap to put it away.`
          : `Equip ${item.name} so its attack shows on Actions`,
        onClick: () => onWeaponEquipToggle(item),
      });
    }
    // Proficient: for weapons (it counts in their attack numbers), or
    // whenever it's already on, so a saved choice can always be changed.
    const showProficient = (isWeapon(item) && !isArmor(item)) || Boolean(item.proficient);
    // Attune: for items marked "Requires attunement", or already attuned.
    const showAttune = Boolean(item.requiresAttunement) || Boolean(item.attuned);
    if (showProficient) controls.push({
      key: "proficient",
      icon: "proficient",
      on: Boolean(item.proficient),
      offText: "Proficient",
      joiner: "with",
      title: item.proficient ? `Proficient with ${item.name}` : `Not proficient with ${item.name}. Tap if you are.`,
      onClick: () => onEquipmentProficientToggle(item.index, item.proficient),
    });
    if (showAttune) controls.push({
      key: "attune",
      icon: "attune",
      on: Boolean(item.attuned),
      offText: "Attune",
      onText: "Attuned",
      joiner: "to",
      title: item.attuned ? `Attuned to ${item.name}` : `Attune to ${item.name} (up to 3 items)`,
      onClick: () => onEquipmentAttuneToggle(item.index, item.attuned),
    });
    return controls;
  }

  // "Equipped · Proficient · Attuned": just the ones that are on.
  const activeSummary = (item) =>
    controlsFor(item)
      .filter((control) => control.on)
      .map((control) => control.onText ?? control.offText)
      .join(" · ");

  function itemMeta(item) {
    const about = describeMagicItem(item);
    // (Its charges have their own column; see extraRowContent.)
    // Its spells' DC and attack, worked out now ("Use mine" follows
    // the character), with the attack as a roll.
    const numbers = itemSpellNumbers(item, mySpellNumbers);
    const usesMineButNone = (item.saveDc === "mine" || item.spellAttack === "mine") && !mySpellNumbers;
    const hasNumbers = numbers.saveDc !== null || numbers.spellAttack !== null || usesMineButNone;
    // What it adds to your own spells, and whether it counts right now.
    const bonusText = [
      item.spellAttackBonus ? `+${item.spellAttackBonus} spell attack` : "",
      item.spellDcBonus ? `+${item.spellDcBonus} spell save DC` : "",
    ]
      .filter(Boolean)
      .join(", ");
    const bonusCounts = !item.requiresAttunement || item.attuned;
    if (!about && !hasNumbers && !bonusText) return null;
    return (
      <span className="character-sheet__item-meta">
        {about && (
          <span>
            {about}
            {item.requiresAttunement ? (item.attuned ? " (attuned)" : " (not attuned yet)") : ""}
          </span>
        )}
        {bonusText && (
          <span>
            {bonusText}
            {bonusCounts ? " (counted in your spells)" : " (counts once attuned)"}
          </span>
        )}
        {hasNumbers && (
          <span className="character-sheet__item-charges">
            {numbers.saveDc !== null && <span className="character-sheet__item-charges-label">DC {numbers.saveDc}</span>}
            {numbers.spellAttack !== null && (
              <RollButton label={`${item.name} spell attack`} bonus={numbers.spellAttack}>
                {formatModifier(numbers.spellAttack)} to hit
              </RollButton>
            )}
            {usesMineButNone && <span>Uses your spellcasting (none set)</span>}
          </span>
        )}
      </span>
    );
  }

  return (
    <section className="character-sheet__section inventory-section use-tracker-layout">
      {/* Gifts from (and to) other players at the table. */}
      {gifts && <GiftBox gifts={gifts} onTake={onTakeGift} onReturn={onReturnGift} onCancel={onCancelGift} />}

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
        isFavorite={(item) => Boolean(item.favorite)}
        onToggleFavorite={onEquipmentFavoriteToggle}
        sortOptions={sortOptions}
        filterOptions={filterOptions}
        // The chosen Show filter's picture beside the select (none for
        // Favourites, which says ♥ itself).
        // One "What do these controls do?" by Sort and Show, for every row.
        controlsExtra={<InventoryControlsHelp />}
        filterIconFor={(key) => {
          const id = inventoryFilterIconId(key);
          return id ? <InventoryIcon name={id} /> : null;
        }}
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
                saveDcMode: item.saveDc === "mine" ? "mine" : typeof item.saveDc === "number" ? "fixed" : "",
                saveDcValue: typeof item.saveDc === "number" ? String(item.saveDc) : "",
                attackMode: item.spellAttack === "mine" ? "mine" : typeof item.spellAttack === "number" ? "fixed" : "",
                attackValue: typeof item.spellAttack === "number" ? String(item.spellAttack) : "",
                spellDcBonus: item.spellDcBonus ? String(item.spellDcBonus) : "",
                spellAttackBonus: item.spellAttackBonus ? String(item.spellAttackBonus) : "",
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
        // No list-wide Edit mode here: each item's Manage has Edit item and
        // Delete item. Typed changes aren't thrown away without asking.
        rowActionsInContent
        protectUnsavedEdits
        onEditClose={(index) => focusSoon(`${manageId(index)}-edit`, `${manageId(index)}-button`)}
        onAdd={onEquipmentAdd}
        onUpdate={onEquipmentUpdate}
        onRemove={onEquipmentRemove}
        // Says when it's the whole stack, and what happens to linked attacks.
        removeConfirmText={(item) => {
          const count = Number(item.quantity) || 1;
          const what = count > 1 ? `all ${count} of "${item.name}" (the whole stack)` : `"${item.name}"`;
          const attacks = linkedCountFor(item);
          const linked =
            attacks > 0
              ? ` Its ${attacks === 1 ? "attack stays" : `${attacks} attacks stay`} on the Actions tab, no longer linked.`
              : "";
          return `Delete ${what} from your inventory? This can't be undone.${linked}`;
        }}
        rowPanel={(item) => linkChoiceFor(item)}
        // Under the name: the item's details (itemMeta), and Split for a stack.
        primaryExtra={(item) => (
          <>
            {/* What's on, in quiet words (nothing when nothing is on). */}
            {activeSummary(item) && <span className="inventory-state-summary">{activeSummary(item)}</span>}
            {itemMeta(item)}
          </>
        )}
        isNameClickable={(item) =>
          equipmentLookup.findMatches(item.name).length > 0
        }
        onNameClick={openItemDetails}
        extraRowContent={(item, { startEdit, requestRemove }) => {
          const charges = chargesFor(item);
          const isOpen = openManage === item.index;
          const panelId = manageId(item.index);
          const controls = isOpen ? controlsFor(item) : [];
          const canSplit = Boolean(onEquipmentSplit) && Number(item.quantity) > 1;
          const canGive = Boolean(onGiveItem) && giftReceivers.length > 0;
          // Opens a task (split or give) in place of any other, or closes it.
          function toggleTask(kind) {
            const next = openTask === kind ? null : kind;
            setTask(next ? { index: item.index, kind } : null);
            // Into the form's first box (the form itself can't take focus).
            if (next) {
              window.requestAnimationFrame(() =>
                document.getElementById(`${panelId}-${kind}-form`)?.querySelector("input, select")?.focus(),
              );
            }
          }
          function closeTask(kind) {
            setTask(null);
            focusSoon(`${panelId}-${kind}`, `${panelId}-button`);
          }
          return (
            <>
              {/* Its charges in their own column (wide sheets), right here
                  outside Manage so spending one stays quick: − 7 / 10 +,
                  then where they come back from. The same resource as on
                  the Resources tab. */}
              {charges && (
                <span className="inventory-charges">
                  <UseCounter
                    name={item.name}
                    unit="charge"
                    title="Charges"
                    current={charges.current}
                    max={charges.max}
                    editable={charges.max > 12}
                    aligned
                    showDepleted={false}
                    onChange={(next) => onChargesChange(charges.id, next)}
                  />
                  <span className="use-tracker-notes">
                    <span>{describeRecovery(charges)}</span>
                    {Number(charges.max) > 0 && Number(charges.current) <= 0 && (
                      <span className="use-tracker-notes__depleted">Depleted</span>
                    )}
                  </span>
                </span>
              )}
              {/* Manage ▾: opens this item's controls and actions under it.
                  Opening it changes nothing about the item. */}
              <button
                type="button"
                id={`${panelId}-button`}
                className={`inventory-manage${isOpen ? " inventory-manage--open" : ""}`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-label={`Manage ${item.name}`}
                onClick={() => chooseManage(isOpen ? null : item.index)}
              >
                Manage
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                  <path
                    d={isOpen ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {/* The panel, under the item. Hidden (and out of the Tab
                  order) until Manage is opened; it stays open while the
                  player changes several things. Escape closes an open task
                  first, then the panel. */}
              <div
                id={panelId}
                className="inventory-manage-panel"
                role="group"
                aria-label={`${item.name}: controls and actions`}
                hidden={!isOpen}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  event.preventDefault();
                  if (openTask) {
                    closeTask(openTask);
                    return;
                  }
                  chooseManage(null);
                  document.getElementById(`${panelId}-button`)?.focus();
                }}
              >
                {isOpen && (
                  <>
                    {controls.length > 0 && (
                      <span className="inventory-manage-panel__controls">
                        {controls.map(({ key, ...control }) => (
                          <InventoryToggle key={key} itemName={item.name} {...control} />
                        ))}
                      </span>
                    )}
                    {/* The item's own actions, quieter, under the controls. */}
                    <span className="inventory-actions">
                      <ItemAction
                        icon="edit"
                        id={`${panelId}-edit`}
                        label={`Edit ${item.name}`}
                        onClick={() => {
                          setTask(null);
                          // The list's own editor takes the item's place;
                          // Save or Cancel brings focus back here.
                          if (startEdit()) {
                            window.requestAnimationFrame(() =>
                              document.querySelector(".inventory-section .character-sheet__inline-edit input")?.focus(),
                            );
                          }
                        }}
                      >
                        Edit item
                      </ItemAction>
                      {canSplit && (
                        <ItemAction
                          icon="split-stack"
                          id={`${panelId}-split`}
                          label={`Split stack of ${item.name}`}
                          aria-expanded={openTask === "split"}
                          aria-controls={openTask === "split" ? `${panelId}-split-form` : undefined}
                          onClick={() => toggleTask("split")}
                        >
                          Split stack
                        </ItemAction>
                      )}
                      {canGive && (
                        <ItemAction
                          icon="give"
                          id={`${panelId}-give`}
                          label={`Give ${item.name}…`}
                          aria-expanded={openTask === "give"}
                          aria-controls={openTask === "give" ? `${panelId}-give-form` : undefined}
                          onClick={() => toggleTask("give")}
                        >
                          Give…
                        </ItemAction>
                      )}
                      <ItemAction
                        icon="delete"
                        id={`${panelId}-delete`}
                        label={`Delete ${item.name}`}
                        danger
                        onClick={() => {
                          const next = neighbourOf(item.index);
                          if (requestRemove()) focusNeighbour(next);
                        }}
                      >
                        Delete item
                      </ItemAction>
                    </span>
                    {openTask === "split" && canSplit && (
                      <SplitForm
                        id={`${panelId}-split-form`}
                        item={item}
                        onCancel={() => closeTask("split")}
                        onSplit={(amount) => {
                          onEquipmentSplit(item, amount);
                          setTask(null);
                          // Still a stack: back to Split; else to Manage.
                          focusSoon(`${panelId}-split`, `${panelId}-button`);
                        }}
                      />
                    )}
                    {openTask === "give" && canGive && (
                      <GiveForm
                        id={`${panelId}-give-form`}
                        item={item}
                        receivers={giftReceivers}
                        onGive={(given, to, count) => {
                          giveNeighbour.current = neighbourOf(item.index);
                          return onGiveItem(given, to, count);
                        }}
                        onCancel={() => closeTask("give")}
                        onDone={(all) => {
                          if (all) {
                            focusNeighbour(giveNeighbour.current);
                          } else {
                            setTask(null);
                            focusSoon(`${panelId}-give`, `${panelId}-button`);
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            </>
          );
        }}
      />
      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </section>
  );
}

export default CharacterSheetInventoryTab;
