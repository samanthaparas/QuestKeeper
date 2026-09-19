import {
  ABILITY_ABBREVIATIONS,
  ABILITY_SCORES,
  getAbilityModifier,
  formatModifier,
} from "../../utils/characterSheet";
import "./CreationSummaryPanel.css";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function CreationSummaryPanel({
  name,
  race,
  characterClass,
  subclass,
  background,
  abilityScores,
}) {
  const subtitle = [race?.name, background?.name].filter(Boolean).join(" · ");

  return (
    <aside className="creation-summary" aria-label="Your hero so far">
      <p className="creation-summary__eyebrow">Your Hero So Far</p>

      <div className="creation-summary__header">
        <div className="creation-summary__avatar">{getInitials(name)}</div>
        <div className="creation-summary__identity">
          <p className="creation-summary__name">{name || "Unnamed Hero"}</p>
          {subtitle && <p className="creation-summary__subtitle">{subtitle}</p>}
        </div>
      </div>

      <dl className="creation-summary__list">
        <div className="creation-summary__row">
          <dt>Race</dt>
          <dd>{race?.name ?? "—"}</dd>
        </div>

        <div className="creation-summary__row">
          <dt>Class</dt>
          <dd>
            {characterClass?.name ?? "—"}
            {subclass ? ` (${subclass.name})` : ""}
          </dd>
        </div>

        <div className="creation-summary__row">
          <dt>Background</dt>
          <dd>{background?.name ?? "—"}</dd>
        </div>

        {characterClass?.hitDie && (
          <div className="creation-summary__row">
            <dt>Hit Die</dt>
            <dd>d{characterClass.hitDie}</dd>
          </div>
        )}
      </dl>

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
