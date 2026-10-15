import { Link } from "react-router-dom";
import RuleTerm from "../RulesText/RuleTerm";
import { getInitials } from "../../utils/characterSheet";
import { conditionWord } from "../../utils/conditions";
import { toPartyRow } from "../../utils/partyStrip";
import "./PlayerCharacterCard.css";

const HEALTH_LABELS = { bloodied: "Bloodied", down: "Down" };

// The player's own character at the top of their game page: who they are,
// how hurt, AC and conditions, and the way to their full sheet (where HP,
// attacks and spells are changed). Read-only here, so it never fights with
// the sheet over a number.
function PlayerCharacterCard({ sheet, characterId }) {
  if (!sheet) {
    return (
      <section className="player-card player-card--loading" aria-label="Your character">
        <p className="player-card__empty">Loading your character…</p>
        <Link className="qk-button qk-button--primary player-card__open" to={`/characters/${characterId}`}>
          Open my character sheet
        </Link>
      </section>
    );
  }

  const row = toPartyRow(sheet);
  const summary = [
    sheet.level ? `Level ${sheet.level}` : "",
    sheet.race?.name,
    sheet.class?.name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={`player-card player-card--${row.health}`} aria-label="Your character">
      <div className="player-card__portrait" aria-hidden="true">
        {sheet.portraitUrl ? (
          <img src={sheet.portraitUrl} alt="" />
        ) : (
          <span>{getInitials(sheet.name)}</span>
        )}
      </div>

      <div className="player-card__who">
        <p className="player-card__eyebrow">You're playing</p>
        <h2 className="player-card__name">{sheet.name}</h2>
        {summary && <p className="player-card__summary">{summary}</p>}
      </div>

      <div className="player-card__hp">
        <span className="player-card__hp-text">
          <span className="player-card__label">HP</span> {row.hp.current}/{row.hp.max}
          {row.hp.temporary > 0 && <span className="player-card__temp"> +{row.hp.temporary} temp</span>}
          {HEALTH_LABELS[row.health] && <strong> · {HEALTH_LABELS[row.health]}</strong>}
        </span>
        <span className="player-card__bar" aria-hidden="true">
          <span className="player-card__bar-fill" style={{ width: `${row.hpPercent}%` }} />
        </span>
      </div>

      <span className="player-card__ac">
        <span className="player-card__label">AC</span> {row.armorClass}
      </span>

      {row.conditions.length > 0 && (
        <ul className="player-card__conditions" aria-label="Your conditions">
          {row.conditions.map((condition) => {
            const word = conditionWord(condition.key);
            if (!word) return null;
            return (
              <li key={condition.key} className="player-card__condition">
                <RuleTerm word={word}>
                  {word.name}
                  {condition.key === "exhaustion" ? ` ${condition.level ?? 1}` : ""}
                </RuleTerm>
              </li>
            );
          })}
        </ul>
      )}

      <Link className="qk-button qk-button--primary player-card__open" to={`/characters/${characterId}`}>
        Open my character sheet
      </Link>
    </section>
  );
}

export default PlayerCharacterCard;
