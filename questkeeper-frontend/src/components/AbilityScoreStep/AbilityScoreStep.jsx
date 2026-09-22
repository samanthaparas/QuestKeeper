import { useState } from "react";
import {
  ABILITY_SCORES,
  STANDARD_ARRAY,
  ABILITY_LABELS,
  ABILITY_DESCRIPTIONS,
  applyRaceBonuses,
  getAbilityModifier,
  rollAbilityScore,
} from "../../utils/characterSheet";
import "./AbilityScoreStep.css";
import Button from "../Button/Button";

function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function createEmptyAssignments() {
  return ABILITY_SCORES.reduce((acc, ability) => {
    acc[ability] = null;
    return acc;
  }, {});
}

function createEmptyRolledPool() {
  return Array.from({ length: 6 }, () => ({
    rolls: null,
    droppedIndex: null,
    total: null,
  }));
}

function poolValuesFor(scoreMethod, rolledPool) {
  if (scoreMethod === "roll") {
    return rolledPool
      .map((slot) => slot.total)
      .filter((total) => total !== null);
  }
  return STANDARD_ARRAY;
}

function optionsFor(ability, pool, assignments) {
  const current = assignments[ability];
  const allUsedValues = Object.values(assignments).filter((v) => v !== null);

  const remaining = [...pool];
  allUsedValues.forEach((used) => {
    const index = remaining.indexOf(used);
    if (index !== -1) remaining.splice(index, 1);
  });

  const options = current !== null ? [current, ...remaining] : remaining;
  return options.sort((a, b) => b - a);
}

