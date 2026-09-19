import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRaces,
  getRaceDetails,
  getClasses,
  getClassDetails,
  getBackgrounds,
  getBackgroundDetails,
  getSubraceDetails,
  getSubclassDetails,
} from "../../utils/api";

import {
  mapRaceToSnapshot,
  mapClassToSnapshot,
  mapBackgroundToSnapshot,
  mapSubraceToSnapshot,
  mapSubclassToSnapshot,
} from "../../utils/characterSnapshots";

import {
  createCharacterSheet,
  ABILITY_SCORES,
  getAbilityModifier,
  getStartingHitPoints,
  getStartingArmorClass,
  buildStartingSpellcasting,
  mergeSubrace,
  getSubclassLevel,
  getSubraceCantripTraitId,
  addRacialCantrip,
} from "../../utils/characterSheet";

import { saveCharacter } from "../../utils/characterStore";
import PickerStep from "../../components/PickerStep/PickerStep";
import AbilityScoreStep from "../../components/AbilityScoreStep/AbilityScoreStep";
import ClassSkillChoiceStep from "../../components/ClassSkillChoiceStep/ClassSkillChoiceStep";
import "./CharacterCreationPage.css";
import ClassSpellChoiceStep from "../../components/ClassSpellChoiceStep/ClassSpellChoiceStep";
import SubraceCantripStep from "../../components/SubraceCantripStep/SubraceCantripStep";

import {
  CREATION_STEP_GROUPS,
  getGroupStatus,
} from "../../utils/creationSteps";
import CreationStepRail from "../../components/CreationStepRail/CreationStepRail";
import CreationSummaryPanel from "../../components/CreationSummaryPanel/CreationSummaryPanel";
import Button from "../../components/Button/Button";

const STEPS = [
  "name",
  "race",
  "subrace",
  "subraceCantrip",
  "class",
  "subclass",
  "classSkills",
  "classSpells",
  "background",
  "abilities",
  "review",
];

function mapRaceToDetailPanelResult(data) {
  const abilityBonuses = data.ability_bonuses
    .map((ability) => `${ability.ability_score.name} +${ability.bonus}`)
    .join(", ");

  return {
    name: data.name,
    category: "Race",
    speed: data.speed,
    size: data.size,
    alignment: data.alignment,
    abilityBonuses,
  };
}

function mapClassToDetailPanelResult(data) {
  const savingThrows = data.saving_throws.map((item) => item.name).join(", ");
  const proficiencies = data.proficiencies.map((item) => item.name);
  const skillChoices = data.proficiency_choices
    .map((choice) => choice.desc)
    .join(" ");
  const startingEquipment = data.starting_equipment
    .map((item) => `${item.equipment.name} x${item.quantity}`)
    .join(", ");
  const subclasses = data.subclasses.map((item) => item.name).join(", ");

  return {
    name: data.name,
    category: "Class",
    hitDie: `d${data.hit_die}`,
    savingThrows,
    proficiencies,
    skillChoices,
    startingEquipment,
    subclasses,
  };
}

function mapSubraceToDetailPanelResult(data) {
  const abilityBonuses = data.ability_bonuses
    .map((ability) => `${ability.ability_score.name} +${ability.bonus}`)
    .join(", ");

  return {
    name: data.name,
    category: "Subrace",
    description: data.desc,
    abilityBonuses,
    traits: data.racial_traits.map((trait) => trait.name),
  };
}

function mapSubclassToDetailPanelResult(data) {
  return {
    name: data.name,
    category: "Subclass",
    description: data.desc.join(" "),
    flavor: data.subclass_flavor,
  };
}

function mapBackgroundToDetailPanelResult(data) {
  const startingProficiencies = data.starting_proficiencies.map(
    (item) => item.name,
  );
  const startingEquipment = data.starting_equipment.map(
    (item) => `${item.equipment.name} x${item.quantity}`,
  );

  return {
    name: data.name,
    category: "Background",
    startingProficiencies,
    languages: `Choose ${data.language_options.choose} languages`,
    startingEquipment,
    startingGold: `${data.starting_gold.quantity} ${data.starting_gold.unit}`,
    featureName: data.feature.name,
    featureDescription: data.feature.desc.join(" "),
    personalityTraits: `Choose ${data.personality_traits.choose}`,
    ideals: `Choose ${data.ideals.choose}`,
    bonds: `Choose ${data.bonds.choose}`,
    flaws: `Choose ${data.flaws.choose}`,
  };
}

