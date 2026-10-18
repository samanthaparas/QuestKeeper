import { useEffect, useId, useRef, useState } from "react";
import RuleTerm from "../RulesText/RuleTerm";
import {
  CONDITION_KEYS,
  MAX_EXHAUSTION,
  EXHAUSTION_LEVELS,
  conditionWord,
  hasCondition,
  setConditionRounds,
  setExhaustion,
  toggleCondition,
} from "../../utils/conditions";
import "./ConditionBadges.css";

// The conditions on a character (Prone, Poisoned...) as badges. Hover or tap
// a name for what it does; x takes it off; "+ Condition" adds one.
// Exhaustion has a level from 1 to 6.
//
// conditions: [{ key, level? }]. onChange(nextConditions).
// readOnly: just the badges (the DM's view of a player's card).
//
// Any condition can be timed: ⏱ gives it a number of rounds, which go down
// at the end of each of the character's own turns (the sheet does the counting). − at 1 round
// takes the timer off but keeps the condition.
function ConditionBadges({ conditions = [], onChange, readOnly = false }) {
  const [isPicking, setIsPicking] = useState(false);
  const pickerId = useId();
  const rootRef = useRef(null);

  // A click elsewhere closes the picker.
  useEffect(() => {
    if (!isPicking) return undefined;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setIsPicking(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isPicking]);

  if (readOnly && conditions.length === 0) return null;
  const available = CONDITION_KEYS.filter((key) => !hasCondition(conditions, key));

  return (
    <div
      ref={rootRef}
      className="condition-badges"
      onKeyDown={(event) => event.key === "Escape" && setIsPicking(false)}
    >
      <span className="condition-badges__label">Conditions</span>

      {conditions.length === 0 && <span className="condition-badges__none">None</span>}

      <ul className="condition-badges__list">
        {conditions.map((condition) => {
          const word = conditionWord(condition.key);
          if (!word) return null;
          const isExhaustion = condition.key === "exhaustion";
          return (
            <li key={condition.key} className="condition-badges__badge">
              <RuleTerm word={word}>
                {word.name}
                {isExhaustion ? ` ${condition.level ?? 1}` : ""}
              </RuleTerm>
              {isExhaustion && !readOnly && (
                <span className="condition-badges__steps">
                  <button
                    type="button"
                    aria-label="One less level of exhaustion"
                    onClick={() => onChange(setExhaustion(conditions, (condition.level ?? 1) - 1))}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    aria-label="One more level of exhaustion"
                    disabled={(condition.level ?? 1) >= MAX_EXHAUSTION}
                    onClick={() => onChange(setExhaustion(conditions, (condition.level ?? 1) + 1))}
                  >
                    +
                  </button>
                </span>
              )}
              {typeof condition.rounds === "number" && readOnly && (
                <span className="condition-badges__rounds">
                  · {condition.rounds} {condition.rounds === 1 ? "round" : "rounds"} left
                </span>
              )}
              {!readOnly &&
                (typeof condition.rounds === "number" ? (
                  <span className="condition-badges__steps condition-badges__timer">
                    <button
                      type="button"
                      aria-label={
                        condition.rounds === 1
                          ? `Take the timer off ${word.name}`
                          : `One less round of ${word.name}`
                      }
                      onClick={() => onChange(setConditionRounds(conditions, condition.key, condition.rounds - 1))}
                    >
                      −
                    </button>
                    <span className="condition-badges__rounds" aria-live="polite" title="Counts down at the end of your turn">
                      ⏱ {condition.rounds} {condition.rounds === 1 ? "round" : "rounds"}
                    </span>
                    <button
                      type="button"
                      aria-label={`One more round of ${word.name}`}
                      onClick={() => onChange(setConditionRounds(conditions, condition.key, condition.rounds + 1))}
                    >
                      +
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="condition-badges__set-timer"
                    aria-label={`Set how many rounds ${word.name} lasts`}
                    title="Set how many rounds it lasts"
                    onClick={() => onChange(setConditionRounds(conditions, condition.key, 1))}
                  >
                    ⏱
                  </button>
                ))}
              {!readOnly && (
                <button
                  type="button"
                  className="condition-badges__remove"
                  aria-label={`Remove ${word.name}`}
                  onClick={() => onChange(toggleCondition(conditions, condition.key))}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* What the level means, so nobody has to look it up. */}
      {(() => {
        const exhaustion = conditions.find((condition) => condition.key === "exhaustion");
        if (!exhaustion) return null;
        const level = exhaustion.level ?? 1;
        return (
          <details className="condition-badges__exhaustion">
            <summary>
              What does exhaustion level {level} do?
            </summary>
            <p className="condition-badges__exhaustion-now">
              {EXHAUSTION_LEVELS[level - 1].effect}
              {level > 1 && " You also have everything from the lower levels."}
            </p>
            <ol className="condition-badges__exhaustion-list">
              {EXHAUSTION_LEVELS.map((entry) => (
                <li
                  key={entry.level}
                  className={entry.level === level ? "condition-badges__exhaustion-current" : undefined}
                  aria-current={entry.level === level ? "true" : undefined}
                >
                  <b>Level {entry.level}.</b> {entry.effect}
                </li>
              ))}
            </ol>
            <p className="condition-badges__exhaustion-rest">A long rest takes away one level.</p>
          </details>
        );
      })()}

      {!readOnly && available.length > 0 && (
        <div className="condition-badges__add">
          <button
            type="button"
            className="condition-badges__add-button"
            aria-expanded={isPicking}
            aria-controls={pickerId}
            onClick={() => setIsPicking((open) => !open)}
          >
            + Condition
          </button>
          {isPicking && (
            <ul id={pickerId} className="condition-badges__picker" aria-label="Add a condition">
              {available.map((key) => {
                const word = conditionWord(key);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className="condition-badges__option"
                      onClick={() => {
                        onChange(toggleCondition(conditions, key));
                        setIsPicking(false);
                      }}
                    >
                      <b>{word.name}</b>{" "}
                      <span>{word.meaning}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ConditionBadges;
