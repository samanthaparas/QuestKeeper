import {
  ABILITY_ABBREVIATIONS,
  ABILITY_SCORES,
  getAbilityModifier,
  formatModifier,
  getInitials,
} from "../../utils/characterSheet";
import "./CreationSummaryPanel.css";

// "Your hero so far": one slim strip under the steps that fills in as you go.
function CreationSummaryPanel({
  name,
  race,
  characterClass,
  subclass,
  background,
  abilityScores,
}) {
  const className = characterClass
    ? `${characterClass.name}${subclass ? ` (${subclass.name})` : ""}`
    : null;
  const chips = [
    ["Race", race?.name],
    ["Class", className],
    ["Background", background?.name],
    ["Hit die", characterClass?.hitDie ? `d${characterClass.hitDie}` : null],
  ].filter(([, value]) => value);

  return (
    <aside className="creation-summary" aria-label="Your hero so far">
      <div className="creation-summary__header">
        <div className="creation-summary__avatar">{getInitials(name)}</div>
        <div className="creation-summary__identity">
          <p className="creation-summary__eyebrow">Your hero so far</p>
          <p className="creation-summary__name">{name || "Unnamed Hero"}</p>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="creation-summary__chips">
          {chips.map(([label, value]) => (
            <li key={label}>
              <span>{label}</span> {value}
            </li>
          ))}
        </ul>
      )}

      {abilityScores && (
        <div className="creation-summary__abilities">
          {ABILITY_SCORES.map((ability) => (
            <span className="creation-summary__ability" key={ability}>
              {ABILITY_ABBREVIATIONS[ability]}{" "}
              <strong>
                {abilityScores[ability]} (
                {formatModifier(getAbilityModifier(abilityScores[ability]))})
              </strong>
            </span>
          ))}
        </div>
      )}
    </aside>
  );
}

export default CreationSummaryPanel;
