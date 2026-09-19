import { useState } from "react";
import "./ClassSkillChoiceStep.css";
import Button from "../Button/Button";

function ClassSkillChoiceStep({
  characterClass,
  initialSelected,
  onNext,
  onBack,
}) {
  const skillChoice = characterClass?.skillChoice;
  const [chosenSkills, setChosenSkills] = useState(() => initialSelected ?? []);

  const maxChoices = skillChoice?.choose ?? 0;
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

          <div className="class-skill-choice-step__checklist">
            {skillChoice.options.map((skill) => (
              <label
                className="class-skill-choice-step__checkbox"
                key={skill.index}
              >
                <input
                  type="checkbox"
                  checked={chosenSkills.includes(skill.index)}
                  disabled={
                    !chosenSkills.includes(skill.index) &&
                    chosenSkills.length >= maxChoices
                  }
                  onChange={() => toggleSkill(skill.index)}
                />
                {skill.name}
              </label>
            ))}
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
