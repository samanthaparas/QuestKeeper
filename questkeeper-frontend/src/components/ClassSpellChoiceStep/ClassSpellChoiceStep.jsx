import { useState, useEffect } from "react";
import { getClassSpells, getClassLevel } from "../../utils/api";
import { getStartingSpellCounts } from "../../utils/characterSheet";
import "./ClassSpellChoiceStep.css";

function ClassSpellChoiceStep({
  characterClass,
  initialCantrips,
  initialSpells,
  onNext,
  onBack,
}) {
  const isCaster = Boolean(characterClass?.spellcastingType);

  const [classSpells, setClassSpells] = useState([]);
  const [spellCounts, setSpellCounts] = useState({ cantrips: 0, spells: 0 });
  const [isLoading, setIsLoading] = useState(isCaster);
  const [error, setError] = useState("");
  const [chosenCantrips, setChosenCantrips] = useState(
    () => initialCantrips ?? [],
  );
  const [chosenSpells, setChosenSpells] = useState(() => initialSpells ?? []);

  useEffect(() => {
    if (!isCaster) return;

    Promise.all([
      getClassSpells(characterClass.id),
      getClassLevel(characterClass.id, 1),
    ])
      .then(([spells, levelOne]) => {
        setClassSpells(spells);
        setSpellCounts(
          getStartingSpellCounts(characterClass.id, levelOne.spellcasting),
        );
      })
      .catch(() =>
        setError("Unable to load spell list. Please try again later."),
      )
      .finally(() => setIsLoading(false));
  }, [isCaster, characterClass?.id]);

  const cantripOptions = classSpells.filter((spell) => spell.level === 0);
  const spellOptions = classSpells.filter((spell) => spell.level === 1);

  const isComplete =
    chosenCantrips.length === spellCounts.cantrips &&
    chosenSpells.length === spellCounts.spells;
  const canProceed = !isCaster || error || (!isLoading && isComplete);

  function toggleChoice(list, setList, max, spellIndex) {
    setList((prev) => {
      if (prev.includes(spellIndex))
        return prev.filter((s) => s !== spellIndex);
      if (prev.length >= max) return prev;
      return [...prev, spellIndex];
    });
  }

  function handleNext() {
    const cantrips = cantripOptions.filter((spell) =>
      chosenCantrips.includes(spell.index),
    );
    const spells = spellOptions.filter((spell) =>
      chosenSpells.includes(spell.index),
    );
    onNext({ cantrips, spells });
  }

  return (
    <div className="class-spell-choice-step">
      <h2 className="class-spell-choice-step__title">Choose Starting Spells</h2>

      {!isCaster && (
        <p className="class-spell-choice-step__description">
          {characterClass?.name ?? "This class"} has no starting spells to
          choose.
        </p>
      )}

      {isCaster && isLoading && (
        <p className="class-spell-choice-step__description">
          Loading spell list...
        </p>
      )}

      {isCaster && error && (
        <p className="class-spell-choice-step__error">{error}</p>
      )}

      {isCaster && !isLoading && !error && spellCounts.cantrips === 0 && (
        <p className="class-spell-choice-step__description">
          {characterClass.name} has no starting spells to choose at level 1.
        </p>
      )}

      {isCaster && !isLoading && !error && spellCounts.cantrips > 0 && (
        <>
          <p className="class-spell-choice-step__description">
            {characterClass.name} starts with {spellCounts.cantrips} cantrip
            {spellCounts.cantrips === 1 ? "" : "s"}
            {spellCounts.spells > 0
              ? ` and ${spellCounts.spells} level 1 spell${spellCounts.spells === 1 ? "" : "s"}`
              : ""}
            .
          </p>

          <h3 className="class-spell-choice-step__section-title">
            Cantrips ({chosenCantrips.length}/{spellCounts.cantrips})
          </h3>
          <div className="class-spell-choice-step__checklist">
            {cantripOptions.map((spell) => (
              <label
                className="class-spell-choice-step__checkbox"
                key={spell.index}
              >
                <input
                  type="checkbox"
                  checked={chosenCantrips.includes(spell.index)}
                  disabled={
                    !chosenCantrips.includes(spell.index) &&
                    chosenCantrips.length >= spellCounts.cantrips
                  }
                  onChange={() =>
                    toggleChoice(
                      chosenCantrips,
                      setChosenCantrips,
                      spellCounts.cantrips,
                      spell.index,
                    )
                  }
                />
                {spell.name}
              </label>
            ))}
          </div>

          {spellCounts.spells > 0 && (
            <>
              <h3 className="class-spell-choice-step__section-title">
                Level 1 Spells ({chosenSpells.length}/{spellCounts.spells})
              </h3>
              <div className="class-spell-choice-step__checklist">
                {spellOptions.map((spell) => (
                  <label
                    className="class-spell-choice-step__checkbox"
                    key={spell.index}
                  >
                    <input
                      type="checkbox"
                      checked={chosenSpells.includes(spell.index)}
                      disabled={
                        !chosenSpells.includes(spell.index) &&
                        chosenSpells.length >= spellCounts.spells
                      }
                      onChange={() =>
                        toggleChoice(
                          chosenSpells,
                          setChosenSpells,
                          spellCounts.spells,
                          spell.index,
                        )
                      }
                    />
                    {spell.name}
                  </label>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="class-spell-choice-step__nav">
        <button
          className="class-spell-choice-step__back-button"
          type="button"
          onClick={onBack}
        >
          Back
        </button>

        <button
          className="class-spell-choice-step__next-button"
          type="button"
          disabled={!canProceed}
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default ClassSpellChoiceStep;
