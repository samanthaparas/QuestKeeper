import SourceBadge from "../SourceBadge/SourceBadge";
import BookEntryPanel from "../BookEntryPanel/BookEntryPanel";
import SubclassBrowser from "../SubclassBrowser/SubclassBrowser";
import RulesText from "../RulesText/RulesText";
import StartFromButton from "../HomebrewStart/StartFromButton";
import { OFFICIAL_BOOKS_GROUP } from "../../utils/bookBackgrounds";
import "./DetailPanel.css";

const NEW_ISSUE_URL = "https://github.com/samanthaparas/QuestKeeper/issues/new";

// "4, 8, 12, 16 and 19"
function formatLevelList(levels) {
  if (levels.length < 2) return String(levels[0] ?? "");
  return `${levels.slice(0, -1).join(", ")} and ${levels[levels.length - 1]}`;
}

// A GitHub "new issue" link with the title filled in, so feedback says which
// entry it is about ("Feedback: Fireball (Spell)").
function feedbackUrl({ name, category }) {
  const about = category ? `${name} (${category})` : name;
  return `${NEW_ISSUE_URL}?title=${encodeURIComponent(`Feedback: ${about}`)}`;
}

// Only real web links become clickable (never "javascript:" and the like).
function isWebLink(url) {
  return /^https?:\/\//i.test(url ?? "");
}

// Paragraphs and simple tables from the SRD text (spell descriptions, etc.).
export function SrdBlocks({ blocks }) {
  return blocks.map((block, index) =>
    typeof block === "string" ? (
      <p key={index}>
        <RulesText text={block} />
      </p>
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
// inPicker: shown inside a character-creation picker (book entries then don't
// link away to My Homebrew, which would lose the player's progress).
// animate: fade and slide in each time a different entry opens (off for the
// homebrew form's live preview, which changes on every keystroke).
function DetailPanel({ selectedResult, actions, inPicker = false, animate = true }) {
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
    <section
      // A new key per entry replays the opening animation.
      key={animate ? selectedResult.name : undefined}
      className={`detail-panel${animate ? " detail-panel--enter" : ""}`}
    >
      <div className="flex-header-row detail-panel__header">
        <h2 className="detail-panel__title">{selectedResult.name}</h2>
        {actions}
      </div>

      <p className="detail-panel__type">
        {selectedResult.category}
        {selectedResult.source ? (
          <>
            {" "}
            <SourceBadge
              source={selectedResult.source}
              official={selectedResult.sourceGroup === OFFICIAL_BOOKS_GROUP}
            />
          </>
        ) : (
          selectedResult.edition && ` · ${selectedResult.edition} SRD`
        )}
      </p>

      {/* Free options can be copied into My Homebrew to make your own
          version. (Pickers offer this next to their Choose button instead.) */}
      {selectedResult.startFrom && !inPicker && (
        <div className="detail-panel__start">
          <StartFromButton
            startFrom={selectedResult.startFrom}
            hint={`Copies everything into a new homebrew ${selectedResult.category.toLowerCase()} for you to change.`}
          />
        </div>
      )}

      {/* Homebrew: what it's based on, and a link to the full write-up. */}
      {(selectedResult.basedOn || isWebLink(selectedResult.linkUrl)) && (
        <p className="detail-panel__based-on">
          {selectedResult.basedOn && <>Based on {selectedResult.basedOn}</>}
          {selectedResult.basedOn && isWebLink(selectedResult.linkUrl) && " · "}
          {isWebLink(selectedResult.linkUrl) && (
            <a
              href={selectedResult.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View the source
            </a>
          )}
        </p>
      )}

      {/* A heads-up when the open data is missing something (e.g. Darakhul's speed). */}
      {selectedResult.dmNote && (
        <p className="detail-panel__note">{selectedResult.dmNote}</p>
      )}

      {selectedResult.description && (
        <p className="detail-panel__description">
          <RulesText text={selectedResult.description} />
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

      {selectedResult.category === "Race" && !selectedResult.bookEntry && (
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
                    <strong>{trait.name}.</strong> <RulesText text={trait.description} withLists />
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

      {selectedResult.category === "Class" && !selectedResult.bookEntry && (
        <>
          <p>
            <strong>Hit Die:</strong> {selectedResult.hitDie}
          </p>

          <p>
            <strong>Saving Throws:</strong> {selectedResult.savingThrows}
          </p>

          {selectedResult.spellcasting && (
            <p>
              <strong>Spellcasting:</strong>{" "}
              <RulesText text={selectedResult.spellcasting} />
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
                    <strong>{feature.name}.</strong> <RulesText text={feature.description} withLists />
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* What the class brings after level 1: grouped by level and folded
              away, so it doesn't bury the rest. Falls back to the plain list
              when the levels couldn't be loaded. */}
          {selectedResult.laterFeatureGroups ? (
            <details className="detail-panel__later">
              <summary>
                <strong>Later you&rsquo;ll also gain</strong> (levels 2 to 20)
              </summary>
              {selectedResult.laterFeatureGroups.repeated.length > 0 && (
                <ul className="detail-panel__list detail-panel__list--rich">
                  {selectedResult.laterFeatureGroups.repeated.map(({ name, levels }) => (
                    <li key={name}>
                      <strong>{name}</strong> at levels {formatLevelList(levels)}
                    </li>
                  ))}
                </ul>
              )}
              <dl className="detail-panel__levels">
                {selectedResult.laterFeatureGroups.byLevel.map(({ level, names }) => (
                  <div className="detail-panel__level-row" key={level}>
                    <dt>Level {level}</dt>
                    <dd>{names.join(", ")}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : (
            selectedResult.laterFeatures && (
              <p>
                <strong>Later you&rsquo;ll also gain:</strong> {selectedResult.laterFeatures}
              </p>
            )
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

        </>
      )}

      {selectedResult.bookEntry && <BookEntryPanel entry={selectedResult.bookEntry} />}

      {/* Every class (SRD or book) has its subclasses in tabs by source.
          The key starts it fresh for each class (and each linked subclass). */}
      {selectedResult.category === "Class" && selectedResult.subclassGroups?.length > 0 && (
        <SubclassBrowser
          key={`${selectedResult.name}:${selectedResult.initialSubclass ?? ""}`}
          groups={selectedResult.subclassGroups}
          initialIndex={selectedResult.initialSubclass}
          inPicker={inPicker}
        />
      )}

      {selectedResult.category === "Background" &&
        !selectedResult.bookEntry &&
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

                <p>
                  <RulesText text={selectedResult.featureDescription} />
                </p>
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
        <>
          <p>
            <strong>{selectedResult.flavor}</strong>
          </p>

          {selectedResult.features?.length > 0 && (
            <ul className="detail-panel__list detail-panel__list--rich">
              {selectedResult.features.map((feature, index) => (
                <li key={`${feature.name}-${index}`}>
                  <strong>
                    {feature.name}
                    {feature.level ? ` (level ${feature.level})` : ""}.
                  </strong>{" "}
                  <RulesText text={feature.description} />
                </li>
              ))}
            </ul>
          )}
        </>
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
