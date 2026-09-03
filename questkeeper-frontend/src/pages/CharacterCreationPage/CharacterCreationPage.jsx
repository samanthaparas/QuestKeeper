import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRaces,
  getRaceDetails,
  getClasses,
  getClassDetails,
  getBackgrounds,
  getBackgroundDetails,
} from "../../utils/api";
import {
  mapRaceToSnapshot,
  mapClassToSnapshot,
  mapBackgroundToSnapshot,
} from "../../utils/characterSnapshots";
import {
  createCharacterSheet,
  ABILITY_SCORES,
  getAbilityModifier,
  getStartingHitPoints,
  getStartingArmorClass,
} from "../../utils/characterSheet";
import { saveCharacter } from "../../utils/characterStore";
import PickerStep from "../../components/PickerStep/PickerStep";
import AbilityScoreStep from "../../components/AbilityScoreStep/AbilityScoreStep";
import "./CharacterCreationPage.css";

const STEPS = ["name", "race", "class", "background", "abilities", "review"];

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

  const step = STEPS[stepIndex];

  function goToStep(index) {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, index)));
  }

  function handleCreate() {
    const conModifier = getAbilityModifier(abilityScores.constitution);
    const dexModifier = getAbilityModifier(abilityScores.dexterity);
    const hitDie = characterClass?.hitDie ?? 8;
    const maxHitPoints = getStartingHitPoints(hitDie, conModifier);

    const savingThrows = ABILITY_SCORES.reduce((acc, ability) => {
      acc[ability] =
        characterClass?.savingThrowProficiencies?.includes(ability) ?? false;
      return acc;
    }, {});

    const sheet = createCharacterSheet({
      name,
      race,
      class: characterClass,
      background,
      abilityScores,
      savingThrows,
      combat: {
        armorClass: getStartingArmorClass(dexModifier),
        initiative: dexModifier,
        speed: race?.speed ?? 30,
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
      <div className="character-creation__content">
        <p className="character-creation__step-count">
          Step {stepIndex + 1} of {STEPS.length}
        </p>

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
              <button
                className="character-creation__cancel-button"
                type="button"
                onClick={() => navigate("/characters")}
              >
                Cancel
              </button>

              <button
                className="character-creation__next-button"
                type="button"
                disabled={!name.trim()}
                onClick={() => goToStep(stepIndex + 1)}
              >
                Next
              </button>
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
            onChoose={(snapshot) => {
              setRace(snapshot);
              goToStep(stepIndex + 1);
            }}
            onBack={() => goToStep(stepIndex - 1)}
            backLabel="Back"
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
            onChoose={(snapshot) => {
              setCharacterClass(snapshot);
              goToStep(stepIndex + 1);
            }}
            onBack={() => goToStep(stepIndex - 1)}
            backLabel="Back"
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
            onChoose={(snapshot) => {
              setBackground(snapshot);
              goToStep(stepIndex + 1);
            }}
            onBack={() => goToStep(stepIndex - 1)}
            backLabel="Back"
          />
        )}

        {step === "abilities" && (
          <AbilityScoreStep
            race={race}
            onNext={(scores) => {
              setAbilityScores(scores);
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
                <strong>Race:</strong> {race?.name ?? "Not chosen"}
              </li>
              <li>
                <strong>Class:</strong> {characterClass?.name ?? "Not chosen"}
              </li>
              <li>
                <strong>Background:</strong> {background?.name ?? "Not chosen"}
              </li>
              <li>
                <strong>Ability Scores:</strong>{" "}
                {ABILITY_SCORES.map((ability) => {
                  const score = abilityScores?.[ability] ?? 10;
                  const mod = getAbilityModifier(score);
                  return `${ability.slice(0, 3).toUpperCase()} ${score} (${mod >= 0 ? "+" : ""}${mod})`;
                }).join(" · ")}
              </li>
            </ul>

            <div className="character-creation__nav">
              <button
                className="character-creation__cancel-button"
                type="button"
                onClick={() => goToStep(stepIndex - 1)}
              >
                Back
              </button>

              <button
                className="character-creation__next-button"
                type="button"
                onClick={handleCreate}
              >
                Create Character
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default CharacterCreationPage;
