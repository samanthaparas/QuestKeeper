import RuleTerm from "../RulesText/RuleTerm";
import Button from "../Button/Button";
import { EMPTY_DEATH_SAVES, getDeathSaveOutcome } from "../../utils/characterSheet";
import "./DeathSaves.css";

// Death saves, shown on the sheet while the character is at 0 HP: three
// success marks, three failure marks, and a button to roll one. Tapping a
// mark fills or clears it, for a roll made with real dice.
//
// deathSaves: { successes, failures }. onChange(nextDeathSaves).
// onRoll(): rolls a d20 and fills in the result (the sheet does the rolling,
// so it shows in the roll bar and the table's log like any other roll).
// lastResult: a short line about the latest roll ("Rolled 14: a success").
function DeathSaves({ deathSaves, onChange, onRoll, lastResult = "" }) {
  const marks = { ...EMPTY_DEATH_SAVES, ...deathSaves };
  const outcome = getDeathSaveOutcome(marks);

  // Tapping the 2nd mark when 2 are filled clears back to 1; otherwise fills
  // up to that mark.
  function setCount(kind, count) {
    const next = marks[kind] === count ? count - 1 : count;
    onChange({ ...marks, [kind]: next });
  }

  function renderMarks(kind, label) {
    return (
      <span className="death-saves__track" role="group" aria-label={label}>
        <span className="death-saves__track-label">{label}</span>
        {[1, 2, 3].map((count) => (
          <button
            type="button"
            key={count}
            className={`death-saves__mark death-saves__mark--${kind}`}
            aria-pressed={marks[kind] >= count}
            aria-label={`${label} ${count}`}
            onClick={() => setCount(kind, count)}
          >
            {marks[kind] >= count ? (kind === "successes" ? "✓" : "✗") : ""}
          </button>
        ))}
      </span>
    );
  }

  return (
    <section className="death-saves" aria-label="Death saves">
      <div className="death-saves__head">
        <h3 className="death-saves__title">
          <RuleTerm word="death saving throw">Death saves</RuleTerm>
        </h3>
        <span className="death-saves__hint">
          At 0 HP, roll on each of your turns: 10 or more is a success.
        </span>
      </div>

      <div className="death-saves__row">
        {renderMarks("successes", "Successes")}
        {renderMarks("failures", "Failures")}
        {!outcome && (
          <Button type="button" onClick={onRoll}>
            Roll death save
          </Button>
        )}
      </div>

      {lastResult && <p className="death-saves__result">{lastResult}</p>}
      {outcome === "stable" && (
        <p className="death-saves__outcome death-saves__outcome--stable">
          Stable. You stay at 0 HP but stop rolling. Any healing gets you back up.
        </p>
      )}
      {outcome === "dead" && (
        <p className="death-saves__outcome death-saves__outcome--dead">
          Three failures: your character has died. Tell your DM.
        </p>
      )}
    </section>
  );
}

export default DeathSaves;
