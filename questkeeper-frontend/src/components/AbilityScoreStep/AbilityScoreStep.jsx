import { useState } from "react";
import {
  ABILITY_SCORES,
  STANDARD_ARRAY,
  ABILITY_LABELS,
  applyRaceBonuses,
  getAbilityModifier,
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

function AbilityScoreStep({
  race,
  initialAssignments,
  initialChosenBonusAbilities,
  onNext,
  onBack,
}) {
  const [assignments, setAssignments] = useState(
    () => initialAssignments ?? createEmptyAssignments(),
  );
  const [chosenBonusAbilities, setChosenBonusAbilities] = useState(
    () => initialChosenBonusAbilities ?? [],
  );

  const usedValues = Object.values(assignments).filter((v) => v !== null);
  const finalScores = applyRaceBonuses(assignments, race, chosenBonusAbilities);
  const needsBonusChoice = Boolean(race?.abilityScoreChoice);
  const hasMadeBonusChoice =
    !needsBonusChoice ||
    chosenBonusAbilities.length === race.abilityScoreChoice.choose;
  const isComplete =
    usedValues.length === ABILITY_SCORES.length && hasMadeBonusChoice;

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

  function optionsFor(ability) {
    const current = assignments[ability];
    const remaining = STANDARD_ARRAY.filter((v) => !usedValues.includes(v));
    const options = current !== null ? [current, ...remaining] : remaining;
    return [...new Set(options)].sort((a, b) => b - a);
  }

  return (
    <div className="ability-score-step">
      <h2 className="ability-score-step__title">Assign Ability Scores</h2>
      <p className="ability-score-step__description">
        Assign each value from the standard array (15, 14, 13, 12, 10, 8) to one
        ability. {race?.name ?? "Your race"}'s bonuses are applied automatically
        below.
      </p>

      <div className="ability-score-step__grid">
        {ABILITY_SCORES.map((ability) => {
          const base = assignments[ability];
          const bonus = race?.abilityScoreIncreases?.[ability] ?? 0;
          const finalScore = finalScores[ability] ?? 0;

          return (
            <div className="ability-score-step__row" key={ability}>
              <span className="ability-score-step__label">
                {ABILITY_LABELS[ability]}
              </span>

              <select
                className="ability-score-step__select"
                value={base ?? ""}
                onChange={(e) => handleAssign(ability, e.target.value)}
              >
                <option value="">--</option>
                {optionsFor(ability).map((value) => (
                  <option key={value} value={value}>
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
            onNext(finalScores, { assignments, chosenBonusAbilities })
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default AbilityScoreStep;
