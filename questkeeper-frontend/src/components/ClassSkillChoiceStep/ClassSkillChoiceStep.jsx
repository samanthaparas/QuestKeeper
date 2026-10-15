import { useState } from "react";
import {
  SKILLS,
  SKILL_DESCRIPTIONS,
  ABILITY_ABBREVIATIONS,
} from "../../utils/characterSheet";
import "./ClassSkillChoiceStep.css";
import Button from "../Button/Button";

// backgroundChoice: optional { from, choose, options } for backgrounds that
// let you pick a skill (Innkeeper: Intimidation or Persuasion).
// grantedSkills: skills the character already has ({ index, name, from? }),
// like a background's or an Elf's Perception. Each can't be picked again.
// extraChoices: other "choose N skills" from the race, subrace or homebrew
// ([{ id, from, choose, options }]); initialExtraSelected: { [id]: [index] }.
// onNext(classPicks, backgroundPicks, { [id]: picks }).
function ClassSkillChoiceStep({
  characterClass,
  grantedSkills = [],
  grantedFrom,
  initialSelected,
  backgroundChoice,
  initialBackgroundSelected,
  extraChoices = [],
  initialExtraSelected = {},
  onNext,
  onBack,
}) {
  const skillChoice = characterClass?.skillChoice;
  const [chosenSkills, setChosenSkills] = useState(() => initialSelected ?? []);
  const [backgroundSkills, setBackgroundSkills] = useState(
    () => initialBackgroundSelected ?? [],
  );
  const [extraPicks, setExtraPicks] = useState(() => initialExtraSelected);

  const maxChoices = skillChoice?.choose ?? 0;
  const backgroundMax = backgroundChoice?.choose ?? 0;

  // Where a skill the character already has comes from, for the notes.
  const grantedSource = (index) =>
    grantedSkills.find((skill) => skill.index === index)?.from ?? grantedFrom ?? "your background";
  // Which extra choice (race, subrace...) a skill was picked in, if any.
  const extraOwner = (index, exceptId = null) =>
    extraChoices.find(
      (choice) => choice.id !== exceptId && (extraPicks[choice.id] ?? []).includes(index),
    );

  // Background and extra picks count as "already have it" for the class list.
  const grantedIndexes = new Set([
    ...grantedSkills.map((skill) => skill.index),
    ...backgroundSkills,
    ...extraChoices.flatMap((choice) => extraPicks[choice.id] ?? []),
  ]);
  const isComplete =
    chosenSkills.length === maxChoices &&
    backgroundSkills.length === backgroundMax &&
    extraChoices.every((choice) => (extraPicks[choice.id] ?? []).length === choice.choose);

  function toggleExtra(choice, skillIndex) {
    setExtraPicks((prev) => {
      const current = prev[choice.id] ?? [];
      if (current.includes(skillIndex)) {
        return { ...prev, [choice.id]: current.filter((s) => s !== skillIndex) };
      }
      if (current.length >= choice.choose) return prev;
      return { ...prev, [choice.id]: [...current, skillIndex] };
    });
  }

  function toggleBackgroundSkill(skillIndex) {
    setBackgroundSkills((prev) => {
      if (prev.includes(skillIndex))
        return prev.filter((s) => s !== skillIndex);
      if (prev.length >= backgroundMax) return prev;
      return [...prev, skillIndex];
    });
  }

  function toggleSkill(skillIndex) {
    setChosenSkills((prev) => {
      if (prev.includes(skillIndex))
        return prev.filter((s) => s !== skillIndex);
      if (prev.length >= maxChoices) return prev;
      return [...prev, skillIndex];
    });
  }

  function handleNext() {
    const selected = (skillChoice?.options ?? []).filter((option) =>
      chosenSkills.includes(option.index),
    );
    const fromBackground = (backgroundChoice?.options ?? []).filter((option) =>
      backgroundSkills.includes(option.index),
    );
    const fromExtras = Object.fromEntries(
      extraChoices.map((choice) => [
        choice.id,
        choice.options.filter((option) => (extraPicks[choice.id] ?? []).includes(option.index)),
      ]),
    );
    onNext(selected, fromBackground, fromExtras);
  }

  return (
    <div className="class-skill-choice-step">
      <h2 className="class-skill-choice-step__title">
        Choose Skill Proficiencies
      </h2>

      {grantedSkills.length > 0 && (
        <p className="class-skill-choice-step__description">
          You already have:{" "}
          {grantedSkills
            .map((skill) => `${skill.name} (${skill.from ?? grantedFrom ?? "your background"})`)
            .join(", ")}
          .
        </p>
      )}

      {backgroundChoice && (
        <section className="class-skill-choice-step__section">
          <p className="class-skill-choice-step__description">
            {backgroundChoice.from} lets you choose {backgroundMax} skill
            {backgroundMax === 1 ? "" : "s"}:
          </p>

          <div className="class-skill-choice-step__checklist">
            {backgroundChoice.options.map((skill) => {
              const isPicked = backgroundSkills.includes(skill.index);
              // Can't pick a skill you already have from the class list.
              const isTaken =
                chosenSkills.includes(skill.index) ||
                grantedSkills.some((granted) => granted.index === skill.index) ||
                Boolean(extraOwner(skill.index));
              const isLocked =
                isTaken || (!isPicked && backgroundSkills.length >= backgroundMax);

              return (
                <label
                  className={`class-skill-choice-step__checkbox${isLocked ? " class-skill-choice-step__checkbox--locked" : ""}${isPicked ? " class-skill-choice-step__checkbox--picked" : ""}`}
                  key={skill.index}
                >
                  <input
                    type="checkbox"
                    checked={isPicked}
                    disabled={isLocked}
                    onChange={() => toggleBackgroundSkill(skill.index)}
                  />
                  <span>
                    {skill.name}
                    {isTaken && (
                      <span className="class-skill-choice-step__note">
                        You already have this one
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {extraChoices.map((choice) => {
        const picks = extraPicks[choice.id] ?? [];
        return (
          <section className="class-skill-choice-step__section" key={choice.id}>
            <p className="class-skill-choice-step__description">
              {choice.from} lets you choose {choice.choose} skill
              {choice.choose === 1 ? "" : "s"}:
            </p>
            <p className="class-skill-choice-step__counter">
              Chosen {picks.length} of {choice.choose}
            </p>
            <div className="class-skill-choice-step__checklist">
              {choice.options.map((skill) => {
                const isPicked = picks.includes(skill.index);
                // Already yours from somewhere else: can't be picked twice.
                const takenBy = grantedSkills.some((granted) => granted.index === skill.index)
                  ? grantedSource(skill.index)
                  : backgroundSkills.includes(skill.index)
                    ? backgroundChoice?.from
                    : chosenSkills.includes(skill.index)
                      ? characterClass?.name
                      : extraOwner(skill.index, choice.id)?.from;
                const isLocked = Boolean(takenBy) || (!isPicked && picks.length >= choice.choose);
                return (
                  <label
                    className={`class-skill-choice-step__checkbox${isLocked ? " class-skill-choice-step__checkbox--locked" : ""}${isPicked ? " class-skill-choice-step__checkbox--picked" : ""}`}
                    key={skill.index}
                  >
                    <input
                      type="checkbox"
                      checked={isPicked}
                      disabled={isLocked}
                      onChange={() => toggleExtra(choice, skill.index)}
                    />
                    <span>
                      {skill.name}
                      {takenBy && (
                        <span className="class-skill-choice-step__note">Already from {takenBy}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        );
      })}

      {skillChoice ? (
        <>
          <p className="class-skill-choice-step__description">
            {characterClass.name} lets you choose {skillChoice.choose} skill
            {skillChoice.choose === 1 ? "" : "s"} to be proficient in:
          </p>

          <p className="class-skill-choice-step__counter">
            Chosen {chosenSkills.length} of {maxChoices}
            {chosenSkills.length === maxChoices
              ? ". Untick one to pick a different skill."
              : ""}
          </p>

          <div className="class-skill-choice-step__checklist">
            {skillChoice.options.map((skill) => {
              const isGranted = grantedIndexes.has(skill.index);
              const details = SKILLS.find((item) => item.index === skill.index);
              const isLocked =
                isGranted ||
                (!chosenSkills.includes(skill.index) &&
                  chosenSkills.length >= maxChoices);

              return (
                <label
                  className={`class-skill-choice-step__checkbox${isLocked ? " class-skill-choice-step__checkbox--locked" : ""
                    }${chosenSkills.includes(skill.index)
                      ? " class-skill-choice-step__checkbox--picked"
                      : ""
                    }`}
                  key={skill.index}
                >
                  <input
                    type="checkbox"
                    checked={chosenSkills.includes(skill.index)}
                    disabled={
                      isGranted ||
                      (!chosenSkills.includes(skill.index) &&
                        chosenSkills.length >= maxChoices)
                    }
                    onChange={() => toggleSkill(skill.index)}
                  />
                  <span>
                    {skill.name}
                    {details && (
                      <span className="class-skill-choice-step__ability">
                        {" "}
                        ({ABILITY_ABBREVIATIONS[details.ability]})
                      </span>
                    )}
                    {isGranted ? (
                      <span className="class-skill-choice-step__note">
                        Already from {backgroundSkills.includes(skill.index)
                          ? backgroundChoice.from
                          : (extraOwner(skill.index)?.from ?? grantedSource(skill.index))}
                      </span>
                    ) : (
                      SKILL_DESCRIPTIONS[skill.index] && (
                        <span className="class-skill-choice-step__note">
                          {SKILL_DESCRIPTIONS[skill.index]}
                        </span>
                      )
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      ) : (
        <p className="class-skill-choice-step__description">
          {characterClass?.name ?? "This class"} has no skill choice to make.
        </p>
      )}

      <div className="class-skill-choice-step__nav">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>

        <Button disabled={!isComplete} onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

export default ClassSkillChoiceStep;
