import {
  ABILITY_SCORES,
  ABILITY_ABBREVIATIONS,
  getAbilityModifier,
  formatModifier,
  getEffectiveArmorClass,
} from "../../utils/characterSheet";
import "./CharacterSummaryCard.css";

function itemName(item) {
  return typeof item === "string" ? item : (item?.name ?? "Unnamed");
}

function NameList({ title, items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="character-summary__block">
      <h4 className="character-summary__block-title">{title}</h4>
      <ul className="character-summary__list">
        {items.map((item, index) => (
          <li key={item?.id ?? `${itemName(item)}-${index}`}>
            {itemName(item)}
            {item?.quantity > 1 ? ` x${item.quantity}` : ""}
            {item?.attuned ? " (attuned)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

// A READ-ONLY summary of a player's character for the DM. There is nothing
// editable here on purpose; DMs can see everything but never change a sheet.
function CharacterSummaryCard({ sheet, playerName }) {
  const hitPoints = sheet.combat?.hitPoints ?? {
    current: 0,
    max: 0,
    temporary: 0,
  };
  const spellcasting = sheet.spellcasting;

  return (
    <article className="character-summary">
      <header className="character-summary__header">
        <div>
          <h3 className="character-summary__name">{sheet.name}</h3>
          <p className="character-summary__meta">
            Level {sheet.level} · {sheet.race?.name ?? "No race"} ·{" "}
            {sheet.class?.name ?? "No class"}
            {sheet.background?.name ? ` · ${sheet.background.name}` : ""}
          </p>
          {playerName && (
            <p className="character-summary__player">Player: {playerName}</p>
          )}
        </div>
        <span className="character-summary__badge">View only</span>
      </header>

      <div className="character-summary__stats">
        <div className="character-summary__stat">
          <span className="character-summary__stat-label">HP</span>
          <span className="character-summary__stat-value">
            {hitPoints.current}/{hitPoints.max}
            {hitPoints.temporary > 0 ? ` (+${hitPoints.temporary})` : ""}
          </span>
        </div>
        <div className="character-summary__stat">
          <span className="character-summary__stat-label">AC</span>
          <span className="character-summary__stat-value">
            {getEffectiveArmorClass(sheet)}
          </span>
        </div>
        <div className="character-summary__stat">
          <span className="character-summary__stat-label">Speed</span>
          <span className="character-summary__stat-value">
            {sheet.combat?.speed ?? 30}
          </span>
        </div>
        <div className="character-summary__stat">
          <span className="character-summary__stat-label">Init</span>
          <span className="character-summary__stat-value">
            {formatModifier(sheet.combat?.initiative ?? 0)}
          </span>
        </div>
        <div className="character-summary__stat">
          <span className="character-summary__stat-label">Inspiration</span>
          <span className="character-summary__stat-value">
            {sheet.inspiration ?? 0}
          </span>
        </div>
      </div>

      <ul className="character-summary__abilities">
        {ABILITY_SCORES.map((ability) => {
          const score = sheet.abilityScores?.[ability] ?? 10;
          return (
            <li className="character-summary__ability" key={ability}>
              <span className="character-summary__ability-name">
                {ABILITY_ABBREVIATIONS[ability]}
              </span>
              <span className="character-summary__ability-score">{score}</span>
              <span className="character-summary__ability-mod">
                {formatModifier(getAbilityModifier(score))}
              </span>
            </li>
          );
        })}
      </ul>

      <details className="character-summary__section" open>
        <summary>Attacks and spells</summary>
        {(sheet.attacks ?? []).length > 0 && (
          <ul className="character-summary__list">
            {sheet.attacks.map((attack) => (
              <li key={attack.id ?? attack.name}>
                {attack.name}: {formatModifier(Number(attack.toHit) || 0)} to
                hit
                {attack.damage ? `, ${attack.damage}` : ""}
                {attack.type ? ` ${attack.type}` : ""}
              </li>
            ))}
          </ul>
        )}
        <NameList title="Cantrips" items={spellcasting?.cantripsKnown} />
        <NameList title="Spells" items={spellcasting?.spellsKnown} />
        {(sheet.attacks ?? []).length === 0 && !spellcasting && (
          <p className="character-summary__empty">Nothing listed.</p>
        )}
      </details>

      <details className="character-summary__section">
        <summary>Inventory</summary>
        <NameList title="Equipment" items={sheet.equipment} />
        {(sheet.equipment ?? []).length === 0 && (
          <p className="character-summary__empty">Nothing listed.</p>
        )}
        <p className="character-summary__gold">Gold: {sheet.gold ?? 0}</p>
      </details>

      <details className="character-summary__section">
        <summary>Features, feats and resources</summary>
        <NameList title="Features" items={sheet.features} />
        <NameList title="Feats" items={sheet.feats} />
        {(sheet.resources ?? []).length > 0 && (
          <div className="character-summary__block">
            <h4 className="character-summary__block-title">Resources</h4>
            <ul className="character-summary__list">
              {sheet.resources.map((resource) => (
                <li key={resource.id}>
                  {resource.name}: {resource.current}/{resource.max}
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>

      <details className="character-summary__section">
        <summary>Story and notes</summary>
        {sheet.backstory ? (
          <p className="character-summary__text">{sheet.backstory}</p>
        ) : (
          <p className="character-summary__empty">No backstory written.</p>
        )}
        {sheet.appearance && (
          <p className="character-summary__text">{sheet.appearance}</p>
        )}
        {sheet.notes && (
          <p className="character-summary__text">{sheet.notes}</p>
        )}
      </details>
    </article>
  );
}

export default CharacterSummaryCard;
