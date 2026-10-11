import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRaces,
  getClasses,
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
  computeStartingArmorClass,
  buildStartingAttacks,
  buildStartingLanguages,
  buildStartingProficiencies,
  getProficiencyBonus,
  buildStartingSpellcasting,
  mergeSubrace,
  getSubclassLevel,
  getSubraceCantripTraitId,
  getRaceFixedCantrip,
  addRacialCantrip,
  createFeat,
} from "../../utils/characterSheet";

import { saveCharacter } from "../../utils/characterStore";
import {
  getRaceGuidance,
  getClassGuidance,
  getStepTips,
} from "../../utils/beginnerGuidance";
import {
  loadFeatureEntries,
  buildFeatureChoices,
  loadStartingGear,
  loadRaceDetails,
  loadClassDetails,
  mapRaceToPanel,
  mapClassToPanel,
  mapSubraceToPanel,
  mapSubclassToPanel,
  mapBackgroundToPanel,
} from "../../utils/srdDetails";
import PickerStep from "../../components/PickerStep/PickerStep";
import AbilityScoreStep from "../../components/AbilityScoreStep/AbilityScoreStep";
import ClassSkillChoiceStep from "../../components/ClassSkillChoiceStep/ClassSkillChoiceStep";
import "./CharacterCreationPage.css";
import ClassSpellChoiceStep from "../../components/ClassSpellChoiceStep/ClassSpellChoiceStep";
import SubraceCantripStep from "../../components/SubraceCantripStep/SubraceCantripStep";

import {
  CREATION_STEP_GROUPS,
  getGroupStatus,
  getVisibleSteps,
  getReviewIssues,
  CREATION_STEP_ART,
} from "../../utils/creationSteps";
import CreationStepRail from "../../components/CreationStepRail/CreationStepRail";
import CreationSummaryPanel from "../../components/CreationSummaryPanel/CreationSummaryPanel";
import CharacterReview from "../../components/CharacterReview/CharacterReview";
import EquipmentChoiceStep from "../../components/EquipmentChoiceStep/EquipmentChoiceStep";
import { parseEquipmentChoices } from "../../utils/equipmentChoices";
import CreationTips from "../../components/CreationTips/CreationTips";
import Button from "../../components/Button/Button";

const mapRaceToDetailPanelResult = mapRaceToPanel;
const mapClassToDetailPanelResult = mapClassToPanel;

