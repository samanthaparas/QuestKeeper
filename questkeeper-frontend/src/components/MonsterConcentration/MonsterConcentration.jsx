import { useState } from "react";
import { formatModifier, rollDie } from "../../utils/characterSheet";
import { concentrationCheck, concentrationOf, constitutionSave } from "../../utils/monsterConcentration";
import { keepMonsterConcentration, setMonsterConcentration } from "../../utils/tableStore";
import Button from "../Button/Button";
import "./MonsterConcentration.css";

// DM only: a monster's (or ally's) concentration, on its controls panel.
// The DM notes the spell it's holding; when it takes damage, a reminder asks
// for the Constitution save (DC 10 or half the damage) with a one-tap roll.
// A failed save, End, or the monster going down ends the spell. Players never
// see any of this.
//
// secret: the DM-only row (concentration, concentration_damage, stat_block).
// onChanged(): reloads the table after a change.
function MonsterConcentration({ combatant, secret, onChanged }) {
  const [isEditing, setIsEditing] = useState(false);
  const [spell, setSpell] = useState("");
  const [lastRoll, setLastRoll] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const holding = concentrationOf(combatant, secret);
  const check = concentrationCheck(combatant, secret);
  const bonus = constitutionSave(secret?.stat_block);

  async function run(action) {
    setError("");
    setIsBusy(true);
    try {
      await action();
      onChanged();
    } catch (actionError) {
      setError(actionError.message ?? "Could not save that.");
    } finally {
      setIsBusy(false);
    }
  }

  function start(event) {
    event.preventDefault();
    if (!spell.trim()) return;
    run(async () => {
      await setMonsterConcentration(combatant.id, spell, combatant.damage_taken);
      setIsEditing(false);
      setSpell("");
      setLastRoll("");
    });
  }

  const end = () => run(() => setMonsterConcentration(combatant.id, null, combatant.damage_taken));
  const keep = () => run(() => keepMonsterConcentration(combatant.id, combatant.damage_taken));

  // Rolls the save and settles it: a pass keeps the spell, a miss ends it.
  function rollSave() {
    const d20 = rollDie(20);
    const total = d20 + bonus;
    const holds = total >= check.dc;
    setLastRoll(
      `CON save: ${d20} ${bonus < 0 ? "-" : "+"} ${Math.abs(bonus)} = ${total} against DC ${check.dc}. ` +
        (holds ? `${holding} holds.` : `${holding} ends.`),
    );
    if (holds) keep();
    else end();
  }

  return (
    <div className="monster-conc">
      {error && (
        <p className="monster-conc__error" role="alert">
          {error}
        </p>
      )}

      {holding && check && (
        <div className="monster-conc__check" role="alert">
          <span>
            <strong>Concentration check:</strong> {combatant.name} took {check.damage} damage while holding{" "}
            {holding}. Constitution save, DC {check.dc} ({formatModifier(bonus)}).
          </span>
          <span className="monster-conc__buttons">
            <Button disabled={isBusy} onClick={rollSave}>
              Roll CON save
            </Button>
            <Button variant="secondary" disabled={isBusy} onClick={keep}>
              Kept it
            </Button>
            <Button variant="secondary" disabled={isBusy} onClick={end}>
              Lost it
            </Button>
          </span>
        </div>
      )}

      {holding && !check && (
        <span className="monster-conc__line">
          <span>
            <span aria-hidden="true">🧠</span> Concentrating on <strong>{holding}</strong>
          </span>
          <button type="button" className="table-page__save-button" disabled={isBusy} onClick={end}>
            End
          </button>
        </span>
      )}

      {lastRoll && (
        <span className="monster-conc__result" role="status">
          {lastRoll}
        </span>
      )}

      {!holding && !isEditing && combatant.status !== "down" && (
        <button type="button" className="table-page__save-button" onClick={() => setIsEditing(true)}>
          <span aria-hidden="true">🧠</span> Concentrating?
        </button>
      )}

      {!holding && isEditing && (
        <form className="monster-conc__form" onSubmit={start}>
          <input
            className="monster-conc__input"
            aria-label={`Spell ${combatant.name} is concentrating on`}
            placeholder="Spell (e.g. Hold Person)"
            maxLength={80}
            value={spell}
            onChange={(event) => setSpell(event.target.value)}
          />
          <Button type="submit" disabled={isBusy || !spell.trim()}>
            Start
          </Button>
          <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
}

export default MonsterConcentration;
