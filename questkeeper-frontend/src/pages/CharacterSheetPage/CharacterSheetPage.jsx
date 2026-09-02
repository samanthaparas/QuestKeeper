import { useParams, Link } from "react-router-dom";
import { getCharacter } from "../../utils/characterStore";
import {
  ABILITY_SCORES,
  getAbilityModifier,
  getProficiencyBonus,
} from "../../utils/characterSheet";
import "./CharacterSheetPage.css";

const ABILITY_ABBREVIATIONS = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function CharacterSheetPage() {
  const { id } = useParams();
  const sheet = getCharacter(id);

  if (!sheet) {
    return (
      <main className="character-sheet character-sheet--empty">
        <h1 className="character-sheet__title">Character not found</h1>
        <Link className="character-sheet__back-link" to="/characters">
          Back to Characters
        </Link>
      </main>
    );
  }

  const proficiencyBonus = getProficiencyBonus(sheet.level);
  const { combat } = sheet;

  return (
    <main className="character-sheet">
      <div className="character-sheet__content">
        <Link className="character-sheet__back-link" to="/characters">
          Back to Characters
        </Link>

        <header className="character-sheet__header">
          <h1 className="character-sheet__title">{sheet.name}</h1>
          <p className="character-sheet__subtitle">
            Level {sheet.level} {sheet.race?.name ?? "No race"}{" "}
            {sheet.class?.name ?? "No class"} ·{" "}
            {sheet.background?.name ?? "No background"}
          </p>
        </header>

        <section className="character-sheet__stat-row">
          <div className="character-sheet__stat-box">
            <span className="character-sheet__stat-label">Armor Class</span>
            <span className="character-sheet__stat-value">
              {combat.armorClass}
            </span>
          </div>
          <div className="character-sheet__stat-box">
            <span className="character-sheet__stat-label">Initiative</span>
            <span className="character-sheet__stat-value">
              {formatModifier(combat.initiative)}
            </span>
          </div>
          <div className="character-sheet__stat-box">
            <span className="character-sheet__stat-label">Speed</span>
            <span className="character-sheet__stat-value">
              {combat.speed} ft
            </span>
          </div>
          <div className="character-sheet__stat-box">
            <span className="character-sheet__stat-label">Hit Points</span>
            <span className="character-sheet__stat-value">
              {combat.hitPoints.current} / {combat.hitPoints.max}
              {combat.hitPoints.temporary > 0 &&
                ` (+${combat.hitPoints.temporary})`}
            </span>
          </div>
          <div className="character-sheet__stat-box">
            <span className="character-sheet__stat-label">Hit Dice</span>
            <span className="character-sheet__stat-value">
              {combat.hitDice.remaining}/{combat.hitDice.total}
              {combat.hitDice.die ? ` d${combat.hitDice.die}` : ""}
            </span>
          </div>
          <div className="character-sheet__stat-box">
            <span className="character-sheet__stat-label">Proficiency</span>
            <span className="character-sheet__stat-value">
              +{proficiencyBonus}
            </span>
          </div>
        </section>

        <section className="character-sheet__abilities">
          {ABILITY_SCORES.map((ability) => {
            const score = sheet.abilityScores[ability];
            const modifier = getAbilityModifier(score);

            return (
              <div className="character-sheet__ability-card" key={ability}>
                <span className="character-sheet__ability-name">
                  {ABILITY_ABBREVIATIONS[ability]}
                </span>
                <span className="character-sheet__ability-score">{score}</span>
                <span className="character-sheet__ability-modifier">
                  {formatModifier(modifier)}
                </span>
                {sheet.savingThrows[ability] && (
                  <span className="character-sheet__ability-save-badge">
                    Save Prof.
                  </span>
                )}
              </div>
            );
          })}
        </section>

        <section className="character-sheet__section">
          <h2 className="character-sheet__section-title">Equipment</h2>
          {sheet.equipment.length === 0 ? (
            <p className="character-sheet__empty-text">
              No equipment recorded yet.
            </p>
          ) : (
            <ul className="character-sheet__list">
              {sheet.equipment.map((item, index) => (
                <li key={index}>{item.name ?? item}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="character-sheet__section">
          <h2 className="character-sheet__section-title">Spellcasting</h2>
          {sheet.spellcasting ? (
            <p>{sheet.class?.name} spellcasting active.</p>
          ) : (
            <p className="character-sheet__empty-text">
              Not a spellcaster yet.
            </p>
          )}
        </section>

        <section className="character-sheet__section">
          <h2 className="character-sheet__section-title">Notes</h2>
          <p className="character-sheet__empty-text">
            {sheet.notes || "No notes yet."}
          </p>
        </section>
      </div>
    </main>
  );
}

export default CharacterSheetPage;
