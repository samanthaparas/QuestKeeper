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
      emptyText="No tracked resources yet. Add one below for anything with limited uses - Channel Divinity, Lay on Hands, spell slots, whatever you need."
      addButtonLabel="Add Resource"
      onAdd={onResourceAdd}
      onUpdate={onResourceUpdate}
      onRemove={onResourceRemove}
      extraRowContent={(resource) => (
        <>
          <span className="character-sheet__resource-count">
            <input
              type="number"
              className="character-sheet__resource-input"
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
          <span className="character-sheet__resource-reset">
            {resource.resetOn === "short" ? "Short Rest" : "Long Rest"}
          </span>
        </>
      )}
    />
  );
}

export default CharacterSheetResourcesTab;