function CharacterCreationPage() {
  const navigate = useNavigate();
  const [stepKey, setStepKey] = useState("name");
  const [name, setName] = useState("");
  const [race, setRace] = useState(null);
  const [characterClass, setCharacterClass] = useState(null);
  const [background, setBackground] = useState(null);
  const [abilityScores, setAbilityScores] = useState(null);
  const [classSkills, setClassSkills] = useState([]);
  // Skills picked from a background's own choice (Innkeeper, Lyceum Student).
  const [backgroundSkills, setBackgroundSkills] = useState([]);
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
  const [isCreating, setIsCreating] = useState(false);
  const [cameFromReview, setCameFromReview] = useState(false);
  // Starting-gear choices and the gear they add (null until the Gear step).
  const [equipmentSelections, setEquipmentSelections] = useState(null);
  const [chosenEquipment, setChosenEquipment] = useState([]);

  const finalRace = mergeSubrace(race, subrace);
  const equipmentGroups = [
    ...parseEquipmentChoices(classRaw, "class"),
    ...parseEquipmentChoices(backgroundRaw, "background"),
  ];
  const hasEquipmentChoices = equipmentGroups.length > 0;

  const steps = getVisibleSteps({
    raceRaw,
    subrace,
    characterClass,
    hasEquipmentChoices,
  });
  const step = stepKey;
  const stepIndex = Math.max(0, steps.indexOf(stepKey));

  const issues = getReviewIssues({
    steps,
    race,
    subrace,
    subraceCantrip,
    characterClass,
    subclass,
    background,
    classSkills,
    backgroundSkills,
    spellChoices,
    abilityScores,
    equipmentChosen: equipmentSelections !== null,
  });
  const reviewReady = issues.length === 0;

  const railGroups = CREATION_STEP_GROUPS.filter((group) =>
    group.steps.some((key) => steps.includes(key)),
  ).map((group) => {
    const status = getGroupStatus(group, steps, stepIndex);
    const isReview = group.steps.includes("review");

    return {
      label: group.label,
      status,
      firstIndex: steps.indexOf(group.steps.find((key) => steps.includes(key))),
      // Finished steps can be revisited, and Review opens as soon as there is
      // nothing left to fill in.
      clickable:
        status === "complete" ||
        (isReview && reviewReady && status !== "current"),
    };
  });

  // Moving anywhere clears "I came here from Review" once we are back on it.
  function moveTo(key) {
    setStepKey(key);
    if (key === "review") setCameFromReview(false);
  }

  // Jump from the progress rail.
  function goToStep(index) {
    moveTo(steps[Math.max(0, Math.min(steps.length - 1, index))]);
  }

  function goBack() {
    goToStep(stepIndex - 1);
  }

  // A Change button on the Review page: edit one thing, then come straight back.
  function editFromReview(key) {
    setCameFromReview(true);
    setStepKey(key);
  }

  // The step list depends on the choice just made, so work out "next" from
  // the state the character is about to have, not the one rendered now.
  function goNext(
    fromKey,
    nextState = { raceRaw, subrace, characterClass, hasEquipmentChoices },
  ) {
    const nextSteps = getVisibleSteps(nextState);
    const next = nextSteps[nextSteps.indexOf(fromKey) + 1];
    if (next) moveTo(next);
  }

  async function handleCreate() {
    if (isCreating) return;
    setIsCreating(true);

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
    [...backgroundSkills, ...classSkills].forEach((skill) => {
      skills[skill.index] = skill.name;
    });

    const equipment = [
      ...(characterClass?.startingEquipment ?? []),
      ...(background?.startingEquipment ?? []),
      ...chosenEquipment,
    ];

    const spellcasting = buildStartingSpellcasting(
      characterClass?.id,
      spellChoices?.cantrips ?? [],
      spellChoices?.spells ?? [],
    );

    const finalSpellcasting = subraceCantrip
      ? addRacialCantrip(
          spellcasting,
          subraceCantrip,
          `your race (${subrace?.name ?? race?.name ?? "race"})`,
        )
      : spellcasting;

    // New characters arrive with their race's traits and their level 1 class
    // features already written down. If the lookup fails they just start
    // empty, and "Add from my class and race" is on the Features tab.
    const featureEntries = await loadFeatureEntries({
      classId: characterClass?.id,
      subclassId: subclass?.id,
      raceId: race?.id,
      subraceId: subrace?.id,
    }).catch(() => []);
    const features = buildFeatureChoices(featureEntries, 1, [])
      .filter((choice) => choice.defaultSelected)
      .map((choice) =>
        createFeat({ name: choice.name, description: choice.description }),
      );

    // Starting gear does real work on the sheet: armor sets the AC, weapons
    // become attacks, and the race, background and class fill in languages and
    // proficiencies. If the equipment lookup fails, AC falls back to 10 + Dex.
    const gear = await loadStartingGear(equipment).catch(() => []);
    const startingArmorClass = computeStartingArmorClass({
      gear,
      scores: abilityScores,
      classId: characterClass?.id,
    });
    const classProficiencies = classRaw?.proficiencies ?? [];
    const attacks = buildStartingAttacks({
      gear,
      scores: abilityScores,
      proficiencyNames: classProficiencies.map(
        (proficiency) => proficiency.name,
      ),
      proficiencyBonus: getProficiencyBonus(1),
    });
    const languages = buildStartingLanguages({
      raceLanguages: raceRaw?.languages,
      raceChoices: raceRaw?.language_options?.choose ?? 0,
      backgroundLanguages: background?.languages ?? [],
      backgroundChoices: backgroundRaw?.language_options?.choose ?? 0,
      backgroundName: background?.name,
    });
    const proficiencies = [
      ...buildStartingProficiencies(classProficiencies),
      // Open5e backgrounds describe tools in a sentence; keep it as one entry.
      ...(background?.toolProficiencies &&
      !/^no additional/i.test(background.toolProficiencies)
        ? [
            {
              index: crypto.randomUUID(),
              name: background.toolProficiencies,
              description: `From your background (${background.name})`,
            },
          ]
        : []),
    ];
    // Same for gear: it can't become item rows, so it goes in the notes.
    const notes = background?.equipmentDescription
      ? `Starting gear from ${background.name}: ${background.equipmentDescription}`
      : "";

    const sheet = createCharacterSheet({
      name,
      features,
      attacks,
      languages,
      proficiencies,
      notes,
      race: finalRace,
      class: finalClass,
      background,
      abilityScores,
      savingThrows,
      skills,
      equipment,
      spellcasting: finalSpellcasting,
      combat: {
        armorClass: startingArmorClass,
        initiative: dexModifier,
        speed: finalRace?.speed ?? 30,
        hitPoints: { max: maxHitPoints, current: maxHitPoints, temporary: 0 },
        hitDice: { total: 1, remaining: 1, die: hitDie },
        hpHistory: [],
      },
    });

    try {
      await saveCharacter(sheet);
      navigate("/characters");
    } finally {
      setIsCreating(false);
    }
  }

  const stepTips = getStepTips(step, characterClass?.id);

  return (
    <main className="character-creation">
      <div className="character-creation__layout">
        <CreationStepRail groups={railGroups} onJump={goToStep} />

        <CreationSummaryPanel
          name={name}
          race={finalRace}
          characterClass={characterClass}
          subclass={subclass}
          background={background}
          abilityScores={abilityScores}
        />

        <div className="character-creation__content">
          {cameFromReview && step !== "review" && (
            <div className="character-creation__edit-banner">
              <span>You're changing something from your review.</span>
              <Button
                variant="secondary"
                type="button"
                onClick={() => moveTo("review")}
              >
                Back to review
              </Button>
            </div>
          )}

          <div className={stepTips ? "character-creation__split" : undefined}>
            <div className="character-creation__main">
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
                      onClick={() => goNext("name")}
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
                  fetchDetails={loadRaceDetails}
                  mapToDetailPanelResult={mapRaceToDetailPanelResult}
                  mapToSnapshot={mapRaceToSnapshot}
                  getTagline={(item) => getRaceGuidance(item.index)?.tagline}
                  initialSelectedRaw={raceRaw}
                  onChoose={(snapshot, raw) => {
                    setRace(snapshot);
                    setRaceRaw(raw);
                    setSubrace(null);
                    setSubraceRaw(null);
                    setSubraceCantrip(getRaceFixedCantrip(snapshot.id));
                    goNext("race", {
                      raceRaw: raw,
                      subrace: null,
                      characterClass,
                    });
                  }}
                  onBack={goBack}
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
                  mapToDetailPanelResult={mapSubraceToPanel}
                  mapToSnapshot={mapSubraceToSnapshot}
                  initialSelectedRaw={subraceRaw}
                  emptyMessage={`${race?.name ?? "This race"} has no subraces to choose from.`}
                  onChoose={(snapshot, raw) => {
                    setSubrace(snapshot);
                    setSubraceRaw(raw);
                    setSubraceCantrip(getRaceFixedCantrip(race?.id));
                    goNext("subrace", {
                      raceRaw,
                      subrace: snapshot,
                      characterClass,
                    });
                  }}
                  onSkip={() => goNext("subrace")}
                  onBack={goBack}
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
                    goNext("subraceCantrip");
                  }}
                  onBack={goBack}
                />
              )}

              {step === "class" && (
                <PickerStep
                  title="Choose a Class"
                  description="Your character's class is what they do best in a fight or a tough situation. Pick one to see how it plays before you commit."
                  category="Class"
                  fetchList={getClasses}
                  fetchDetails={loadClassDetails}
                  mapToDetailPanelResult={mapClassToDetailPanelResult}
                  mapToSnapshot={mapClassToSnapshot}
                  getTagline={(item) => getClassGuidance(item.index)?.tagline}
                  initialSelectedRaw={classRaw}
                  onChoose={(snapshot, raw) => {
                    setCharacterClass(snapshot);
                    setClassRaw(raw);
                    setEquipmentSelections(null);
                    setChosenEquipment([]);
                    setClassSkills([]);
                    setSpellChoices(null);
                    setSubclass(null);
                    setSubclassRaw(null);
                    goNext("class", {
                      raceRaw,
                      subrace,
                      characterClass: snapshot,
                      hasEquipmentChoices:
                        parseEquipmentChoices(raw, "class").length > 0 ||
                        parseEquipmentChoices(backgroundRaw, "background")
                          .length > 0,
                    });
                  }}
                  onBack={goBack}
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
                  mapToDetailPanelResult={mapSubclassToPanel}
                  mapToSnapshot={mapSubclassToSnapshot}
                  initialSelectedRaw={subclassRaw}
                  emptyMessage={`${characterClass?.name ?? "This class"} chooses a subclass later as you level up, not at creation.`}
                  onChoose={(snapshot, raw) => {
                    setSubclass(snapshot);
                    setSubclassRaw(raw);
                    goNext("subclass");
                  }}
                  onSkip={() => goNext("subclass")}
                  onBack={goBack}
                  backLabel="Back"
                />
              )}

              {step === "classSkills" && (
                <ClassSkillChoiceStep
                  characterClass={characterClass}
                  grantedSkills={background?.skillProficiencies ?? []}
                  grantedFrom={background?.name}
                  initialSelected={classSkills.map((s) => s.index)}
                  backgroundChoice={
                    background?.skillChoice
                      ? { from: background.name, ...background.skillChoice }
                      : null
                  }
                  initialBackgroundSelected={backgroundSkills.map(
                    (s) => s.index,
                  )}
                  onNext={(selected, fromBackground = []) => {
                    setClassSkills(selected);
                    setBackgroundSkills(fromBackground);
                    goNext("classSkills");
                  }}
                  onBack={goBack}
                />
              )}

              {step === "classSpells" && (
                <ClassSpellChoiceStep
                  characterClass={characterClass}
                  knownCantrip={subraceCantrip}
                  knownCantripSource={subrace?.name ?? race?.name}
                  initialCantrips={(spellChoices?.cantrips ?? []).map(
                    (s) => s.index,
                  )}
                  initialSpells={(spellChoices?.spells ?? []).map(
                    (s) => s.index,
                  )}
                  onNext={(choices) => {
                    setSpellChoices(choices);
                    goNext("classSpells");
                  }}
                  onBack={goBack}
                />
              )}

              {step === "background" && (
                <PickerStep
                  title="Choose a Background"
                  description="Your character's background covers their life before adventuring, including free skills and equipment."
                  category="Background"
                  fetchList={getBackgrounds}
                  fetchDetails={getBackgroundDetails}
                  mapToDetailPanelResult={mapBackgroundToPanel}
                  mapToSnapshot={mapBackgroundToSnapshot}
                  initialSelectedRaw={backgroundRaw}
                  onChoose={(snapshot, raw) => {
                    setBackground(snapshot);
                    setBackgroundRaw(raw);
                    setEquipmentSelections(null);
                    setChosenEquipment([]);
                    const granted = new Set(
                      (snapshot.skillProficiencies ?? []).map(
                        (skill) => skill.index,
                      ),
                    );
                    setClassSkills((chosen) =>
                      chosen.filter((skill) => !granted.has(skill.index)),
                    );
                    // A new background means a new (or no) skill pick.
                    setBackgroundSkills([]);
                    goNext("background");
                  }}
                  onBack={goBack}
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
                  initialScoreMethod={abilityAssignments?.scoreMethod}
                  initialRolledPool={abilityAssignments?.rolledPool}
                  initialBonusMode={abilityAssignments?.bonusMode}
                  initialCustomBonuses={abilityAssignments?.customBonuses}
                  onNext={(scores, raw) => {
                    setAbilityScores(scores);
                    setAbilityAssignments(raw);
                    goNext("abilities");
                  }}
                  onBack={goBack}
                />
              )}

              {step === "equipment" && (
                <EquipmentChoiceStep
                  key={`${classRaw?.index}-${backgroundRaw?.index}`}
                  groups={equipmentGroups}
                  sourceNames={{
                    class: characterClass?.name ?? "Class",
                    background: background?.name ?? "Background",
                  }}
                  fixedGear={[
                    ...(characterClass?.startingEquipment ?? []),
                    ...(background?.startingEquipment ?? []),
                  ]}
                  initialSelections={equipmentSelections}
                  onNext={(selections, chosen) => {
                    setEquipmentSelections(selections);
                    setChosenEquipment(chosen);
                    goNext("equipment");
                  }}
                  onBack={goBack}
                />
              )}

              {step === "review" && (
                <CharacterReview
                  name={name}
                  race={finalRace}
                  characterClass={characterClass}
                  subclass={subclass}
                  background={background}
                  abilityScores={abilityScores}
                  skills={[
                    ...[
                      ...(background?.skillProficiencies ?? []),
                      ...backgroundSkills,
                    ].map((skill) => ({
                      ...skill,
                      from: background.name,
                    })),
                    ...classSkills.map((skill) => ({
                      ...skill,
                      from: characterClass?.name,
                    })),
                  ]}
                  cantrips={[
                    ...(spellChoices?.cantrips ?? []),
                    ...(subraceCantrip
                      ? [
                          {
                            ...subraceCantrip,
                            from: `from ${subrace?.name ?? race?.name}`,
                          },
                        ]
                      : []),
                  ]}
                  spells={spellChoices?.spells ?? []}
                  equipment={[
                    ...(characterClass?.startingEquipment ?? []),
                    ...(background?.startingEquipment ?? []),
                    ...chosenEquipment,
                  ]}
                  canChangeGear={steps.includes("equipment")}
                  hitPoints={
                    abilityScores
                      ? getStartingHitPoints(
                          characterClass?.hitDie ?? 8,
                          getAbilityModifier(abilityScores.constitution),
                        )
                      : null
                  }
                  issues={issues}
                  onEdit={editFromReview}
                  onBack={goBack}
                  onCreate={handleCreate}
                  isCreating={isCreating}
                />
              )}
            </div>

            {stepTips && (
              <CreationTips
                title={stepTips.title}
                tips={stepTips.tips}
                art={CREATION_STEP_ART[step]}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default CharacterCreationPage;
