import { equipStartingArmor } from "../../utils/armorClass";
import { fillMissingComponents } from "../../utils/spellComponents";
import {
  backgroundFeatureFrom,
  buildLanguagesText,
  languageChoicesFor,
  splitTools,
  startingGold,
} from "../../utils/startingCharacter";
import { collectSkills, loadRaceSkillGrants, missingRacePicks } from "../../utils/skillGrants";
import { sourceFromEntry } from "../../utils/featureSources";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
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
import {
  clearCreationDraft,
  hasCreationProgress,
  loadCreationDraft,
  saveCreationDraft,
} from "../../utils/creationDraft";
import CreationTips from "../../components/CreationTips/CreationTips";
import Button from "../../components/Button/Button";
import PageBanner from "../../components/PageBanner/PageBanner";
import HomebrewDialog from "../../components/HomebrewDialog/HomebrewDialog";
import { isHomebrewId, toHomebrewIndex } from "../../utils/homebrewMappers";
import { createHomebrew } from "../../utils/homebrewStore";
import { refreshHomebrew } from "../../utils/homebrewCache";
import { draftEntryFrom } from "../../utils/homebrewForm";
import {
  findQuizBuild,
  loadQuizBuild,
  standardArrayFor,
} from "../../utils/quizBuild";

const mapRaceToDetailPanelResult = mapRaceToPanel;
const mapClassToDetailPanelResult = mapClassToPanel;

