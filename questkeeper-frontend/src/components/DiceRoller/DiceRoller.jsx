import { useState } from "react";
import { rollD20, rollDie } from "../../utils/characterSheet";
import "./DiceRoller.css";

const DICE = [4, 6, 8, 10, 12, 20];

const D20_MODES = [
  { mode: "advantage", label: "d20 with advantage" },
  { mode: "disadvantage", label: "d20 with disadvantage" },
];

function DiceRoller() {
  const [lastRoll, setLastRoll] = useState(null);

  function rollSingle(sides) {
    const result = rollDie(sides);
    setLastRoll({ label: `d${sides}`, sides, rolls: [result], result });
  }

  function rollWithMode({ mode, label }) {
    setLastRoll({ label, sides: 20, ...rollD20(mode) });
  }

  const keptIndex = lastRoll ? lastRoll.rolls.indexOf(lastRoll.result) : -1;
  const isNatural20 = lastRoll?.sides === 20 && lastRoll.result === 20;
  const isNatural1 = lastRoll?.sides === 20 && lastRoll.result === 1;

  return (
    <div className="dice-roller">
      <div className="dice-roller__buttons">
        {DICE.map((sides) => (
          <button
            key={sides}
            type="button"
            className="dice-roller__die"
            onClick={() => rollSingle(sides)}
          >
            d{sides}
          </button>
        ))}
      </div>
      <div className="dice-roller__buttons">
        {D20_MODES.map((option) => (
          <button
            key={option.mode}
            type="button"
            className="dice-roller__die"
            onClick={() => rollWithMode(option)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="dice-roller__result" aria-live="polite">
        {lastRoll ? (
          <>
            <span className="dice-roller__label">{lastRoll.label}</span>
            {lastRoll.rolls.length > 1 && (
              <span className="dice-roller__rolls">
                {lastRoll.rolls.map((roll, index) => (
                  <span
                    key={index}
                    className={`dice-roller__roll${
                      index === keptIndex ? "" : " dice-roller__roll--dropped"
                    }`}
                  >
                    {roll}
                  </span>
                ))}
              </span>
            )}
            <span className="dice-roller__total">{lastRoll.result}</span>
            {isNatural20 && (
              <span className="dice-roller__note">Natural 20!</span>
            )}
            {isNatural1 && <span className="dice-roller__note">Natural 1</span>}
          </>
        ) : (
          <span className="dice-roller__hint">Pick a die to roll it.</span>
        )}
      </div>
    </div>
  );
}

export default DiceRoller;
