import EditableItemList from "../EditableItemList/EditableItemList";

function CharacterSheetFeaturesTab({
  features,
  onFeatureAdd,
  onFeatureUpdate,
  onFeatureRemove,
  feats,
  onFeatAdd,
  onFeatUpdate,
  onFeatRemove,
  proficiencies,
  onProficiencyAdd,
  onProficiencyUpdate,
  onProficiencyRemove,
}) {
  return (
    <>
      <section className="character-sheet__section">
        <EditableItemList
          title="Features"
          items={features}
          getItemId={(item) => item.index}
          fields={[
            {
              key: "name",
              type: "text",
              placeholder: "Feature name (e.g. Aura of Protection)",
            },
            {
              key: "description",
              type: "textarea",
              placeholder: "Description (optional) - one line per bullet point",
            },
          ]}
          emptyText="No class or racial features recorded yet."
          addButtonLabel="Add Feature"
          onAdd={onFeatureAdd}
          onUpdate={onFeatureUpdate}
          onRemove={onFeatureRemove}
        />
      </section>

      <section className="character-sheet__section">
        <EditableItemList
          title="Feats"
          items={feats}
          getItemId={(item) => item.index}
          fields={[
            {
              key: "name",
              type: "text",
              placeholder: "Feat name (e.g. Shield Master)",
            },
            {
              key: "description",
              type: "textarea",
              placeholder: "Description (optional) - one line per bullet point",
            },
          ]}
          emptyText="No feats yet."
          addButtonLabel="Add Feat"
          onAdd={onFeatAdd}
          onUpdate={onFeatUpdate}
          onRemove={onFeatRemove}
        />
      </section>

      <section className="character-sheet__section">
        <EditableItemList
          title="Proficiencies"
          items={proficiencies}
          getItemId={(item) => item.index}
          fields={[
            {
              key: "name",
              type: "text",
              placeholder: "Proficiency (e.g. Longswords, Heavy Armor)",
            },
            {
              key: "description",
              type: "textarea",
              placeholder: "Notes (optional) - one line per bullet point",
            },
          ]}
          emptyText="No weapon, armor, or tool proficiencies recorded yet."
          addButtonLabel="Add Proficiency"
          onAdd={onProficiencyAdd}
          onUpdate={onProficiencyUpdate}
          onRemove={onProficiencyRemove}
        />
      </section>
    </>
  );
}

export default CharacterSheetFeaturesTab;
