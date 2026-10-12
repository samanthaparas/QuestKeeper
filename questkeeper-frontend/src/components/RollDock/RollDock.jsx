import { useEffect } from "react";
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
  const { lastRoll, mode, setMode, tableName, share, setShare } = roller;

  return (
    <div className="roll-dock">
      {lastRoll && <RollResult key={lastRoll.id} roll={lastRoll} roller={roller} />}

      <div className="roll-dock__bar" role="group" aria-label="Dice rolls">
        <span className="roll-dock__hint">Tap any underlined + number to roll it</span>
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
