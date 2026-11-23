import UseCounter from "../UseCounter/UseCounter";
import EditableItemList from "../EditableItemList/EditableItemList";
import Button from "../Button/Button";
import { RESET_OPTIONS, RESOURCE_MAX_SOURCES, describeMaxFrom, describeRecovery } from "../../utils/characterSheet";

// The regain box, shown only for "Daily at dawn": a number, dice like
// 1d3 or 1d6+4, or blank for all of them.
export function RegainField({ value, onChange, resetOn }) {
  if (resetOn !== "dawn") return null;
  return (
    <label className="character-sheet__labeled-box character-sheet__regain-field">
      <span>Regains at dawn</span>
      <input
        className="character-sheet__resource-form-input"
        placeholder="1d3 (blank: all)"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

// Ways to order the resources, and which ones to show. The default keeps
// the order they were added.
// (Sorted Z to A, this puts them in the order they come back: short rest,
// long rest, daily at dawn, by hand.)
const REST_LABELS = { short: "Short rest", dawn: "Daily at dawn", manual: "By hand" };
const restLabel = (resource) => REST_LABELS[resource.resetOn] ?? "Long rest";
const RESOURCE_SORTS = [
  { key: "added", label: "Order added" },
  { key: "name", label: "Name (A–Z)", compare: () => 0 },
  {
    key: "rest",
    label: "Rest that refills it",
    // Short rest ones first: they come back sooner.
    compare: (a, b) => restLabel(b).localeCompare(restLabel(a)),
    groupOf: restLabel,
  },
  { key: "max", label: "Most uses", compare: (a, b) => (Number(b.max) || 0) - (Number(a.max) || 0) },
  { key: "left", label: "Uses left", compare: (a, b) => (Number(b.current) || 0) - (Number(a.current) || 0) },
];
const RESOURCE_FILTERS = [
  { key: "short", label: "Short rest", match: (resource) => resource.resetOn === "short" },
  {
    key: "long",
    label: "Long rest",
    match: (resource) => !["short", "dawn", "manual"].includes(resource.resetOn),
  },
  { key: "dawn", label: "Daily at dawn", match: (resource) => resource.resetOn === "dawn" },
  { key: "manual", label: "By hand", match: (resource) => resource.resetOn === "manual" },
  { key: "ready", label: "Has uses left", match: (resource) => (Number(resource.current) || 0) > 0 },
  { key: "spent", label: "Used up", match: (resource) => (Number(resource.current) || 0) <= 0 },
  { key: "free", label: "Free spell casts", match: (resource) => Boolean(resource.freeCastFor) },
];

function CharacterSheetResourcesTab({
  resources,
  onResourceCurrentChange,
  onResourceAdd,
  onResourceUpdate,
  onResourceRemove,
  // New dawn: recharges the daily resources once, on purpose (never from a
  // rest or the clock). dawnNote: what the last dawn did, with Undo.
  onDawn = () => {},
  onUndoDawn = () => {},
  dawnNote = null,
  // The inventory item a resource holds the charges of (or null).
  itemFor = () => null,
  // Opens that item on the Inventory tab ("View item").
  onViewItem = null,
}) {
  const hasDawn = (resources ?? []).some((resource) => resource.resetOn === "dawn");
  const dawnBar = hasDawn ? (
    <div className="character-sheet__dawn-bar">
      <Button variant="secondary" onClick={onDawn}>
        🌅 New dawn
      </Button>
      <span className="character-sheet__dawn-help">
        Daily items regain charges at dawn. Tap this when dawn comes in the game; resting doesn&apos;t do it.
      </span>
      {dawnNote && (
        <p className="character-sheet__dawn-note" role="status">
          {dawnNote.text}{" "}
          <button type="button" className="character-sheet__lookup-retry" onClick={onUndoDawn}>
            Undo
          </button>
        </p>
      )}
    </div>
  ) : null;

  return (
    <EditableItemList
      title="Resources"
      // Three lined-up columns on a wide sheet: Resource | Remaining |
      // Recovery (see CharacterSheetPage.css); stacked when it's narrow.
      sectionClassName="resources-section use-tracker-layout"
      // Quiet column headings over the rows (wide sheets only). Hidden from
      // screen readers: each tracker and recovery line says it in full.
      listHeader={
        <div className="resources-columns" aria-hidden="true">
          <span>Resource</span>
          <span>Remaining</span>
          <span>Recovery</span>
        </div>
      }
      items={resources}
      getItemId={(item) => item.id}
      fields={[
        {
          key: "name",
          type: "text",
          placeholder: "Resource name (e.g. Channel Divinity)",
        },
        {
          key: "max",
          type: "number",
          placeholder: "Max",
          width: "small",
          min: 1,
          // Not needed while the max follows the proficiency bonus or a modifier.
          disabledWhen: (values) => Boolean(values.maxFrom),
        },
        {
          key: "maxFrom",
          type: "select",
          label: "Max uses",
          defaultValue: "",
          options: RESOURCE_MAX_SOURCES.map((option) => ({
            value: option.value,
            label: option.value ? `Max = ${option.label}` : "Max = a number I type",
          })),
        },
        {
          key: "resetOn",
          type: "select",
          label: "Refills",
          defaultValue: "long",
          options: RESET_OPTIONS,
        },
        {
          key: "regain",
          type: "custom",
          defaultValue: "",
          fromItem: (item) => item.regain ?? "",
          render: ({ value, onChange, values }) => (
            <RegainField value={value} onChange={onChange} resetOn={values.resetOn} />
          ),
        },
        {
          key: "notes",
          type: "textarea",
          placeholder: "Notes (optional) - one line per bullet point",
        },
      ]}
      emptyText="Track anything with limited uses, like Channel Divinity, Lay on Hands, Second Wind or a wand's charges. Tap Add Resource, give it a name and how many uses you get, then tap − each time you use one. It refills on the rest you pick, at dawn, or only when you change it."
      footer={dawnBar}
      addButtonLabel="Add Resource"
      onAdd={onResourceAdd}
      onUpdate={onResourceUpdate}
      onRemove={onResourceRemove}
      // The pencil and trash wait behind "Edit resources", so rows stay calm in play.
      hasEditToggle
      editToggleLabel="Edit resources"
      viewKey="resources"
      sortOptions={RESOURCE_SORTS}
      filterOptions={RESOURCE_FILTERS}
      extraRowContent={(resource) => (
        <>
          {/* Remaining: − spends one, + gives one back. A big pool (Lay
              on Hands, more than 12) keeps its typed box as the count. The
              same width in every row, so the columns line up. */}
          <span className="resources-tracker">
            <UseCounter
              name={resource.name}
              // An item's charges say "Charges", as on its Inventory row.
              unit={itemFor(resource) ? "charge" : "use"}
              title={itemFor(resource) ? "Charges" : "Uses"}
              current={resource.current}
              max={resource.max}
              editable={resource.max > 12}
              aligned
              showDepleted={false}
              onChange={(value) => onResourceCurrentChange(resource.id, value)}
            />
          </span>
          {/* Recovery, then anything else about it, in its own column:
              where its max comes from, the item it belongs to, Depleted. */}
          <span className="resources-recovery use-tracker-notes">
            <span>{describeRecovery(resource, { short: true })}</span>
            {resource.maxFrom && (
              <span title="The most uses follows this, and changes on its own with level and scores">
                Max follows {describeMaxFrom(resource.maxFrom)}
              </span>
            )}
            {itemFor(resource) && itemFor(resource).name !== resource.name && (
              <span>From {itemFor(resource).name}</span>
            )}
            {itemFor(resource) && onViewItem && (
              <button
                type="button"
                className="use-tracker-notes__link"
                aria-label={`View ${itemFor(resource).name} in inventory`}
                onClick={() => onViewItem(itemFor(resource))}
              >
                View item
              </button>
            )}
            {Number(resource.max) > 0 && Number(resource.current) <= 0 && (
              <span className="use-tracker-notes__depleted">Depleted</span>
            )}
          </span>
        </>
      )}
    />
  );
}

export default CharacterSheetResourcesTab;