function AbilityScoreStep({
  race,
  initialAssignments,
  initialChosenBonusAbilities,
  initialScoreMethod,
  initialRolledPool,
  onNext,
  onBack,
}) {
  const [scoreMethod, setScoreMethod] = useState(
    () => initialScoreMethod ?? "standard",
  );
  const [rolledPool, setRolledPool] = useState(
    () => initialRolledPool ?? createEmptyRolledPool(),
  );
  const [assignments, setAssignments] = useState(
    () => initialAssignments ?? createEmptyAssignments(),
  );
  const [chosenBonusAbilities, setChosenBonusAbilities] = useState(
    () => initialChosenBonusAbilities ?? [],
  );

  const pool = poolValuesFor(scoreMethod, rolledPool);
  const usedValues = Object.values(assignments).filter((v) => v !== null);
  const finalScores = applyRaceBonuses(assignments, race, chosenBonusAbilities);
  const needsBonusChoice = Boolean(race?.abilityScoreChoice);
  const hasMadeBonusChoice =
    !needsBonusChoice ||
    chosenBonusAbilities.length === race.abilityScoreChoice.choose;
  const poolIsReady =
    scoreMethod === "standard" ||
    rolledPool.every((slot) => slot.total !== null);
  const isComplete =
    poolIsReady &&
    usedValues.length === ABILITY_SCORES.length &&
    hasMadeBonusChoice;

  function handleAssign(ability, rawValue) {
    const value = rawValue === "" ? null : Number(rawValue);
    setAssignments((prev) => ({ ...prev, [ability]: value }));
  }

  function toggleBonusAbility(ability) {
    const maxChoices = race?.abilityScoreChoice?.choose ?? 0;

    setChosenBonusAbilities((prev) => {
      if (prev.includes(ability)) return prev.filter((a) => a !== ability);
      if (prev.length >= maxChoices) return prev;
      return [...prev, ability];
    });
  }

  function handleScoreMethodChange(method) {
    setScoreMethod(method);
    setAssignments(createEmptyAssignments());
  }

  function handleRollSlot(slotIndex) {
    const result = rollAbilityScore();
    setRolledPool((prev) =>
      prev.map((slot, index) => (index === slotIndex ? result : slot)),
    );
    setAssignments(createEmptyAssignments());
  }

  function handleManualSlotChange(slotIndex, rawValue) {
    const total = rawValue === "" ? null : Number(rawValue);
    setRolledPool((prev) =>
      prev.map((slot, index) =>
        index === slotIndex ? { rolls: null, droppedIndex: null, total } : slot,
      ),
    );
    setAssignments(createEmptyAssignments());
  }

  return (
    <div className="ability-score-step">
      <h2 className="ability-score-step__title">Assign Ability Scores</h2>

      <div className="ability-score-step__method-toggle">
        <button
          type="button"
          className={`ability-score-step__method-button${
            scoreMethod === "standard"
              ? " ability-score-step__method-button--active"
              : ""
          }`}
          onClick={() => handleScoreMethodChange("standard")}
        >
          Standard Array
        </button>
        <button
          type="button"
          className={`ability-score-step__method-button${
            scoreMethod === "roll"
              ? " ability-score-step__method-button--active"
              : ""
          }`}
          onClick={() => handleScoreMethodChange("roll")}
        >
          Roll for Stats
        </button>
      </div>

      {scoreMethod === "standard" && (
        <p className="ability-score-step__description">
          Assign each value from the standard array (15, 14, 13, 12, 10, 8) to
          one ability. {race?.name ?? "Your race"}'s bonuses are applied
          automatically below.
        </p>
      )}

      {scoreMethod === "roll" && (
        <>
          <p className="ability-score-step__description">
            Roll six scores (4d6, dropping the lowest die) and assign them
            below, or type in your own totals if you rolled physical dice.
          </p>

          <div className="ability-score-step__roll-pool">
            {rolledPool.map((slot, slotIndex) => (
              <div className="ability-score-step__roll-slot" key={slotIndex}>
                <Button
                  variant="secondary"
                  onClick={() => handleRollSlot(slotIndex)}
                >
                  Roll
                </Button>

                {slot.rolls && (
                  <span className="ability-score-step__roll-dice">
                    {slot.rolls.map((die, dieIndex) => (
                      <span
                        key={dieIndex}
                        className={`ability-score-step__die${
                          dieIndex === slot.droppedIndex
                            ? " ability-score-step__die--dropped"
                            : ""
                        }`}
                      >
                        {die}
                      </span>
                    ))}
                  </span>
                )}

                <input
                  type="number"
                  className="ability-score-step__roll-total"
                  placeholder="Total"
                  min={3}
                  max={18}
                  value={slot.total ?? ""}
                  onChange={(e) =>
                    handleManualSlotChange(slotIndex, e.target.value)
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="ability-score-step__grid">
        {ABILITY_SCORES.map((ability) => {
          const base = assignments[ability];
          const bonus = race?.abilityScoreIncreases?.[ability] ?? 0;
          const finalScore = finalScores[ability] ?? 0;

          return (
            <div className="ability-score-step__row" key={ability}>
              <div className="ability-score-step__label">
                <span className="ability-score-step__label-name">
                  {ABILITY_LABELS[ability]}
                </span>
                <span className="ability-score-step__label-hint">
                  {ABILITY_DESCRIPTIONS[ability]}
                </span>
              </div>

              <select
                className="ability-score-step__select"
                value={base ?? ""}
                onChange={(e) => handleAssign(ability, e.target.value)}
              >
                <option value="">--</option>
                {optionsFor(ability, pool, assignments).map((value, index) => (
                  <option key={`${value}-${index}`} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              {base !== null && (
                <span className="ability-score-step__preview">
                  {bonus > 0 && (
                    <span className="ability-score-step__bonus">
                      +{bonus} race
                    </span>
                  )}
                  <span className="ability-score-step__final">
                    {finalScore} (
                    {formatModifier(getAbilityModifier(finalScore))})
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {race?.abilityScoreChoice && (
        <div className="ability-score-step__bonus-choice">
          <p className="ability-score-step__bonus-choice-title">
            {race.name} lets you choose {race.abilityScoreChoice.choose} more
            abilities to increase by +1 each:
          </p>

          <div className="ability-score-step__bonus-checklist">
            {race.abilityScoreChoice.options.map(({ ability, bonus }) => (
              <label
                className="ability-score-step__bonus-checkbox"
                key={ability}
              >
                <input
                  type="checkbox"
                  checked={chosenBonusAbilities.includes(ability)}
                  disabled={
                    !chosenBonusAbilities.includes(ability) &&
                    chosenBonusAbilities.length >=
                      race.abilityScoreChoice.choose
                  }
                  onChange={() => toggleBonusAbility(ability)}
                />
                {ABILITY_LABELS[ability]} (+{bonus})
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="ability-score-step__nav">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>

        <Button
          disabled={!isComplete}
          onClick={() =>
            onNext(finalScores, {
              assignments,
              chosenBonusAbilities,
              scoreMethod,
              rolledPool,
            })
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default AbilityScoreStep;
