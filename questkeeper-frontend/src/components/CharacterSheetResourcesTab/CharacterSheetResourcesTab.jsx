import UsePips, { MAX_PIPS } from "../UsePips/UsePips";
import EditableItemList from "../EditableItemList/EditableItemList";

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