function CharacterCreationPage() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState("");
  const [race, setRace] = useState(null);
  const [characterClass, setCharacterClass] = useState(null);
  const [background, setBackground] = useState(null);
  const [abilityScores, setAbilityScores] = useState(null);
  const [classSkills, setClassSkills] = useState([]);
  const [spellChoices, setSpellChoices] = useState(null);
  const [raceRaw, setRaceRaw] = useState(null);
  const [classRaw, setClassRaw] = useState(null);
  const [backgroundRaw, setBackgroundRaw] = useState(null);
  const [abilityAssignments, setAbilityAssignments] = useState(null);
  const [subrace, setSubrace] = useState(null);
  const [subraceRaw, setSubraceRaw] = useState(null);
  const [subclass, setSubclass] = useState(null);
  const [subclassRaw, setSubclassRaw] = useState(null);
  const [subraceCantrip, setSubraceCantrip] = useState(null);

  const finalRace = mergeSubrace(race, subrace);

  const railGroups = CREATION_STEP_GROUPS.map((group) => ({
    label: group.label,
    status: getGroupStatus(group, STEPS, stepIndex),
    firstIndex: STEPS.indexOf(group.steps[0]),
  }));

  const step = STEPS[stepIndex];

  function goToStep(index) {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
  }

  function handleCreate() {
    const conModifier = getAbilityModifier(abilityScores.constitution);
    const dexModifier = getAbilityModifier(abilityScores.dexterity);
    const hitDie = characterClass?.hitDie ?? 8;
    const maxHitPoints = getStartingHitPoints(hitDie, conModifier);

    const finalClass = subclass
      ? { ...characterClass, subclass }
      : characterClass;

    const savingThrows = ABILITY_SCORES.reduce((acc, ability) => {
      acc[ability] =
        characterClass?.savingThrowProficiencies?.includes(ability) ?? false;
      return acc;
    }, {});

    const skills = {};
    (background?.skillProficiencies ?? []).forEach((skill) => {
      skills[skill.index] = skill.name;
    });
    classSkills.forEach((skill) => {
      skills[skill.index] = skill.name;
    });

    const equipment = [
      ...(characterClass?.startingEquipment ?? []),
      ...(background?.startingEquipment ?? []),
    ];

    const spellcasting = buildStartingSpellcasting(
      characterClass?.id,
      spellChoices?.cantrips ?? [],
      spellChoices?.spells ?? [],
    );

    const finalSpellcasting = subraceCantrip
      ? addRacialCantrip(spellcasting, subraceCantrip)
      : spellcasting;

    const sheet = createCharacterSheet({
      name,
      race: finalRace,
      class: finalClass,
      background,
      abilityScores,
      savingThrows,
      skills,
      equipment,
      spellcasting: finalSpellcasting,
      combat: {
        armorClass: getStartingArmorClass(dexModifier),
        initiative: dexModifier,
        speed: finalRace?.speed ?? 30,
        hitPoints: { max: maxHitPoints, current: maxHitPoints, temporary: 0 },
        hitDice: { total: 1, remaining: 1, die: hitDie },
        hpHistory: [],
      },
    });

    saveCharacter(sheet);
    navigate("/characters");
  }

  return (
    <main className="character-creation">
      <div className="character-creation__layout">
        <CreationStepRail groups={railGroups} onJump={goToStep} />

        <div className="character-creation__content">
          {step === "name" && (
            <div className="character-creation__name-step">
              <h1 className="character-creation__title">
                What's your character's name?
              </h1>

              <input
                className="character-creation__name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Character name"
                autoFocus
              />

              <div className="character-creation__nav">
                <Button
                  variant="secondary"
                  onClick={() => navigate("/characters")}
                >
                  Cancel
                </Button>

                <Button
                  disabled={!name.trim()}
                  onClick={() => goToStep(stepIndex + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === "race" && (
            <PickerStep
              title="Choose a Race"
              description="Your character's race shapes their natural traits and abilities. Pick one to read what it offers before you commit."
              category="Race"
              fetchList={getRaces}
              fetchDetails={getRaceDetails}
              mapToDetailPanelResult={mapRaceToDetailPanelResult}
              mapToSnapshot={mapRaceToSnapshot}
              initialSelectedRaw={raceRaw}
              onChoose={(snapshot, raw) => {
                setRace(snapshot);
                setRaceRaw(raw);
                setSubrace(null);
                setSubraceRaw(null);
                setSubraceCantrip(null);
                goToStep(stepIndex + 1);
              }}
              onBack={() => goToStep(stepIndex - 1)}
              backLabel="Back"
            />
          )}

          {step === "subrace" && (
            <PickerStep
              title="Choose a Subrace"
              description={`${race?.name ?? "Your race"} has specific variants with their own traits and bonuses.`}
              category="Subrace"
              fetchList={() => Promise.resolve(raceRaw?.subraces ?? [])}
              fetchDetails={getSubraceDetails}
              mapToDetailPanelResult={mapSubraceToDetailPanelResult}
              mapToSnapshot={mapSubraceToSnapshot}
              initialSelectedRaw={subraceRaw}
              emptyMessage={`${race?.name ?? "This race"} has no subraces to choose from.`}
              onChoose={(snapshot, raw) => {
                setSubrace(snapshot);
                setSubraceRaw(raw);
                setSubraceCantrip(null);
                goToStep(stepIndex + 1);
              }}
              onSkip={() => goToStep(stepIndex + 1)}
              onBack={() => goToStep(stepIndex - 1)}
              backLabel="Back"
            />
          )}

          {step === "subraceCantrip" && (
            <SubraceCantripStep
              subrace={subrace}
              traitId={getSubraceCantripTraitId(subrace?.id)}
              initialSelected={subraceCantrip ? [subraceCantrip.index] : []}
              onNext={(selected) => {
                setSubraceCantrip(selected[0] ?? null);
                goToStep(stepIndex + 1);
              }}
              onBack={() => goToStep(stepIndex - 1)}
            />
          )}

          {step === "class" && (
            <PickerStep
              title="Choose a Class"
              description="Your character's class is what they do best in a fight or a tough situation. Pick one to see how it plays before you commit."
              category="Class"
              fetchList={getClasses}
              fetchDetails={getClassDetails}
              mapToDetailPanelResult={mapClassToDetailPanelResult}
              mapToSnapshot={mapClassToSnapshot}
              initialSelectedRaw={classRaw}
              onChoose={(snapshot, raw) => {
                setCharacterClass(snapshot);
                setClassRaw(raw);
                setClassSkills([]);
                setSpellChoices(null);
                setSubclass(null);
                setSubclassRaw(null);
                goToStep(stepIndex + 1);
              }}
              onBack={() => goToStep(stepIndex - 1)}
              backLabel="Back"
            />
          )}

          {step === "subclass" && (
            <PickerStep
              title="Choose a Subclass"
              description={
                getSubclassLevel(characterClass?.id) === 1
                  ? `${characterClass?.name ?? "Your class"}'s specialization shapes how you play. Pick one now.`
                  : `${characterClass?.name ?? "This class"} chooses a subclass later as you level up, not at creation.`
              }
              category="Subclass"
              fetchList={() =>
                Promise.resolve(
                  getSubclassLevel(characterClass?.id) === 1
                    ? (classRaw?.subclasses ?? [])
                    : [],
                )
              }
              fetchDetails={getSubclassDetails}
              mapToDetailPanelResult={mapSubclassToDetailPanelResult}
              mapToSnapshot={mapSubclassToSnapshot}
              initialSelectedRaw={subclassRaw}
              emptyMessage={`${characterClass?.name ?? "This class"} chooses a subclass later as you level up, not at creation.`}
              onChoose={(snapshot, raw) => {
                setSubclass(snapshot);
                setSubclassRaw(raw);
                goToStep(stepIndex + 1);
              }}
              onSkip={() => goToStep(stepIndex + 1)}
              onBack={() => goToStep(stepIndex - 1)}
              backLabel="Back"
            />
          )}

          {step === "classSkills" && (
            <ClassSkillChoiceStep
              characterClass={characterClass}
              initialSelected={classSkills.map((s) => s.index)}
              onNext={(selected) => {
                setClassSkills(selected);
                goToStep(stepIndex + 1);
              }}
              onBack={() => goToStep(stepIndex - 1)}
            />
          )}

          {step === "classSpells" && (
            <ClassSpellChoiceStep
              characterClass={characterClass}
              initialCantrips={(spellChoices?.cantrips ?? []).map(
                (s) => s.index,
              )}
              initialSpells={(spellChoices?.spells ?? []).map((s) => s.index)}
              onNext={(choices) => {
                setSpellChoices(choices);
                goToStep(stepIndex + 1);
              }}
              onBack={() => goToStep(stepIndex - 1)}
            />
          )}

          {step === "background" && (
            <PickerStep
              title="Choose a Background"
              description="Your character's background covers their life before adventuring, including free skills and equipment."
              category="Background"
              fetchList={getBackgrounds}
              fetchDetails={getBackgroundDetails}
              mapToDetailPanelResult={mapBackgroundToDetailPanelResult}
              mapToSnapshot={mapBackgroundToSnapshot}
              initialSelectedRaw={backgroundRaw}
              onChoose={(snapshot, raw) => {
                setBackground(snapshot);
                setBackgroundRaw(raw);
                goToStep(stepIndex + 1);
              }}
              onBack={() => goToStep(stepIndex - 1)}
              backLabel="Back"
            />
          )}

          {step === "abilities" && (
            <AbilityScoreStep
              race={finalRace}
              initialAssignments={abilityAssignments?.assignments}
              initialChosenBonusAbilities={
                abilityAssignments?.chosenBonusAbilities
              }
              onNext={(scores, raw) => {
                setAbilityScores(scores);
                setAbilityAssignments(raw);
                goToStep(stepIndex + 1);
              }}
              onBack={() => goToStep(stepIndex - 1)}
            />
          )}

          {step === "review" && (
            <div className="character-creation__review-step">
              <h1 className="character-creation__title">
                Review {name || "Your Character"}
              </h1>

              <ul className="character-creation__review-list">
                <li>
                  <strong>Name:</strong> {name}
                </li>

                <li>
                  <strong>Race:</strong> {finalRace?.name ?? "Not chosen"}
                </li>

                <li>
                  <strong>Class:</strong> {characterClass?.name ?? "Not chosen"}
                  {subclass ? ` (${subclass.name})` : ""}
                </li>

                <li>
                  <strong>Background:</strong>{" "}
                  {background?.name ?? "Not chosen"}
                </li>

                <li>
                  <strong>Ability Scores:</strong>{" "}
                  {ABILITY_SCORES.map((ability) => {
                    const score = abilityScores?.[ability] ?? 10;
                    const mod = getAbilityModifier(score);
                    return `${ability.slice(0, 3).toUpperCase()} ${score} (${mod >= 0 ? "+" : ""}${mod})`;
                  }).join(" · ")}
                </li>

                <li>
                  <strong>Skill Proficiencies:</strong>{" "}
                  {[...(background?.skillProficiencies ?? []), ...classSkills]
                    .map((s) => s.name)
                    .join(", ") || "None"}
                </li>

                <li>
                  <strong>Starting Equipment:</strong>{" "}
                  {[
                    ...(characterClass?.startingEquipment ?? []),
                    ...(background?.startingEquipment ?? []),
                  ]
                    .map(
                      (item) =>
                        `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`,
                    )
                    .join(", ") || "None"}
                </li>

                <li>
                  <strong>Starting Spells:</strong>{" "}
                  {[
                    ...(spellChoices?.cantrips ?? []),
                    ...(spellChoices?.spells ?? []),
                    ...(subraceCantrip ? [subraceCantrip] : []),
                  ]
                    .map((s) => s.name)
                    .join(", ") || "None"}
                </li>
              </ul>

              <div className="character-creation__nav">
                <Button
                  variant="secondary"
                  onClick={() => goToStep(stepIndex - 1)}
                >
                  Back
                </Button>

                <Button onClick={handleCreate}>Create Character</Button>
              </div>
            </div>
          )}
        </div>

        <CreationSummaryPanel
          name={name}
          race={finalRace}
          characterClass={characterClass}
          subclass={subclass}
          background={background}
          abilityScores={abilityScores}
        />
      </div>
    </main>
  );
}

export default CharacterCreationPage;
