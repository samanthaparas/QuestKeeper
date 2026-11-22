import { useState, useEffect } from "react";
import { getClassSpells, getClassLevel } from "../../utils/api";
import { getStartingSpellCounts } from "../../utils/characterSheet";
import "./ClassSpellChoiceStep.css";
import Button from "../Button/Button";
import SpellChoiceOption from "../SpellChoiceOption/SpellChoiceOption";
import InlineLoading from "../StatusNote/InlineLoading";

function ClassSpellChoiceStep({
  characterClass,
  knownCantrip,
  knownCantripSource,
  initialCantrips,
  initialSpells,
  onNext,
  onBack,
  // The table this character is for doesn't allow some spells (see
  // creationTable.js): isBlocked(spell) and the table's name. They're hidden
  // unless already chosen, with a "Show them" link.
  isBlocked = null,
  blockedAt = "",
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
          getStartingSpellCounts(characterClass, levelOne.spellcasting),
        );
      })
      .catch(() =>
        setError("Unable to load spell list. Please try again later."),
      )
      .finally(() => setIsLoading(false));
  }, [isCaster, characterClass]);

  const cantripOptions = classSpells.filter((spell) => spell.level === 0);
  const spellOptions = classSpells.filter((spell) => spell.level === 1);
  const [showBlocked, setShowBlocked] = useState(false);
  const blockedCount = isBlocked ? [...cantripOptions, ...spellOptions].filter((spell) => isBlocked(spell)).length : 0;
  // What's on screen: not-allowed spells stay hidden unless asked for, or
  // already picked (so a choice never vanishes).
  const shown = (spell, chosen) => showBlocked || !isBlocked?.(spell) || chosen.includes(spell.index);

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
      <h1 className="class-spell-choice-step__title">Choose Starting Spells</h1>

      {!isCaster && (
        <p className="class-spell-choice-step__description">
          {characterClass?.name ?? "This class"} has no starting spells to
          choose.
        </p>
      )}

      {isCaster && isLoading && (
        <InlineLoading className="class-spell-choice-step__description">
          Loading spell list...
        </InlineLoading>
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

          {blockedCount > 0 && (
            <p className="class-spell-choice-step__blocked" role="note">
              {showBlocked
                ? `Showing ${blockedCount} not allowed at ${blockedAt}.`
                : `${blockedCount} not allowed at ${blockedAt} ${blockedCount === 1 ? "is" : "are"} hidden.`}{" "}
              <button
                type="button"
                className="class-spell-choice-step__blocked-toggle"
                onClick={() => setShowBlocked((open) => !open)}
              >
                {showBlocked ? "Hide them" : "Show them"}
              </button>
            </p>
          )}

          <h3 className="class-spell-choice-step__section-title">
            Cantrips ({chosenCantrips.length}/{spellCounts.cantrips})
          </h3>
          <div className="class-spell-choice-step__checklist">
            {cantripOptions.filter((spell) => shown(spell, chosenCantrips)).map((spell) => {
              const isAlreadyKnown = spell.index === knownCantrip?.index;

              return (
                <SpellChoiceOption
                  key={spell.index}
                  spell={spell}
                  checked={chosenCantrips.includes(spell.index)}
                  disabled={
                    isAlreadyKnown ||
                    (!chosenCantrips.includes(spell.index) &&
                      chosenCantrips.length >= spellCounts.cantrips)
                  }
                  note={
                    isAlreadyKnown
                      ? `Already known from ${knownCantripSource}`
                      : isBlocked?.(spell)
                        ? `Not allowed at ${blockedAt}`
                        : undefined
                  }
                  onToggle={() =>
                    toggleChoice(
                      chosenCantrips,
                      setChosenCantrips,
                      spellCounts.cantrips,
                      spell.index,
                    )
                  }
                />
              );
            })}
          </div>

          {spellCounts.spells > 0 && (
            <>
              <h3 className="class-spell-choice-step__section-title">
                Level 1 Spells ({chosenSpells.length}/{spellCounts.spells})
              </h3>
              <div className="class-spell-choice-step__checklist">
                {spellOptions.filter((spell) => shown(spell, chosenSpells)).map((spell) => (
                  <SpellChoiceOption
                    key={spell.index}
                    spell={spell}
                    note={isBlocked?.(spell) ? `Not allowed at ${blockedAt}` : undefined}
                    checked={chosenSpells.includes(spell.index)}
                    disabled={
                      !chosenSpells.includes(spell.index) &&
                      chosenSpells.length >= spellCounts.spells
                    }
                    onToggle={() =>
                      toggleChoice(
                        chosenSpells,
                        setChosenSpells,
                        spellCounts.spells,
                        spell.index,
                      )
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div className="class-spell-choice-step__nav">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>

        <Button disabled={!canProceed} onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

export default ClassSpellChoiceStep;
