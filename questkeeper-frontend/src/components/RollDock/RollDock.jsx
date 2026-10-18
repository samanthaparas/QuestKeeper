import { useEffect, useId, useState } from "react";
import { describeDiceNeeded, diceNeeded } from "../../utils/attacks";
import { useRoller } from "./rollContext";
import "./RollDock.css";

const MODE_LABELS = { normal: "Normal", advantage: "Advantage", disadvantage: "Disadvantage" };
// What each mode does, on hover and under the bar while it's picked.
const MODE_HINTS = {
  normal: "One d20.",
  advantage: "Next roll: two d20s, keep the higher. Then back to Normal.",
  disadvantage: "Next roll: two d20s, keep the lower. Then back to Normal.",
};
// How long a roll stays up before tucking itself away.
const SHOW_MS = 12000;

// Bottom corner of the character sheet: the latest roll (dice, total, and a
// flourish for a natural 20 or 1), the next d20's mode, and whether rolls
// are shared with the character's table.
function RollDock() {
  const roller = useRoller();
  const rollId = roller?.lastRoll?.id;
  const dismiss = roller?.dismiss;

  useEffect(() => {
    if (!rollId) return undefined;
    const timer = setTimeout(dismiss, SHOW_MS);
    return () => clearTimeout(timer);
    // A new roll restarts the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId]);

  if (!roller) return null;
  const { lastRoll, mode, setMode, tableName, share, setShare, conditionNotes = [] } = roller;
  const { realDice, setRealDice, pending } = roller;

  return (
    <div className="roll-dock">
      {pending && <RealDiceEntry key={`${pending.label}-${pending.type}`} roller={roller} />}
      {lastRoll && <RollResult key={lastRoll.id} roll={lastRoll} roller={roller} />}

      <DiceHelp />

      <div className="roll-dock__bar" role="group" aria-label="Dice rolls">
        <span className="roll-dock__hint">
          {realDice
            ? "Tap any underlined number, then type what your dice show"
            : "Tap any underlined + number to roll it"}
        </span>
        {/* Who rolls: the app, or you with real dice (the app adds the bonus). */}
        {setRealDice && (
          <div className="roll-dock__modes" role="radiogroup" aria-label="Who rolls the dice">
            <button
              type="button"
              role="radio"
              aria-checked={!realDice}
              className="roll-dock__mode"
              title="The app rolls for you"
              onClick={() => setRealDice(false)}
            >
              App rolls
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={Boolean(realDice)}
              className="roll-dock__mode"
              title="You roll real dice and type the numbers; the app adds your bonus"
              onClick={() => setRealDice(true)}
            >
              I roll real dice
            </button>
          </div>
        )}
        <span className="roll-dock__label" aria-hidden="true">
          Next d20:
        </span>
        <div className="roll-dock__modes" role="radiogroup" aria-label="Next d20">
          {Object.entries(MODE_LABELS).map(([value, text]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              className="roll-dock__mode"
              title={MODE_HINTS[value]}
              onClick={() => setMode(value)}
            >
              {text}
            </button>
          ))}
        </div>
        {/* Conditions that change your rolls: "Poisoned: disadvantage on...". */}
        {conditionNotes.length > 0 && (
          <span className="roll-dock__condition">
            {conditionNotes.map((entry) => `${entry.name}: ${entry.note}.`).join(" ")}
            {mode !== "disadvantage" && (
              <button type="button" className="roll-dock__condition-use" onClick={() => setMode("disadvantage")}>
                Use Disadvantage
              </button>
            )}
          </span>
        )}
        {/* Advantage or disadvantage says what it'll do, so it's never a mystery. */}
        {mode !== "normal" && (
          <span className="roll-dock__mode-hint" aria-live="polite">
            {MODE_HINTS[mode]}
          </span>
        )}
        {tableName && (
          <label className="roll-dock__share">
            <input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} />
            Share with {tableName}
          </label>
        )}
      </div>
    </div>
  );
}

// A short, plain-language explanation for people new to the dice.
function DiceHelp() {
  return (
    <details className="roll-dock__help">
      <summary>New to dice? What does this mean?</summary>
      <div className="roll-dock__help-body">
        <p>
          <strong>d20</strong> is a 20-sided die. For most checks, saves and attacks you roll one d20 and
          add the bonus shown on the number you tapped. That total is compared with a target number: the
          DM&apos;s DC, or an enemy&apos;s armor (AC). Higher is better.
        </p>
        <p>
          <strong>Natural 20 or natural 1</strong> means the number on the die itself, before any bonus.
          A natural 20 on an attack is a critical hit.
        </p>
        <p>
          <strong>Advantage</strong> means roll two d20 and keep the higher one. <strong>Disadvantage</strong>{" "}
          means keep the lower one.
        </p>
        <p>
          <strong>Damage</strong> uses other dice: 2d6 means roll two six-sided dice and add them up, then
          add any bonus.
        </p>
        <p>
          <strong>Rolling real dice?</strong> Choose &ldquo;I roll real dice&rdquo;, tap a number, and type
          what each die shows. The app adds everything up and your bonus for you.
        </p>
      </div>
    </details>
  );
}

// Asks for the numbers on the player's own dice: one d20 for a check (two
// with advantage or disadvantage), or one number per damage die.
function RealDiceEntry({ roller }) {
  const { pending, mode, submitRealDice, cancelRealDice } = roller;
  const inputId = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  let prompt;
  let placeholder;
  if (pending.type === "check") {
    prompt =
      mode === "normal"
        ? "Type the number on your d20."
        : `You have ${mode}: type both d20 numbers, like 14, 7.`;
    placeholder = mode === "normal" ? "d20" : "14, 7";
  } else {
    const needed = diceNeeded(pending.damage).reduce((sum, { count }) => sum + count, 0);
    prompt = `Type the number on each die (${needed} ${needed === 1 ? "number" : "numbers"} for ${describeDiceNeeded(
      pending.damage,
    )}), separated by commas. We add them up and your bonus${pending.crit ? ", and double the dice for the critical hit" : ""}.`;
    placeholder = "6, 2, 3, ...";
  }

  function handleSubmit(event) {
    event.preventDefault();
    const problem = submitRealDice(text);
    if (problem) setError(problem);
  }

  return (
    <form className="real-dice" onSubmit={handleSubmit} aria-label={`${pending.label}: your dice`}>
      <label className="real-dice__label" htmlFor={inputId}>
        <strong>{pending.label}</strong>
        <span>{prompt}</span>
      </label>
      <div className="real-dice__row">
        <input
          id={inputId}
          className="real-dice__input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder={placeholder}
          value={text}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
          }}
        />
        <button type="submit" className="real-dice__go" disabled={text.trim() === ""}>
          Use my roll
        </button>
        <button type="button" className="real-dice__cancel" onClick={cancelRealDice}>
          Cancel
        </button>
      </div>
      {error && (
        <p className="real-dice__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

const STATUS_TEXT = {
  sharing: "Sharing with your table...",
  shared: "Shared with your table",
  failed: "Couldn't share this one",
  private: "Only you saw this",
};

function RollResult({ roll, roller }) {
  const flourish = roll.isNatural20 ? " roll-result--twenty" : roll.isNatural1 ? " roll-result--one" : "";
  const keptIndex = roll.rolls ? roll.rolls.indexOf(roll.natural) : -1;

  return (
    <section className={`roll-result${flourish}`} aria-live="polite" aria-label={`${roll.label} roll`}>
      <button type="button" className="roll-result__close" aria-label="Hide this roll" onClick={roller.dismiss}>
        ×
      </button>
      <p className="roll-result__label">{roll.label}</p>
      <p className="roll-result__total">{roll.total}</p>

      {/* With advantage or disadvantage, both d20s show; the dropped one fades. */}
      {roll.rolls?.length > 1 ? (
        <p className="roll-result__detail">
          {roll.rolls.map((value, index) => (
            <span
              key={index}
              className={`roll-result__die${index === keptIndex ? "" : " roll-result__die--dropped"}`}
            >
              {value}
            </span>
          ))}
          <span>{roll.bonus !== 0 && `${roll.bonus < 0 ? "−" : "+"} ${Math.abs(roll.bonus)}`}</span>
        </p>
      ) : (
        <p className="roll-result__detail">{roll.detail}</p>
      )}

      {roll.isNatural20 && <p className="roll-result__note">Natural 20!</p>}
      {roll.isNatural1 && <p className="roll-result__note">Natural 1</p>}

      {roll.isNatural20 && roll.attack?.damage && (
        <button
          type="button"
          className="roll-result__follow"
          onClick={() => roller.rollDamage(`${roll.attack.name} damage`, roll.attack.damage, { crit: true })}
        >
          Roll critical damage
        </button>
      )}

      <p className="roll-result__status">{STATUS_TEXT[roll.status]}</p>
    </section>
  );
}

export default RollDock;
