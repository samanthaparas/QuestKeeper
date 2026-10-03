import { useState } from "react";
import {
  SKILLS,
  SKILL_DESCRIPTIONS,
  ABILITY_ABBREVIATIONS,
} from "../../utils/characterSheet";
import "./ClassSkillChoiceStep.css";
import Button from "../Button/Button";

function ClassSkillChoiceStep({
  characterClass,
  grantedSkills = [],
  grantedFrom,
  initialSelected,
  onNext,
  onBack,
}) {
  const skillChoice = characterClass?.skillChoice;
  const [chosenSkills, setChosenSkills] = useState(() => initialSelected ?? []);

  const maxChoices = skillChoice?.choose ?? 0;
  const grantedIndexes = new Set(grantedSkills.map((skill) => skill.index));
  const isComplete = chosenSkills.length === maxChoices;

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
    onNext(selected);
  }

  return (
    <div className="class-skill-choice-step">
      <h2 className="class-skill-choice-step__title">
        Choose Skill Proficiencies
      </h2>

      {skillChoice ? (
        <>
          <p className="class-skill-choice-step__description">
            {characterClass.name} lets you choose {skillChoice.choose} skill
            {skillChoice.choose === 1 ? "" : "s"} to be proficient in:
          </p>

          <p className="class-skill-choice-step__hint">
            Not sure? Perception and Stealth come up in almost every adventure.
            The letters show which ability a skill uses.
          </p>

          <div className="class-skill-choice-step__checklist">
            {skillChoice.options.map((skill) => {
              const isGranted = grantedIndexes.has(skill.index);
              const details = SKILLS.find((item) => item.index === skill.index);

              return (
                <label
                  className="class-skill-choice-step__checkbox"
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
                        Already from {grantedFrom ?? "your background"}
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
