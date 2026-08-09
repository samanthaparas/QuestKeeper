import "./DetailPanel.css";

function DetailPanel({ selectedResult }) {
  if (!selectedResult) {
    return (
      <section className="detail-panel">
        <h2 className="detail-panel__title">Select an Item</h2>
        <p>Choose something from the list to view details.</p>
      </section>
    );
  }

  return (
    <section className="detail-panel">
      <h2 className="detail-panel__title">{selectedResult.name}</h2>
      <p className="detail-panel__type">{selectedResult.category}</p>

      {selectedResult.description && (
        <p className="detail-panel__description">
          {selectedResult.description}
        </p>
      )}

      {selectedResult.category === "Race" && (
        <>
          <p>
            <strong>Speed:</strong> {selectedResult.speed}
          </p>

          <p>
            <strong>Size:</strong> {selectedResult.size}
          </p>

          <p>
            <strong>Ability Bonuses:</strong> {selectedResult.abilityBonuses}
          </p>

          <p>
            <strong>Alignment</strong>
          </p>

          <p>{selectedResult.alignment}</p>
        </>
      )}

      {selectedResult.category === "Class" && (
        <>
          <p>
            <strong>Hit Die:</strong> {selectedResult.hitDie}
          </p>

          <p>
            <strong>Saving Throws:</strong> {selectedResult.savingThrows}
          </p>

          <p>
            <strong>Proficiencies:</strong>
          </p>

          <ul className="detail-panel__list">
            {selectedResult.proficiencies?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p>
            <strong>Skill Choices:</strong> {selectedResult.skillChoices}
          </p>

          {selectedResult.startingEquipment && (
            <p>
              <strong>Starting Equipment:</strong>{" "}
              {selectedResult.startingEquipment}
            </p>
          )}

          <p>
            <strong>Subclasses:</strong> {selectedResult.subclasses}
          </p>
        </>
      )}

      {selectedResult.category === "Background" && (
        <>
          <p>
            <strong>Starting Proficiencies:</strong>
          </p>

          <ul className="detail-panel__list">
            {selectedResult.startingProficiencies?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p>
            <strong>Languages:</strong> {selectedResult.languages}
          </p>

          <p>
            <strong>Starting Equipment:</strong>
          </p>

          <ul className="detail-panel__list">
            {selectedResult.startingEquipment?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p>
            <strong>Starting Gold:</strong> {selectedResult.startingGold}
          </p>

          <p>
            <strong>Feature:</strong> {selectedResult.featureName}
          </p>

          <p>{selectedResult.featureDescription}</p>

          <p>
            <strong>Personality Traits:</strong>{" "}
            {selectedResult.personalityTraits}
          </p>

          <p>
            <strong>Ideals:</strong> {selectedResult.ideals}
          </p>

          <p>
            <strong>Bonds:</strong> {selectedResult.bonds}
          </p>

          <p>
            <strong>Flaws:</strong> {selectedResult.flaws}
          </p>
        </>
      )}

      {selectedResult.category === "Spell" && (
        <>
          {selectedResult.level !== undefined && (
            <p>
              <strong>Level:</strong> {selectedResult.level}
            </p>
          )}

          {selectedResult.castingTime && (
            <p>
              <strong>Casting Time:</strong> {selectedResult.castingTime}
            </p>
          )}

          {selectedResult.range && (
            <p>
              <strong>Range:</strong> {selectedResult.range}
            </p>
          )}

          {selectedResult.duration && (
            <p>
              <strong>Duration:</strong> {selectedResult.duration}
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default DetailPanel;
