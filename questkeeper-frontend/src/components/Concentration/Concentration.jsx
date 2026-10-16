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
// onStart(name), onEnd(), onRollCheck() (the sheet rolls and decides).
function Concentration({ spell, spellNames = [], check, conSave, onStart, onEnd, onRollCheck }) {
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
