import RuleTerm from "../RulesText/RuleTerm";
import { conditionWord } from "../../utils/conditions";
import { getInitials } from "../../utils/characterSheet";
import "./PartyStrip.css";

const HEALTH_LABELS = { bloodied: "Bloodied", down: "Down" };
const PASSIVE_LABELS = { perception: "Perception", insight: "Insight", investigation: "Investigation" };

// The whole party at a glance: one row per character with an HP bar, AC and
// conditions, plus passive scores for the DM. Read-only.
//
// rows: from toPartyRow(). onSelect(id): optional; makes each name a button
// (the DM uses it to open that character's full card below).
function PartyStrip({ rows, onSelect, selectedId }) {
  if (rows.length === 0) return null;

  return (
    <ul className="party-strip" aria-label="Party">
      {rows.map((row) => (
        <li
          key={row.id}
          className={`party-strip__row party-strip__row--${row.health}${
            row.id === selectedId ? " party-strip__row--selected" : ""
          }`}
        >
          {/* The name sits right next to it, so the picture itself is decoration. */}
          <span className="party-strip__portrait" aria-hidden="true">
            {row.portraitUrl ? (
              <img src={row.portraitUrl} alt="" loading="lazy" />
            ) : (
              getInitials(row.name)
            )}
          </span>

          <div className="party-strip__who">
            {onSelect ? (
              <button
                type="button"
                className="party-strip__name party-strip__name--button"
                aria-pressed={row.id === selectedId}
                onClick={() => onSelect(row.id)}
              >
                {row.name}
              </button>
            ) : (
              <span className="party-strip__name">{row.name}</span>
            )}
            {row.summary && <span className="party-strip__summary">{row.summary}</span>}
          </div>

          <div className="party-strip__hp">
            <span className="party-strip__hp-text">
              <span className="party-strip__label">HP</span> {row.hp.current}/{row.hp.max}
              {row.hp.temporary > 0 && (
                <span className="party-strip__temp"> +{row.hp.temporary} temp</span>
              )}
              {HEALTH_LABELS[row.health] && (
                <strong className="party-strip__health"> · {HEALTH_LABELS[row.health]}</strong>
              )}
            </span>
            {/* The bar is decoration; the numbers above say the same thing. */}
            <span className="party-strip__bar" aria-hidden="true">
              <span className="party-strip__bar-fill" style={{ width: `${row.hpPercent}%` }} />
            </span>
          </div>

          <span className="party-strip__ac">
            <span className="party-strip__label">AC</span> {row.armorClass}
          </span>

          {row.passives.length > 0 && (
            <span
              className="party-strip__passives"
              title="Passive scores: 10 + the skill bonus. Compare them to a DC without asking anyone to roll."
            >
              <span className="party-strip__label">Passive</span>
              {row.passives.map(({ skill, score }) => (
                <span key={skill} className="party-strip__passive">
                  {PASSIVE_LABELS[skill]} {score}
                </span>
              ))}
            </span>
          )}

          {row.conditions.length > 0 && (
            <ul className="party-strip__conditions" aria-label={`${row.name}'s conditions`}>
              {row.conditions.map((condition) => {
                const word = conditionWord(condition.key);
                if (!word) return null;
                return (
                  <li key={condition.key} className="party-strip__condition">
                    <RuleTerm word={word}>
                      {word.name}
                      {condition.key === "exhaustion" ? ` ${condition.level ?? 1}` : ""}
                    </RuleTerm>
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export default PartyStrip;
