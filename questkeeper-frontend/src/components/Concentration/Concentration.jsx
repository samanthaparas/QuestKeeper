import { useId, useState } from "react";
import RuleTerm from "../RulesText/RuleTerm";
import Button from "../Button/Button";
import { formatModifier } from "../../utils/characterSheet";
import "./Concentration.css";

// Concentration, next to the conditions: which spell the character is
// concentrating on, and the Constitution save to keep it after taking damage.
//
// spell: the spell's name, or "" when not concentrating.
// spellNames: the character's spells, offered as suggestions.
// check: { dc } after damage while concentrating, else null.
// conSave: the character's Constitution save bonus.
// rounds: how many rounds the spell has left, or null for no timer (most
// concentration spells last 1 minute, which is 10 rounds). The sheet counts
// it down at the end of each of the character's own turns; onRoundsChange(n) sets it, 0 clears it.
// onStart(name), onEnd(), onRollCheck() (the sheet rolls and decides).
function Concentration({
  spell,
  spellNames = [],
  check,
  conSave,
  rounds = null,
  onStart,
  onEnd,
  onRollCheck,
  onRoundsChange,
}) {
  const [isPicking, setIsPicking] = useState(false);
  const [draft, setDraft] = useState("");
  const listId = useId();

  function start(event) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    onStart(name);
    setDraft("");
    setIsPicking(false);
  }

  return (
    <div className="concentration">
      {spell ? (
        <span className="concentration__badge">
          <span aria-hidden="true">🎯</span>{" "}
          <RuleTerm word="concentration">Concentrating</RuleTerm>: {spell}
          {onRoundsChange &&
            (typeof rounds === "number" ? (
              <span className="concentration__timer">
                <button
                  type="button"
                  aria-label={rounds === 1 ? `Take the timer off ${spell}` : `One less round of ${spell}`}
                  onClick={() => onRoundsChange(rounds - 1)}
                >
                  −
                </button>
                <span aria-live="polite">
                  ⏱ {rounds} {rounds === 1 ? "round" : "rounds"}
                </span>
                <button
                  type="button"
                  aria-label={`One more round of ${spell}`}
                  onClick={() => onRoundsChange(rounds + 1)}
                >
                  +
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="concentration__set-timer"
                aria-label={`Set how many rounds ${spell} lasts`}
                title="Set how many rounds it lasts (1 minute is 10 rounds)"
                onClick={() => onRoundsChange(10)}
              >
                ⏱
              </button>
            ))}
          <button
            type="button"
            className="concentration__end"
            aria-label={`Stop concentrating on ${spell}`}
            title="Stop concentrating"
            onClick={onEnd}
          >
            ×
          </button>
        </span>
      ) : isPicking ? (
        <form className="concentration__form" onSubmit={start}>
          <input
            className="concentration__input"
            aria-label="Spell you're concentrating on"
            placeholder="Which spell? (e.g. Bless)"
            list={listId}
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
          />
          <datalist id={listId}>
            {spellNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <Button type="submit" variant="secondary" disabled={!draft.trim()}>
            Start
          </Button>
          <Button type="button" variant="secondary" onClick={() => setIsPicking(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <button type="button" className="concentration__add" onClick={() => setIsPicking(true)}>
          + Concentrating
        </button>
      )}

      {/* After damage: the save to keep the spell going. */}
      {spell && check && (
        <span className="concentration__check" role="status">
          You took damage. Make a CON save, DC {check.dc}, to keep {spell}.
          <Button type="button" onClick={onRollCheck}>
            Roll CON save ({formatModifier(conSave)})
          </Button>
        </span>
      )}
    </div>
  );
}

export default Concentration;