function CharacterCreationPage({ onStartFresh }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // The character in progress, saved on this device as you go (see the
  // autosave below), unless this visit brings a build from the quiz.
  const [draft] = useState(() =>
    location.state?.quizBuild ? null : loadCreationDraft(),
  );
  function restored(field, fallback) {
    return draft && field in draft.fields ? draft.fields[field] : fallback;
  }
  // Each step is its own address (?step=class), so the browser's Back and
  // Forward (or a phone's back swipe) move between steps instead of leaving
  // creation and losing everything.
  //
  // Picking up a saved character through a plain link (no ?step) resumes
  // at its step for this first view, and writes that step into the address
  // (replacing the entry), so later an address without ?step always means
  // the first step and Back behaves.
  const resumeStep = useRef(
    searchParams.get("step") ? null : restored("stepKey", null),
  );
  const stepKey = searchParams.get("step") ?? resumeStep.current ?? "name";
  function setStepKey(key) {
    setSearchParams({ step: key });
  }
  useEffect(() => {
    const step = resumeStep.current;
    resumeStep.current = null;
    if (step && !searchParams.get("step")) {
      setSearchParams({ step }, { replace: true });
    }
    // Only when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Arriving from the character quiz brings the hero's name along.
  const [name, setName] = useState(
    () => location.state?.name ?? restored("name", ""),
  );
  const [race, setRace] = useState(() => restored("race", null));
  const [characterClass, setCharacterClass] = useState(() => restored("characterClass", null));
  const [background, setBackground] = useState(() => restored("background", null));
  const [abilityScores, setAbilityScores] = useState(() => restored("abilityScores", null));
  const [classSkills, setClassSkills] = useState(() => restored("classSkills", []));
  // Skills picked from a background's own choice (Innkeeper, Lyceum Student).
  const [backgroundSkills, setBackgroundSkills] = useState(() => restored("backgroundSkills", []));
  // Skills the race and subrace grant (fixed ones and "choose N"), and the
  // player's picks for each choice ({ [grantId]: [skill] }).
  const [raceSkillGrants, setRaceSkillGrants] = useState(() => restored("raceSkillGrants", []));
  const [racePicks, setRacePicks] = useState(() => restored("racePicks", {}));
  // Languages picked on the Skills step ({ race: ["Dwarvish"] }). Optional:
  // a skipped pick stays as a reminder on the sheet.
  const [languagePicks, setLanguagePicks] = useState(() => restored("languagePicks", {}));
  const [spellChoices, setSpellChoices] = useState(() => restored("spellChoices", null));
  const [raceRaw, setRaceRaw] = useState(() => restored("raceRaw", null));
  const [classRaw, setClassRaw] = useState(() => restored("classRaw", null));
  const [backgroundRaw, setBackgroundRaw] = useState(() => restored("backgroundRaw", null));
  const [abilityAssignments, setAbilityAssignments] = useState(() => restored("abilityAssignments", null));
  const [subrace, setSubrace] = useState(() => restored("subrace", null));
  const [subraceRaw, setSubraceRaw] = useState(() => restored("subraceRaw", null));
  const [subclass, setSubclass] = useState(() => restored("subclass", null));
  const [subclassRaw, setSubclassRaw] = useState(() => restored("subclassRaw", null));
  const [subraceCantrip, setSubraceCantrip] = useState(() => restored("subraceCantrip", null));
  const [isCreating, setIsCreating] = useState(false);
  const [cameFromReview, setCameFromReview] = useState(() => restored("cameFromReview", false));
  // Starting-gear choices and the gear they add (null until the Gear step).
  const [equipmentSelections, setEquipmentSelections] = useState(() => restored("equipmentSelections", null));
  const [chosenEquipment, setChosenEquipment] = useState(() => restored("chosenEquipment", []));
  // "Make your own": the open homebrew pop-up, the entry just made (shown
  // selected in its picker), and a counter that reloads the pickers.
  const [homebrewRequest, setHomebrewRequest] = useState(null);
  const [madePick, setMadePick] = useState(null); // { step, raw }
  const [pickerVersion, setPickerVersion] = useState(0);

  // "Use this build" from the character quiz: the build being filled in,
  // and whether it's loading or failed to.
  const [quizBuild, setQuizBuild] = useState(null);
  // A build that no longer exists (an old saved link, a renamed build) says
  // so instead of "loading" forever.
  const [quizStatus, setQuizStatus] = useState(() => {
    if (!location.state?.quizBuild) return "idle";
    return findQuizBuild(location.state.quizBuild) ? "loading" : "unknown";
  });

  // Keep the character in progress on this device after every change.
  useEffect(() => {
    if (isCreating) return;
    saveCreationDraft({
      stepKey,
      name,
      race,
      characterClass,
      background,
      abilityScores,
      classSkills,
      backgroundSkills,
      raceSkillGrants,
      racePicks,
      languagePicks,
      spellChoices,
      raceRaw,
      classRaw,
      backgroundRaw,
      abilityAssignments,
      subrace,
      subraceRaw,
      subclass,
      subclassRaw,
      subraceCantrip,
      cameFromReview,
      equipmentSelections,
      chosenEquipment,
    });
  }, [
    isCreating,
    stepKey,
    name,
    race,
    characterClass,
    background,
    abilityScores,
    classSkills,
    backgroundSkills,
    raceSkillGrants,
    racePicks,
    languagePicks,
    spellChoices,
    raceRaw,
    classRaw,
    backgroundRaw,
    abilityAssignments,
    subrace,
    subraceRaw,
    subclass,
    subclassRaw,
    subraceCantrip,
    cameFromReview,
    equipmentSelections,
    chosenEquipment,
  ]);

  // "Picking up where you left off", until it's dismissed or you start over.
  const [showResumeNote, setShowResumeNote] = useState(() => Boolean(draft));

  // Throw the saved character away and begin again on the first step.
  function startFresh() {
    clearCreationDraft();
    setSearchParams({}, { replace: true });
    onStartFresh?.();
  }

  // Fills in everything the build decides, the same way each picker would,
  // and spreads the standard array over its two main abilities (confirmed on
  // the Abilities step). Then jumps to the first step still to do.
  function applyQuizBuild(
    build,
    {
      raceRaw: newRace,
      subraceRaw: newSubrace,
      classRaw: newClass,
      subclassRaw: newSubclass,
      backgroundRaw: newBackground,
    },
  ) {
    const raceSnapshot = mapRaceToSnapshot(newRace);
    const subraceSnapshot = newSubrace
      ? mapSubraceToSnapshot(newSubrace)
      : null;
    const classSnapshot = mapClassToSnapshot(newClass);
    const subclassSnapshot = newSubclass
      ? mapSubclassToSnapshot(newSubclass)
      : null;
    const backgroundSnapshot = mapBackgroundToSnapshot(newBackground);

    setRace(raceSnapshot);
    setRaceRaw(newRace);
    setSubrace(subraceSnapshot);
    setSubraceRaw(newSubrace);
    setSubraceCantrip(getRaceFixedCantrip(raceSnapshot.id));
    setCharacterClass(classSnapshot);
    setClassRaw(newClass);
    setClassSkills([]);
    setSpellChoices(null);
    setSubclass(subclassSnapshot);
    setSubclassRaw(newSubclass);
    setBackground(backgroundSnapshot);
    setBackgroundRaw(newBackground);
    setBackgroundSkills([]);
    setRacePicks({});
    setLanguagePicks({});
    setEquipmentSelections(null);
    setChosenEquipment([]);
    setAbilityAssignments({
      assignments: standardArrayFor(build.abilities),
      scoreMethod: "standard",
    });
    setQuizBuild(build);
    setQuizStatus("applied");

    if (name.trim())
      moveTo(
        firstStepToDo({
          newRace,
          subraceSnapshot,
          classSnapshot,
          newClass,
          newBackground,
          backgroundSnapshot,
          subclassSnapshot,
        }),
      );
  }

  // The first step a quiz build leaves for the player (skills, spells...).
  function firstStepToDo({
    newRace,
    subraceSnapshot,
    classSnapshot,
    newClass,
    newBackground,
    backgroundSnapshot,
    subclassSnapshot,
  }) {
    const nextSteps = getVisibleSteps({
      raceRaw: newRace,
      subrace: subraceSnapshot,
      characterClass: classSnapshot,
      hasEquipmentChoices:
        parseEquipmentChoices(newClass, "class").length > 0 ||
        parseEquipmentChoices(newBackground, "background").length > 0,
    });
    const todo = getReviewIssues({
      steps: nextSteps,
      race: newRace,
      subrace: subraceSnapshot,
      subraceCantrip: getRaceFixedCantrip(newRace.index),
      characterClass: classSnapshot,
      subclass: subclassSnapshot,
      background: backgroundSnapshot,
      classSkills: [],
      backgroundSkills: [],
      spellChoices: null,
      abilityScores: null,
      equipmentChosen: false,
    });
    return todo[0]?.step ?? "review";
  }

  // "Use this build" from the quiz: fill in the build once it has loaded.
  useEffect(() => {
    if (!location.state?.quizBuild) return undefined;
    // Forget the request (known or not), so a refresh doesn't repeat it.
    navigate(".", { replace: true, state: null });
    const build = findQuizBuild(location.state.quizBuild);
    if (!build) return undefined;
    let ignore = false;

    loadQuizBuild(build)
      .then((loaded) => {
        if (!ignore) applyQuizBuild(build, loaded);
      })
      .catch(() => !ignore && setQuizStatus("failed"));
    return () => {
      ignore = true;
    };
    // Only when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Racial skills (a Half-Elf's Skill Versatility, an Elf's Perception) are
  // on the race's traits, so look them up whenever the race or subrace changes.
  useEffect(() => {
    if (!raceRaw) return undefined;
    let ignore = false;
    loadRaceSkillGrants({ raceRaw, subraceRaw })
      .then((grants) => !ignore && setRaceSkillGrants(grants))
      .catch(() => !ignore && setRaceSkillGrants([]));
    return () => {
      ignore = true;
    };
  }, [raceRaw, subraceRaw]);
  // Only grants from the current race count (an old race's picks are ignored).
  const activeRaceGrants = raceRaw ? raceSkillGrants : [];
  const languageChoices = languageChoicesFor({ raceRaw, subraceRaw, backgroundRaw });
  const knownLanguages = [
    ...(raceRaw?.languages ?? []),
    ...(subraceRaw?.languages ?? []),
    ...(background?.languages ?? []),
  ].map((language) => language.name ?? language);
  const activeRacePicks = Object.fromEntries(
    activeRaceGrants.map((grant) => [grant.id, racePicks[grant.id] ?? []]),
  );

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

  // When the step changes, show the new step's heading and move keyboard focus
  // to it, so a screen reader announces where you are and a long page isn't
  // left scrolled past the top. Comparing with the step we last showed (rather
  // than "has this run before") keeps the first load, including React's
  // development replay of effects, from taking focus off the name box.
  const layoutRef = useRef(null);
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    const layout = layoutRef.current;
    const heading = layout?.querySelector("h1, .character-creation__title");
    if (!heading) return;
    // On a phone the progress rail scrolls sideways; keep the current step in
    // sight by moving only the rail itself, never the page.
    const rail = layout.querySelector(".creation-step-rail__list");
    const current = rail?.querySelector('[aria-current="step"]');
    if (rail && current) {
      const offset = current.getBoundingClientRect().left - rail.getBoundingClientRect().left;
      rail.scrollLeft += offset - (rail.clientWidth - current.offsetWidth) / 2;
    }
    // Start at the progress rail; if the heading would still be below the fold, bring it up too.
    layout.scrollIntoView?.({ block: "start" });
    if (heading.getBoundingClientRect().bottom > window.innerHeight * 0.9) {
      heading.scrollIntoView?.({ block: "start" });
    }
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [step]);
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
    raceSkillGaps: missingRacePicks(activeRaceGrants, activeRacePicks),
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
    setMadePick(null);
    if (key === "review") setCameFromReview(false);
  }

  // Jump from the progress rail.
  function goToStep(index) {
    moveTo(steps[Math.max(0, Math.min(steps.length - 1, index))]);
  }

  function goBack() {
    goToStep(stepIndex - 1);
  }

  // Leave creation from any step. Nothing is saved until Create, so the
  // choices so far are thrown away (after asking).
  function cancelCreation() {
    const hasChoices = hasCreationProgress({ name, race, characterClass, background });
    if (
      !hasChoices ||
      window.confirm("Stop making this character? Your choices so far won't be saved.")
    ) {
      clearCreationDraft();
      navigate("/characters");
    }
  }

  // A Change button on the Review page: edit one thing, then come straight back.
  function editFromReview(key) {
    setCameFromReview(true);
    setStepKey(key);
  }

  // After "Make your own" saves: reload what lists it, then show it selected.
  // "Make my own version" of a free option: the homebrew pop-up opens with
  // a copy of it filled in. `extra` adds pop-up options (a subrace's race).
  function startHomebrewFrom(prefill, extra = {}) {
    const { category, data, ...fields } = prefill;
    setHomebrewRequest({ category, fields, data, ...extra });
  }

  // A homebrew class, offered in the subclass form's "which class?" list.
  const homebrewClassOptions = isHomebrewId(characterClass?.id)
    ? [{ index: characterClass.id, name: characterClass.name }]
    : [];

  // "Pick it now, add details later": saves a bare, private draft of a book
  // option (its name, book, link and our own-words blurb) so it can be
  // chosen right away. It's flagged as needing details, and the sheet reminds
  // the player to fill them in on My Homebrew.
  async function saveDraftFrom(category, book, extraData = {}) {
    const saved = await createHomebrew(draftEntryFrom(category, book, extraData));
    refreshHomebrew();
    return saved;
  }

  async function handleHomebrewCreated(saved) {
    setHomebrewRequest(null);
    const index = toHomebrewIndex(saved.id);

    try {
      let raw;
      if (saved.category === "race") {
        raw = await loadRaceDetails(index);
      } else if (saved.category === "subrace") {
        // The subrace list comes from the race, so reload the race first.
        setRaceRaw(await loadRaceDetails(race.id));
        raw = await getSubraceDetails(index);
      } else if (saved.category === "class") {
        raw = await loadClassDetails(index);
      } else if (saved.category === "subclass") {
        setClassRaw(await loadClassDetails(characterClass.id));
        raw = await getSubclassDetails(index);
      } else {
        raw = await getBackgroundDetails(index);
      }
      setMadePick({ step: stepKey, raw });
    } finally {
      setPickerVersion((version) => version + 1);
    }
  }

  // The picker's starting selection: the entry just made, or the saved choice.
  function pickerStart(step, chosenRaw) {
    return madePick?.step === step ? madePick.raw : chosenRaw;
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

    // Every source counts once: background, race and subrace (fixed and
    // picked), then class picks.
    const skills = Object.fromEntries(
      collectSkills({
        background,
        backgroundSkills,
        classSkills,
        raceGrants: activeRaceGrants,
        racePicks: activeRacePicks,
        className: characterClass?.name,
      }).map((skill) => [skill.index, skill.name]),
    );

    const equipment = [
      ...(characterClass?.startingEquipment ?? []),
      ...(background?.startingEquipment ?? []),
      ...chosenEquipment,
    ];

    const spellcasting = buildStartingSpellcasting(
      characterClass,
      spellChoices?.cantrips ?? [],
      spellChoices?.spells ?? [],
    );

    // Starting spells get their V, S, M from the SRD (if the lookup fails
    // they start blank, and the Spells tab can fill them in later).
    const withRacialCantrip = subraceCantrip
      ? addRacialCantrip(
          spellcasting,
          subraceCantrip,
          `your race (${subrace?.name ?? race?.name ?? "race"})`,
        )
      : spellcasting;
    const finalSpellcasting = await fillMissingComponents(withRacialCantrip).catch(
      () => withRacialCantrip,
    );

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
        createFeat({
          name: choice.name,
          description: choice.description,
          source: sourceFromEntry(choice),
          // Picks it asks for (Favored Enemy), made on the Features tab.
          choices: choice.choices ?? null,
        }),
      );
    // The background's own feature (Charlatan: False Identity).
    const fromBackground = backgroundFeatureFrom(backgroundRaw, background);
    if (fromBackground) features.push(createFeat(fromBackground));

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
    const languages = buildLanguagesText({
      fixed: knownLanguages,
      choices: languageChoices,
      picks: languagePicks,
    });
    // Each proficiency is its own entry and says where it came from. Open5e
    // and homebrew backgrounds write tools as a sentence ("Disguise kit,
    // forgery kit"), split into one entry per tool.
    const proficiencies = [
      ...buildStartingProficiencies(classProficiencies).map((proficiency) => ({
        ...proficiency,
        description: `From your class (${characterClass?.name ?? "class"})`,
        source: { type: "class", id: characterClass?.id ?? null },
      })),
      ...splitTools(background?.toolProficiencies).map((tool) => ({
        index: crypto.randomUUID(),
        name: tool,
        description: `From your background (${background.name})`,
        source: { type: "background", id: background.id },
      })),
    ];
    // Same for gear: it can't become item rows, so it goes in the notes.
    const notes = [
      characterClass?.equipmentDescription &&
        `Starting gear from ${characterClass.name}: ${characterClass.equipmentDescription}`,
      background?.equipmentDescription &&
        `Starting gear from ${background.name}: ${background.equipmentDescription}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const sheet = createCharacterSheet({
      name,
      // The purse from the starting gear ("a pouch containing 15 gp").
      gold: startingGold({ background, characterClass }),
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
      // Starting armor and shield are worn, and AC follows them (auto).
      equipment: equipStartingArmor(equipment, gear, {
        scores: abilityScores,
        classId: characterClass?.id,
      }),
      acMode: "auto",
      // Initiative follows Dexterity from the start (bonus 0).
      initiativeMode: "auto",
      spellcasting: finalSpellcasting,
      combat: {
        armorClass: startingArmorClass,
        initiative: dexModifier,
        initiativeBonus: 0,
        speed: finalRace?.speed ?? 30,
        hitPoints: { max: maxHitPoints, current: maxHitPoints, temporary: 0 },
        hitDice: { total: 1, remaining: 1, die: hitDie },
        hpHistory: [],
      },
    });

    try {
      await saveCharacter(sheet);
      clearCreationDraft();
      navigate("/characters");
    } finally {
      setIsCreating(false);
    }
  }

  const stepTips = getStepTips(step, characterClass?.id);

  return (
    <main className="character-creation">
      {/* The first step opens with the banner; later steps stay compact so the choices are the focus. */}
      {step === "name" && (
        <div className="character-creation__banner">
          <PageBanner art="wilderness" eyebrow="Adventurer" title="Create a character" />
        </div>
      )}
      {showResumeNote && (
        <p className="character-creation__resume" role="status">
          <span>
            Picking up where you left off
            {draft?.fields.name ? ` with ${draft.fields.name}` : ""}. Your
            choices are kept on this device until you create the character.
          </span>
          <span className="character-creation__resume-actions">
            <Button variant="secondary" onClick={startFresh}>
              Start fresh
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowResumeNote(false)}
            >
              Got it
            </Button>
          </span>
        </p>
      )}
      <div className="character-creation__layout" ref={layoutRef}>
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
          {/* The first step has its own Cancel button. */}
          {step !== "name" && (
            <div className="character-creation__cancel">
              <button type="button" className="character-creation__cancel-button" onClick={cancelCreation}>
                Cancel and discard this character
              </button>
            </div>
          )}
          {quizStatus === "loading" && (
            <div className="character-creation__quiz-banner" role="status">
              Filling in your build from the quiz...
            </div>
          )}
          {quizStatus === "failed" && (
            <div className="character-creation__quiz-banner" role="alert">
              Couldn&apos;t load that build right now. Pick your options as
              usual, or try the quiz again later.
            </div>
          )}
          {quizStatus === "unknown" && (
            <div className="character-creation__quiz-banner" role="status">
              <span>
                That quiz build isn&apos;t available any more, so nothing was filled in. Pick your options
                as usual, or <Link to="/quiz">take the quiz again</Link>.
              </span>
              <Button variant="secondary" type="button" onClick={() => setQuizStatus("idle")}>
                Got it
              </Button>
            </div>
          )}
          {quizStatus === "applied" && quizBuild && (
            <div className="character-creation__quiz-banner" role="status">
              <span>
                <strong>From the quiz: {quizBuild.name}.</strong> Race, class,
                background and ability scores are filled in. Change anything you
                like on its step.
              </span>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setQuizStatus("idle")}
              >
                Got it
              </Button>
            </div>
          )}
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
                  <h2 className="character-creation__title">
                    What's your character's name?
                  </h2>

                  <input
                    className="character-creation__name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Character name"
                    autoFocus
                  />

                  <div className="character-creation__nav">
                    <Button variant="secondary" onClick={cancelCreation}>
                      Cancel
                    </Button>

                    <Button
                      disabled={!name.trim()}
                      onClick={() =>
                        // With a quiz build filled in, skip ahead to what's left.
                        quizBuild && issues[0]
                          ? moveTo(issues[0].step)
                          : goNext("name")
                      }
                    >
                      Next
                    </Button>
                  </div>

                  {!quizBuild && (
                    <p className="character-creation__quiz-link">
                      Not sure what to play?{" "}
                      <button
                        type="button"
                        className="character-creation__link-button"
                        onClick={() => navigate("/quiz", { state: { name } })}
                      >
                        Take the character quiz
                      </button>{" "}
                      and get three builds that fit you.
                    </p>
                  )}
                </div>
              )}

              {step === "race" && (
                <PickerStep
                  key={`race-${pickerVersion}`}
                  onMakeOwn={() => setHomebrewRequest({ category: "race" })}
                  makeOwnLabel="Make your own race"
                  onStartFrom={startHomebrewFrom}
                  onDraftFrom={(book) => saveDraftFrom("race", book)}
                  onMakeHomebrewFrom={(book) =>
                    setHomebrewRequest({
                      category: "race",
                      fields: {
                        name: book.name,
                        basedOn: book.book,
                        linkUrl: book.link_url,
                      },
                    })
                  }
                  title="Choose a Race"
                  description="Your character's race shapes their natural traits and abilities. Pick one to read what it offers before you commit."
                  category="Race"
                  fetchList={getRaces}
                  fetchDetails={loadRaceDetails}
                  mapToDetailPanelResult={mapRaceToDetailPanelResult}
                  mapToSnapshot={mapRaceToSnapshot}
                  getTagline={(item) =>
                    getRaceGuidance(item.index)?.tagline ?? item.tagline
                  }
                  initialSelectedRaw={pickerStart("race", raceRaw)}
                  onChoose={(snapshot, raw) => {
                    setRace(snapshot);
                    setRaceRaw(raw);
                    setSubrace(null);
                    setSubraceRaw(null);
                    setRacePicks({});
                    setLanguagePicks({});
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
                  key={`subrace-${pickerVersion}`}
                  onMakeOwn={() =>
                    setHomebrewRequest({
                      category: "subrace",
                      data: { parentRace: race.id, parentRaceName: race.name },
                      raceOptions: [{ index: race.id, name: race.name }],
                    })
                  }
                  makeOwnLabel={`Make your own ${race?.name ?? ""} subrace`}
                  onStartFrom={(prefill) =>
                    startHomebrewFrom(prefill, {
                      raceOptions: [{ index: race.id, name: race.name }],
                    })
                  }
                  title="Choose a Subrace"
                  description={`${race?.name ?? "Your race"} has specific variants with their own traits and bonuses.`}
                  category="Subrace"
                  fetchList={() => Promise.resolve(raceRaw?.subraces ?? [])}
                  fetchDetails={getSubraceDetails}
                  mapToDetailPanelResult={mapSubraceToPanel}
                  mapToSnapshot={mapSubraceToSnapshot}
                  initialSelectedRaw={pickerStart("subrace", subraceRaw)}
                  emptyMessage={`${race?.name ?? "This race"} has no subraces to choose from.`}
                  onChoose={(snapshot, raw) => {
                    setSubrace(snapshot);
                    setSubraceRaw(raw);
                    setRacePicks({});
                    setLanguagePicks({});
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
                  key={`class-${pickerVersion}`}
                  onMakeOwn={() => setHomebrewRequest({ category: "class" })}
                  makeOwnLabel="Make your own class"
                  // A book class (Artificer) rebuilt as homebrew: its name,
                  // book and link filled in, and its book subclasses kept.
                  onMakeHomebrewFrom={(book) =>
                    setHomebrewRequest({
                      category: "class",
                      fields: {
                        name: book.name,
                        basedOn: book.book,
                        linkUrl: book.link_url,
                      },
                      data: { bookClass: book.index.replace(/^book_/, "") },
                    })
                  }
                  title="Choose a Class"
                  description="Your character's class is what they do best in a fight or a tough situation. Pick one to see how it plays before you commit."
                  category="Class"
                  fetchList={getClasses}
                  fetchDetails={loadClassDetails}
                  mapToDetailPanelResult={mapClassToDetailPanelResult}
                  mapToSnapshot={mapClassToSnapshot}
                  getTagline={(item) => getClassGuidance(item.index)?.tagline}
                  initialSelectedRaw={pickerStart("class", classRaw)}
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
                  key={`subclass-${pickerVersion}`}
                  // Only offered when the subclass is picked now (level 1).
                  onMakeOwn={
                    getSubclassLevel(characterClass) === 1
                      ? () =>
                          setHomebrewRequest({
                            category: "subclass",
                            data: {
                              parentClass: characterClass.id,
                              parentClassName: characterClass.name,
                            },
                            classOptions: homebrewClassOptions,
                          })
                      : undefined
                  }
                  makeOwnLabel={`Make your own ${characterClass?.name ?? ""} subclass`}
                  onStartFrom={
                    getSubclassLevel(characterClass) === 1
                      ? startHomebrewFrom
                      : undefined
                  }
                  onDraftFrom={(book) =>
                    saveDraftFrom("subclass", book, {
                      parentClass: characterClass.id,
                      parentClassName: characterClass.name,
                    })
                  }
                  onMakeHomebrewFrom={(book) =>
                    setHomebrewRequest({
                      category: "subclass",
                      fields: {
                        name: book.name,
                        basedOn: book.book,
                        linkUrl: book.link_url,
                      },
                      data: {
                        parentClass: characterClass.id,
                        parentClassName: characterClass.name,
                      },
                      classOptions: homebrewClassOptions,
                    })
                  }
                  title="Choose a Subclass"
                  description={
                    getSubclassLevel(characterClass) === 1
                      ? `${characterClass?.name ?? "Your class"}'s specialization shapes how you play. Pick one now.`
                      : `${characterClass?.name ?? "This class"} chooses a subclass later as you level up, not at creation.`
                  }
                  category="Subclass"
                  fetchList={() =>
                    Promise.resolve(
                      getSubclassLevel(characterClass) === 1
                        ? (classRaw?.subclasses ?? [])
                        : [],
                    )
                  }
                  fetchDetails={getSubclassDetails}
                  mapToDetailPanelResult={mapSubclassToPanel}
                  mapToSnapshot={mapSubclassToSnapshot}
                  initialSelectedRaw={pickerStart("subclass", subclassRaw)}
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
                  // Remount when the race's skill choices arrive, so they start filled in.
                  key={activeRaceGrants.map((grant) => grant.id).join(",")}
                  characterClass={characterClass}
                  grantedSkills={[
                    ...(background?.skillProficiencies ?? []).map((skill) => ({
                      ...skill,
                      from: background.name,
                    })),
                    ...activeRaceGrants.flatMap((grant) =>
                      grant.fixed.map((skill) => ({ ...skill, from: grant.from })),
                    ),
                  ]}
                  grantedFrom={background?.name}
                  extraChoices={activeRaceGrants.filter((grant) => grant.choose > 0)}
                  languageChoices={languageChoices}
                  knownLanguages={knownLanguages}
                  initialLanguagePicks={languagePicks}
                  initialExtraSelected={Object.fromEntries(
                    Object.entries(activeRacePicks).map(([id, picks]) => [
                      id,
                      picks.map((skill) => skill.index),
                    ]),
                  )}
                  initialSelected={classSkills.map((s) => s.index)}
                  backgroundChoice={
                    background?.skillChoice
                      ? { from: background.name, ...background.skillChoice }
                      : null
                  }
                  initialBackgroundSelected={backgroundSkills.map(
                    (s) => s.index,
                  )}
                  onNext={(selected, fromBackground = [], fromRace = {}, languages = {}) => {
                    setClassSkills(selected);
                    setBackgroundSkills(fromBackground);
                    setRacePicks(fromRace);
                    setLanguagePicks(languages);
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
                  key={`background-${pickerVersion}`}
                  onStartFrom={startHomebrewFrom}
                  onMakeOwn={() =>
                    setHomebrewRequest({ category: "background" })
                  }
                  makeOwnLabel="Make your own background"
                  onDraftFrom={(book) => saveDraftFrom("background", book)}
                  onMakeHomebrewFrom={(book) =>
                    setHomebrewRequest({
                      category: "background",
                      fields: {
                        name: book.name,
                        basedOn: book.book,
                        linkUrl: book.link_url,
                      },
                    })
                  }
                  title="Choose a Background"
                  description="Your character's background covers their life before adventuring, including free skills and equipment."
                  category="Background"
                  fetchList={getBackgrounds}
                  fetchDetails={getBackgroundDetails}
                  mapToDetailPanelResult={mapBackgroundToPanel}
                  mapToSnapshot={mapBackgroundToSnapshot}
                  initialSelectedRaw={pickerStart("background", backgroundRaw)}
                  onChoose={(snapshot, raw) => {
                    setBackground(snapshot);
                    setBackgroundRaw(raw);
                    setLanguagePicks({});
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
                  skills={collectSkills({
                    background,
                    backgroundSkills,
                    classSkills,
                    raceGrants: activeRaceGrants,
                    racePicks: activeRacePicks,
                    className: characterClass?.name,
                  })}
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
      <HomebrewDialog
        request={homebrewRequest}
        onClose={() => setHomebrewRequest(null)}
        onCreated={handleHomebrewCreated}
      />
    </main>
  );
}

// Start fresh remounts the page (a new key), so every choice resets at once.
function CharacterCreationRoute() {
  const [run, setRun] = useState(0);
  return (
    <CharacterCreationPage
      key={run}
      onStartFresh={() => setRun((count) => count + 1)}
    />
  );
}

export default CharacterCreationRoute;
