import UsePips, { MAX_PIPS } from "../UsePips/UsePips";
import EditableItemList from "../EditableItemList/EditableItemList";

// Ways to order the resources, and which ones to show. The default keeps
// the order they were added.
const restLabel = (resource) => (resource.resetOn === "short" ? "Short rest" : "Long rest");
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
  { key: "long", label: "Long rest", match: (resource) => resource.resetOn !== "short" },
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
}) {
  return (
    <EditableItemList
      title="Resources"
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
        },
        {
          key: "resetOn",
          type: "select",
          defaultValue: "long",
          options: [
            { value: "long", label: "Long Rest" },
            { value: "short", label: "Short Rest" },
          ],
        },
        {
          key: "notes",
          type: "textarea",
          placeholder: "Notes (optional) - one line per bullet point",
        },
      ]}
      emptyText="Track anything with limited uses, like Channel Divinity, Lay on Hands or Second Wind. Tap Add Resource, give it a name and how many uses you get, then tap a pip each time you use one. It refills on the rest you pick."
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
          {/* A few uses (Channel Divinity): pips to tap. A big pool (Lay on
              Hands): a number box. */}
          {resource.max <= MAX_PIPS ? (
            <UsePips
              label={resource.name}
              current={resource.current}
              max={resource.max}
              onChange={(value) => onResourceCurrentChange(resource.id, value)}
            />
          ) : (
            <span className="character-sheet__resource-count">
              <input
                type="number"
                className="character-sheet__resource-input"
                aria-label={`${resource.name} left`}
                value={resource.current}
                onChange={(e) =>
                  onResourceCurrentChange(resource.id, e.target.value)
                }
                min={0}
                max={resource.max}
              />
              {" / "}
              {resource.max}
            </span>
          )}
          <span className="character-sheet__resource-reset">
            {resource.resetOn === "short" ? "Short Rest" : "Long Rest"}
          </span>
        </>
      )}
    />
  );
}

export default CharacterSheetResourcesTab;
