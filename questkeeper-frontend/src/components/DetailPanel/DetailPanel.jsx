import SourceBadge from "../SourceBadge/SourceBadge";
import "./DetailPanel.css";

const NEW_ISSUE_URL = "https://github.com/samanthaparas/QuestKeeper/issues/new";

// A GitHub "new issue" link with the title filled in, so feedback says which
// entry it is about ("Feedback: Fireball (Spell)").
function feedbackUrl({ name, category }) {
  const about = category ? `${name} (${category})` : name;
  return `${NEW_ISSUE_URL}?title=${encodeURIComponent(`Feedback: ${about}`)}`;
}

// Paragraphs and simple tables from the SRD text (spell descriptions, etc.).
export function SrdBlocks({ blocks }) {
  return blocks.map((block, index) =>
    typeof block === "string" ? (
      <p key={index}>{block}</p>
    ) : (
      <div className="detail-panel__table-wrapper" key={index}>
        <table className="detail-panel__table">
          {block.header.length > 0 && (
            <thead>
              <tr>
                {block.header.map((cell, cellIndex) => (
                  <th scope="col" key={cellIndex}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  );
}

// `actions`: an optional single React node rendered next to the title
// (e.g. PickerStep's Choose button). Not a multi-action slot — there's no
// defined layout/ordering for more than one element here.
function DetailPanel({ selectedResult, actions }) {
  if (!selectedResult) {
    return (
      <section className="detail-panel">
        <div className="flex-header-row detail-panel__header">
          <h2 className="detail-panel__title">Select an Item</h2>
          {actions}
        </div>
        <p>Choose something from the list to view details.</p>
      </section>
    );
  }

  return (
    <section className="detail-panel">
      <div className="flex-header-row detail-panel__header">
        <h2 className="detail-panel__title">{selectedResult.name}</h2>
        {actions}
      </div>

      <p className="detail-panel__type">
        {selectedResult.category}
        {selectedResult.source ? (
          <>
            {" "}
            <SourceBadge source={selectedResult.source} />
          </>
        ) : (
          selectedResult.edition && ` · ${selectedResult.edition} SRD`
        )}
      </p>

      {/* A heads-up when the open data is missing something (e.g. Darakhul's speed). */}
      {selectedResult.dmNote && (
        <p className="detail-panel__note">{selectedResult.dmNote}</p>
      )}

      {selectedResult.description && (
        <p className="detail-panel__description">
          {selectedResult.description}
        </p>
      )}

      {selectedResult.guidance && (
        <div className="detail-panel__guide">
          <p className="detail-panel__guide-main">
            <strong>Good if you want</strong> {selectedResult.guidance.goodIf}.
          </p>
          {(selectedResult.guidance.role ||
            selectedResult.guidance.difficulty) && (
            <p className="detail-panel__guide-chips">
              {selectedResult.guidance.role && (
                <span className="detail-panel__chip">
                  {selectedResult.guidance.role}
                </span>
              )}
              {selectedResult.guidance.difficulty && (
                <span className="detail-panel__chip">
                  {selectedResult.guidance.difficulty}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {selectedResult.category === "Race" && (
        <>
          <p>
            <strong>Speed:</strong> {selectedResult.speed}
          </p>

          <p>
            <strong>Size:</strong> {selectedResult.size}
          </p>

          {selectedResult.sizeDescription && (
            <p className="detail-panel__description">
              {selectedResult.sizeDescription}
            </p>
          )}

          <p>
            <strong>Ability Bonuses:</strong> {selectedResult.abilityBonuses}
          </p>

          {selectedResult.languages && (
            <p>
              <strong>Languages:</strong> {selectedResult.languages}
            </p>
          )}

          {selectedResult.subraces && (
            <p>
              <strong>Subraces:</strong> {selectedResult.subraces}
            </p>
          )}

          {selectedResult.traits?.length > 0 && (
            <>
              <p>
                <strong>Racial traits</strong>
              </p>

              <ul className="detail-panel__list detail-panel__list--rich">
                {selectedResult.traits.map((trait) => (
                  <li key={trait.name}>
                    <strong>{trait.name}.</strong> {trait.description}
                  </li>
                ))}
              </ul>
            </>
          )}

          {selectedResult.age && (
            <p>
              <strong>Age:</strong> {selectedResult.age}
            </p>
          )}

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

          {selectedResult.spellcasting && (
            <p>
              <strong>Spellcasting:</strong> {selectedResult.spellcasting}
            </p>
          )}

          {selectedResult.levelOneFeatures?.length > 0 && (
            <>
              <p>
                <strong>At level 1 you get</strong>
              </p>

              <ul className="detail-panel__list detail-panel__list--rich">
                {selectedResult.levelOneFeatures.map((feature) => (
                  <li key={feature.name}>
                    <strong>{feature.name}.</strong> {feature.description}
                  </li>
                ))}
              </ul>
            </>
          )}

          {selectedResult.laterFeatures && (
            <p>
              <strong>Later you'll also gain:</strong>{" "}
              {selectedResult.laterFeatures}
            </p>
          )}

          <p>
            <strong>Proficiencies:</strong>
          </p>

          <ul className="detail-panel__list detail-panel__list--chips">
            {selectedResult.proficiencies?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p>
            <strong>Skill Choices:</strong>
          </p>

          <ul className="detail-panel__list">
            {(selectedResult.skillChoiceLines ?? [selectedResult.skillChoices])
              .filter(Boolean)
              .map((line) => (
                <li key={line}>{line}</li>
              ))}
          </ul>

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

      {selectedResult.category === "Background" &&
        selectedResult.edition !== "2024" && (
          <>
            <p>
              <strong>Starting Proficiencies:</strong>
            </p>

            <ul className="detail-panel__list detail-panel__list--chips">
              {selectedResult.startingProficiencies?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            {/* e.g. Innkeeper: "Choose 1: Intimidation or Persuasion" */}
            {selectedResult.skillChoice && (
              <p>
                <strong>Skill Choice:</strong> {selectedResult.skillChoice}
              </p>
            )}

            {selectedResult.tools && (
              <p>
                <strong>Tools:</strong> {selectedResult.tools}
              </p>
            )}

            {selectedResult.languages && (
              <p>
                <strong>Languages:</strong> {selectedResult.languages}
              </p>
            )}

            {(selectedResult.startingEquipment?.length > 0 ||
              selectedResult.equipmentText) && (
              <>
                <p>
                  <strong>Starting Equipment:</strong>
                </p>

                {/* SRD lists items; Open5e describes the gear in a sentence. */}
                {selectedResult.startingEquipment?.length > 0 ? (
                  <ul className="detail-panel__list detail-panel__list--chips">
                    {selectedResult.startingEquipment.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{selectedResult.equipmentText}</p>
                )}
              </>
            )}

            {selectedResult.startingGold && (
              <p>
                <strong>Starting Gold:</strong> {selectedResult.startingGold}
              </p>
            )}

            {selectedResult.featureName && (
              <>
                <p>
                  <strong>Feature:</strong> {selectedResult.featureName}
                </p>

                <p>{selectedResult.featureDescription}</p>
              </>
            )}

            {selectedResult.personalityTraits && (
              <>
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
          </>
        )}

      {selectedResult.category === "Background" &&
        selectedResult.edition === "2024" && (
          <>
            <p>
              <strong>Ability Scores:</strong>{" "}
              {selectedResult.abilityScoreOptions}
            </p>

            {selectedResult.grantedFeatName && (
              <p>
                <strong>Origin Feat:</strong> {selectedResult.grantedFeatName}
              </p>
            )}

            <p>
              <strong>Starting Proficiencies:</strong>
            </p>

            <ul className="detail-panel__list detail-panel__list--chips">
              {selectedResult.startingProficiencies?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <p>
              <strong>Starting Equipment:</strong>
            </p>

            <ul className="detail-panel__list detail-panel__list--chips">
              {selectedResult.equipmentChoices?.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </>
        )}

      {selectedResult.category === "Subrace" && (
        <>
          <p>
            <strong>Ability Bonuses:</strong> {selectedResult.abilityBonuses}
          </p>

          <p>
            <strong>Traits:</strong>
          </p>

          <ul className="detail-panel__list">
            {selectedResult.traits?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {selectedResult.category === "Subclass" && (
        <p>
          <strong>{selectedResult.flavor}</strong>
        </p>
      )}

      {selectedResult.category === "Spell" && selectedResult.facts && (
        <>
          <p className="detail-panel__description">{selectedResult.kind}</p>

          {selectedResult.facts.map((fact) => (
            <p key={fact.label}>
              <strong>{fact.label}:</strong> {fact.value}
            </p>
          ))}

          {selectedResult.classes && (
            <p>
              <strong>Classes:</strong> {selectedResult.classes}
            </p>
          )}

          <SrdBlocks blocks={selectedResult.blocks} />
        </>
      )}

      {selectedResult.category === "Spell" && !selectedResult.facts && (
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

      <p className="detail-panel__feedback">
        Something wrong or confusing about {selectedResult.name}?{" "}
        <a
          className="detail-panel__feedback-link"
          href={feedbackUrl(selectedResult)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Tell us
        </a>
      </p>
    </section>
  );
}

export default DetailPanel;
