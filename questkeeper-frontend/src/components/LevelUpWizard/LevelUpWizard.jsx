import { useState, useEffect } from "react";
import {
  createPendingLevelUp,
  getLevelUpStepKeys,
  rollDie,
  getAverageHitDieValue,
  getAbilityModifier,
  finalizeLevelUp,
  getFeatDescriptionLines,
  ABILITY_SCORES,
  ABILITY_LABELS,
  ABILITY_DESCRIPTIONS,
  ABILITY_ABBREVIATIONS,
  MAX_ABILITY_SCORE,
  canIncreaseAbility,
  formatModifier,
  getProficiencyBonus,
  getMaxSpellLevel,
  getLevelUpSpellPlan,
  countsTowardSpellsKnown,
  getBookSpellChoice,
  getSafeSpellLink,
  getLevelUpHitPointGain,
  buildLevelUpSummary,
  getSpellSlots,
  isReplacedByOption,
  subclassSpellsToGrant,
} from "../../utils/characterSheet";
import { loadHomebrew } from "../../utils/homebrewCache";
import {
  featureDamageAt,
  getSubclassBonusSpells,
  getSubclassFeatureDamage,
} from "../../utils/homebrewMappers";

import {
  getFeats,
  getFeatDetails,
  getClassSpells,
  getClassDetails,
  getSubclassDetails,
  getSubclassFeatures,
  getSpellDetails,
} from "../../utils/api";
import "./LevelUpWizard.css";
import Button from "../Button/Button";
import SourceBadge from "../SourceBadge/SourceBadge";
import BookEntryPanel from "../BookEntryPanel/BookEntryPanel";
import HomebrewDialog from "../HomebrewDialog/HomebrewDialog";
import {
  featuresForNewLevel,
  loadFeatureEntries,
  mapSubclassToPanel,
} from "../../utils/srdDetails";
import {
  BOOK_OPTION,
  SKIP_OPTION,
  formatOption,
  getLevelUpFeatureChoices,
  resolveLevelUpFeatureChoices,
} from "../../utils/featureChoices";
import { getFeatureSubclassId, sourceFromEntry } from "../../utils/featureSources";
import { isHomebrewId, toHomebrewIndex } from "../../utils/homebrewMappers";
import { OFFICIAL_BOOKS_GROUP } from "../../utils/bookBackgrounds";
import { spellFactsFrom } from "../../utils/spellComponents";

// The dropdown value for "Book spell instead": the player types the spell in
// themselves, for spells from books that aren't in the SRD list.
const BOOK_PICK = "__book__";

// setupTasks: choices still open from earlier (a level 1 Favored Enemy, a
// language), listed so they aren't mixed up with this level's new ones.
function LevelUpWizard({ sheet, onComplete, onCancel, isFinishing = false, setupTasks = [] }) {
  const targetLevel = sheet.level + 1;
  const hitDie = sheet.class?.hitDie ?? 8;
  const conModifier = getAbilityModifier(sheet.abilityScores.constitution);

  const [pendingLevelUp, setPendingLevelUp] = useState(() =>
    createPendingLevelUp(
      targetLevel,
      getLevelUpStepKeys(targetLevel, sheet.class, sheet.spellcasting, sheet.optionalFeatures),
    ),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [hpChoice, setHpChoice] = useState(null); // { source: "roll" | "average", amount }
  const [manualHp, setManualHp] = useState("");
  const [asiMode, setAsiMode] = useState(""); // "asi-two" | "asi-one" | "feat"
  const [asiAbility, setAsiAbility] = useState("");
  const [asiAbilities, setAsiAbilities] = useState([]);
  const [allFeats, setAllFeats] = useState([]);
  const [featSelection, setFeatSelection] = useState("");
  const [featDetails, setFeatDetails] = useState(null);
  const [isFeatLoading, setIsFeatLoading] = useState(false);

  // Subclass step: every option for this class (SRD + Open5e), the one the
  // player is looking at, and what it grants.
  const [subclassOptions, setSubclassOptions] = useState([]);
  const [selectedSubclassIndex, setSelectedSubclassIndex] = useState("");
  const [classSubclass, setClassSubclass] = useState(null);
  const [subclassFeatures, setSubclassFeatures] = useState([]);
  const [isSubclassLoading, setIsSubclassLoading] = useState(true);
  const [subclassError, setSubclassError] = useState("");
  // "Make it as homebrew" for a book subclass: the open pop-up, and a counter
  // that reloads the list so the new homebrew shows up.
  const [homebrewRequest, setHomebrewRequest] = useState(null);
  const [subclassListVersion, setSubclassListVersion] = useState(0);

  const [classSpells, setClassSpells] = useState([]);
  const [isSpellsLoading, setIsSpellsLoading] = useState(true);
  const [spellsError, setSpellsError] = useState("");
  // Spell step: one slot per new cantrip and per new spell (an empty string
  // until picked), the optional swap, and the spell whose details are showing.
  const spellPlan = getLevelUpSpellPlan(sheet.class, sheet.spellcasting, targetLevel);
  const [cantripPicks, setCantripPicks] = useState(() => Array(spellPlan.cantrips).fill(""));
  const [spellPicks, setSpellPicks] = useState(() => Array(spellPlan.spells).fill(""));
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapRemoveIndex, setSwapRemoveIndex] = useState("");
  const [swapAddIndex, setSwapAddIndex] = useState("");
  const [isSavingSpells, setIsSavingSpells] = useState(false);
  const [selectedSpellIndex, setSelectedSpellIndex] = useState("");
  // What was typed for each "Book spell instead" pick, by slot ("cantrip-0",
  // "spell-1", "swap"), so switching a slot back and forth keeps the typing.
  const [bookDrafts, setBookDrafts] = useState({});
  const [selectedSpellDetails, setSelectedSpellDetails] = useState(null);

  // Feature step (Fighting Style, Expertise, Invocations...): the choices
  // this level asks for (null while loading), and what's been picked.
  const [featureGroups, setFeatureGroups] = useState(null);
  const [featureError, setFeatureError] = useState("");
  const [featurePicks, setFeaturePicks] = useState({});
  const [featureBookDrafts, setFeatureBookDrafts] = useState({});

  const currentStep = pendingLevelUp.steps[stepIndex];

  const isAsiValid =
    (asiMode === "asi-one" && asiAbility) ||
    (asiMode === "asi-two" && asiAbilities.length === 2) ||
    (asiMode === "feat" && Boolean(featDetails));

  // Follows the class's own slots, so half casters and Warlocks only see spells they can cast.
  const maxSpellLevel = getMaxSpellLevel(sheet.class, targetLevel);
  // Spells already on the sheet are never offered again. Spells typed in by
  // hand have a made-up index, so they're matched by name too.
  const sheetSpells = [
    ...(sheet.spellcasting?.cantripsKnown ?? []),
    ...(sheet.spellcasting?.spellsKnown ?? []),
  ];
  const knownSpellIndexes = new Set(sheetSpells.map((s) => s.index));
  const knownSpellNames = new Set(sheetSpells.map((s) => s.name?.toLowerCase()));
  const availableSpells = classSpells.filter(
    (spell) =>
      spell.level <= maxSpellLevel &&
      !knownSpellIndexes.has(spell.index) &&
      !knownSpellNames.has(spell.name.toLowerCase()),
  );
  const availableCantrips = availableSpells.filter((spell) => spell.level === 0);
  const availableLeveled = availableSpells.filter((spell) => spell.level > 0);
  // Only class spells count toward spells known, so only they can be swapped
  // out (a subclass's bonus spells stay put).
  const swappableSpells = (sheet.spellcasting?.spellsKnown ?? []).filter(
    countsTowardSpellsKnown,
  );
  // If the list has fewer spells left than picks, the player takes what's
  // there. A homebrew class's one pick is only a guess, so it can be skipped.
  const neededCantrips = Math.min(spellPlan.cantrips, availableCantrips.length);
  const neededSpells = spellPlan.isEstimate
    ? 0
    : Math.min(spellPlan.spells, availableLeveled.length);
  // A typed book spell, or null while it's unfinished or already on the sheet.
  function bookChoiceFor(slotKey, isCantrip) {
    const choice = getBookSpellChoice(bookDrafts[slotKey], { isCantrip, maxSpellLevel });
    if (!choice || knownSpellNames.has(choice.name.toLowerCase())) return null;
    return choice;
  }
  // A slot is done once it has an SRD spell, or a finished book spell.
  const isPickDone = (value, slotKey, isCantrip) =>
    Boolean(value) && (value !== BOOK_PICK || Boolean(bookChoiceFor(slotKey, isCantrip)));
  const donePicks = (picks, prefix, isCantrip) =>
    picks.filter((value, slot) => isPickDone(value, `${prefix}-${slot}`, isCantrip)).length;
  const isSpellStepValid =
    donePicks(cantripPicks, "cantrip", true) >= neededCantrips &&
    donePicks(spellPicks, "spell", false) >= neededSpells &&
    (!isSwapping ||
      (Boolean(swapRemoveIndex) && isPickDone(swapAddIndex, "swap", false)));

  function setBookDraft(slotKey, draft) {
    setBookDrafts((prev) => ({ ...prev, [slotKey]: draft }));
  }

  useEffect(() => {
    if (currentStep?.key !== "spells") return;

    getClassSpells(sheet.class.id)
      .then((results) => setClassSpells(results))
      .catch(() =>
        setSpellsError("Unable to load spell list. Please try again later."),
      )
      .finally(() => setIsSpellsLoading(false));
  }, [currentStep?.key, sheet.class]);

  useEffect(() => {
    if (!selectedSpellIndex) return;

    getSpellDetails(selectedSpellIndex)
      .then(setSelectedSpellDetails)
      .catch(() => setSelectedSpellDetails(null));
  }, [selectedSpellIndex]);

  const isSpellDetailLoading =
    Boolean(selectedSpellIndex) &&
    selectedSpellDetails?.index !== selectedSpellIndex;

  // The class at the new level: with the subclass picked in this wizard, so
  // a subclass's own choices are found too.
  const pickedSubclass = pendingLevelUp.steps.find((step) => step.key === "subclass")?.data;
  const leveledClass = pickedSubclass ? { ...sheet.class, subclass: pickedSubclass } : sheet.class;

  // Load this level's feature choices once the player reaches that step.
  useEffect(() => {
    if (currentStep?.key !== "features") return;
    let ignore = false;

    loadFeatureEntries({
      classId: leveledClass?.id,
      subclassId: getFeatureSubclassId(leveledClass),
      raceId: sheet.race?.id,
      subraceId: sheet.race?.subrace?.id,
    })
      .then((entries) => {
        if (ignore) return;
        if (entries.length === 0) throw new Error("No features found");
        setFeatureGroups(
          getLevelUpFeatureChoices(entries, { ...sheet, class: leveledClass }, targetLevel),
        );
      })
      .catch(() => {
        if (ignore) return;
        setFeatureGroups([]);
        setFeatureError(
          "Couldn't load this level's choices right now. You can make them later on the Features tab.",
        );
      });

    return () => {
      ignore = true;
    };
    // leveledClass is rebuilt each render; the step key and subclass are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep?.key, pickedSubclass?.id]);

  // Review: the new level's features and the subclass's bonus spells, looked
  // up when the review shows (null while loading; entries null if it failed).
  const [reviewLookups, setReviewLookups] = useState(null);
  useEffect(() => {
    if (currentStep) return;
    let ignore = false;
    Promise.all([
      loadFeatureEntries({
        classId: leveledClass?.id,
        subclassId: getFeatureSubclassId(leveledClass),
        raceId: sheet.race?.id,
        subraceId: sheet.race?.subrace?.id,
      }).catch(() => null),
      loadHomebrew().catch(() => []),
    ]).then(([entries, homebrew]) => {
      if (!ignore) setReviewLookups({ entries, homebrew });
    });
    return () => {
      ignore = true;
    };
    // leveledClass is rebuilt each render; the step and subclass are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, pickedSubclass?.id]);

  // What goes on the sheet, or null while a pick is missing or repeated.
  const resolvedFeatureChoices = featureGroups
    ? resolveLevelUpFeatureChoices(featureGroups, featurePicks, featureBookDrafts, sheet, {
        safeLink: getSafeSpellLink,
        sourceOf: sourceFromEntry,
      })
    : null;

  function setFeaturePick(groupKey, slot, value) {
    setFeaturePicks((prev) => {
      const slots = [...(prev[groupKey] ?? [])];
      slots[slot] = value;
      return { ...prev, [groupKey]: slots };
    });
  }

  function setFeatureBookDraft(draftKey, draft) {
    setFeatureBookDrafts((prev) => ({ ...prev, [draftKey]: draft }));
  }

  // Load the list of subclasses once the player reaches that step.
  useEffect(() => {
    if (currentStep?.key !== "subclass") return;

    getClassDetails(sheet.class.id)
      .then((classData) => {
        const options = classData.subclasses ?? [];
        if (options.length === 0) throw new Error("No subclass available");
        setSubclassOptions(options);
        // Only one choice (Open5e down)? Open it straight away.
        if (options.length === 1) setSelectedSubclassIndex(options[0].index);
      })
      .catch(() =>
        setSubclassError(
          "Unable to load subclasses. Please try again later.",
        ),
      )
      .finally(() => setIsSubclassLoading(false));
  }, [currentStep?.key, sheet.class, subclassListVersion]);

  // Load the picked subclass's description and its feature list.
  useEffect(() => {
    if (!selectedSubclassIndex) return;
    let ignore = false;

    Promise.all([
      getSubclassDetails(selectedSubclassIndex),
      getSubclassFeatures(selectedSubclassIndex).catch(() => []),
    ])
      .then(([details, features]) => {
        if (ignore) return;
        setClassSubclass(details);
        setSubclassFeatures(features);
      })
      .catch(() => {
        if (!ignore) setClassSubclass(null);
      });

    // Stops a slow answer for an earlier pick from replacing a newer one.
    return () => {
      ignore = true;
    };
  }, [selectedSubclassIndex]);

  const isSubclassDetailLoading =
    Boolean(selectedSubclassIndex) &&
    classSubclass?.index !== selectedSubclassIndex;

  // A published-book subclass: only a summary and link, so it can't be chosen
  // as-is; it can be rebuilt as homebrew instead.
  const bookSubclass = classSubclass?.is_book_entry
    ? { ...mapSubclassToPanel(classSubclass).bookEntry, inPicker: true }
    : null;

  // The homebrew version was saved: reload the list and select it.
  function handleHomebrewCreated(saved) {
    setHomebrewRequest(null);
    setSubclassListVersion((version) => version + 1);
    setSelectedSubclassIndex(toHomebrewIndex(saved.id));
  }

  // 2014 characters get 2014 feats only (the 2014 SRD's and the player's
  // homebrew): no 2024 feats such as Epic Boons or the 2024 Fighting Style
  // feats, which belong to the other rules.
  useEffect(() => {
    getFeats()
      .then((feats) => setAllFeats(feats.filter((feat) => feat.edition !== "2024")))
      .catch(() => {
        // Feat picking degrades to an empty dropdown; not worth a hard
        // error state for this one field.
      });
  }, []);

  function completeStep(data) {
    setPendingLevelUp((prev) => ({
      ...prev,
      steps: prev.steps.map((step, index) =>
        index === stepIndex ? { ...step, status: "complete", data } : step,
      ),
    }));
    setStepIndex((i) => i + 1);
  }

  function toggleAsiAbility(ability) {
    setAsiAbilities((prev) => {
      if (prev.includes(ability)) return prev.filter((a) => a !== ability);
      if (prev.length >= 2) return prev;
      return [...prev, ability];
    });
  }

  function handleFeatSelectionChange(selection) {
    setFeatSelection(selection);

    if (!selection) {
      setFeatDetails(null);
      return;
    }

    const [edition, featIndex] = selection.split(":");
    setIsFeatLoading(true);
    getFeatDetails(featIndex, edition)
      .then(setFeatDetails)
      .catch(() => setFeatDetails(null))
      .finally(() => setIsFeatLoading(false));
  }

  function confirmAbilityOrFeat() {
    let data;

    if (asiMode === "asi-one") {
      data = { type: "asi-one", ability: asiAbility };
    } else if (asiMode === "asi-two") {
      data = { type: "asi-two", abilities: asiAbilities };
    } else {
      data = {
        type: "feat",
        featName: featDetails.name,
        featEdition: featDetails.edition,
      };
    }

    completeStep(data);
  }

  // Changes one pick slot, and shows that spell's details.
  function setPick(setPicks, slot, index) {
    setPicks((prev) => prev.map((value, i) => (i === slot ? index : value)));
    if (index && index !== BOOK_PICK) setSelectedSpellIndex(index);
  }

  // The spells picked in every other slot, so one spell can't be picked twice.
  function takenElsewhere(exceptIndex) {
    return new Set(
      [...cantripPicks, ...spellPicks, isSwapping ? swapAddIndex : ""].filter(
        (index) => index && index !== BOOK_PICK && index !== exceptIndex,
      ),
    );
  }

  async function confirmSpells() {
    setIsSavingSpells(true);
    // V, S, M come from each spell's details; if a lookup fails the spell is
    // still added, and "Fill in from the SRD" on the Spells tab can fix it.
    // A book spell is used as typed; it has no SRD details to look up.
    const toChoice = async (index, slotKey, isCantrip) => {
      if (index === BOOK_PICK) return bookChoiceFor(slotKey, isCantrip);
      const spell = classSpells.find((s) => s.index === index);
      const details = await getSpellDetails(index).catch(() => null);
      return {
        index: spell.index,
        name: spell.name,
        level: spell.level,
        components: (details?.components ?? []).join(", "),
        facts: spellFactsFrom(details),
      };
    };

    // Unfinished slots are skipped (allowed when the list ran short).
    const chosen = (picks, prefix, isCantrip) =>
      Promise.all(
        picks
          .map((value, slot) => [value, `${prefix}-${slot}`])
          .filter(([value, slotKey]) => isPickDone(value, slotKey, isCantrip))
          .map(([value, slotKey]) => toChoice(value, slotKey, isCantrip)),
      );
    const [cantrips, spells, swapAdd] = await Promise.all([
      chosen(cantripPicks, "cantrip", true),
      chosen(spellPicks, "spell", false),
      isSwapping ? toChoice(swapAddIndex, "swap", false) : null,
    ]);
    const removed = swappableSpells.find((s) => s.index === swapRemoveIndex);
    setIsSavingSpells(false);

    completeStep({
      cantrips,
      spells,
      swap: swapAdd
        ? { removeIndex: removed.index, removeName: removed.name, add: swapAdd }
        : null,
    });
  }

  function describeStepChoice(step) {
    if (step.key === "hitPoints") {
      // Uses the CON after this level's Ability Score Improvement, the same
      // way the sheet works it out when the level-up finishes.
      const gain = getLevelUpHitPointGain(sheet, pendingLevelUp.steps);
      const earlier = gain.earlierLevels
        ? `, +${gain.earlierLevels} for earlier levels from the higher CON`
        : "";
      return `Hit Points: +${gain.total} (${step.data.amount} rolled/taken + ${gain.conModifier} CON${earlier})`;
    }

    if (step.key === "abilityOrFeat") {
      if (step.data.type === "asi-one") {
        return `Ability Score Improvement: +2 ${ABILITY_LABELS[step.data.ability]}`;
      }
      if (step.data.type === "asi-two") {
        return `Ability Score Improvement: +1 ${step.data.abilities
          .map((a) => ABILITY_LABELS[a])
          .join(", +1 ")}`;
      }
      return `Feat: ${step.data.featName}`;
    }

    if (step.key === "subclass") {
      return `New Subclass: ${step.data.name}`;
    }

    if (step.key === "features") {
      const data = step.data ?? {};
      const parts = (data.features ?? []).map((feature) =>
        feature.link || !feature.description ? `${feature.name} (book)` : feature.name,
      );
      // List picks (Favored Enemy: Undead) show what was picked.
      const withPicks = (data.features ?? []).map((feature, i) => {
        const picks = (feature.choices ?? []).flatMap((choice) => choice.picked ?? []);
        return picks.length ? `${feature.name}: ${picks.map(formatOption).join(", ")}` : parts[i];
      });
      if (data.expertise?.length) {
        withPicks.push(`Expertise: ${data.expertise.map(formatOption).join(", ")}`);
      }
      (data.skipped ?? []).forEach((name) => withPicks.push(`${name}: skipped`));
      return withPicks.length ? `Class choices: ${withPicks.join(" · ")}` : "Class choices: none made";
    }

    if (step.key === "spells") {
      const data = step.data ?? {};
      // Book spells have no SRD index; "(book)" shows which ones were typed in.
      const nameOf = (spell) => (spell.index ? spell.name : `${spell.name} (book)`);
      const names = (list) => list.map(nameOf).join(", ");
      const parts = [];
      if (data.cantrips?.length) parts.push(`New cantrips: ${names(data.cantrips)}`);
      if (data.spells?.length) {
        parts.push(
          `${spellPlan.isSpellbook ? "Added to spellbook" : "New spells"}: ${names(data.spells)}`,
        );
      }
      if (data.swap) parts.push(`Swapped ${data.swap.removeName} for ${nameOf(data.swap.add)}`);
      return parts.length ? parts.join(" · ") : "No spell changes";
    }

    return null;
  }

  // The review's "comes with this level" list: worked out from a preview of
  // the finished sheet (nothing is saved until Confirm), so it matches what
  // the level-up will really do.
  function getAutomaticGains() {
    const preview = finalizeLevelUp({
      ...sheet,
      pendingLevelUp: { ...pendingLevelUp, status: "complete" },
    });
    const summary = buildLevelUpSummary(sheet, preview);
    const gains = [];
    if (summary.toProficiency !== summary.fromProficiency) {
      gains.push(`Proficiency bonus: +${summary.fromProficiency} → +${summary.toProficiency}`);
    }
    const slotsBefore = Object.fromEntries(getSpellSlots(sheet.spellcasting).map((slot) => [slot.level, slot.max]));
    const slotChanges = getSpellSlots(preview.spellcasting)
      .filter((slot) => slot.max !== (slotsBefore[slot.level] ?? 0))
      .map((slot) => `level ${slot.level}: ${slotsBefore[slot.level] ?? 0} → ${slot.max}`);
    if (slotChanges.length) gains.push(`Spell slots: ${slotChanges.join(", ")}`);
    const speedBefore = Number(sheet.combat?.speed) || 30;
    const speedAfter = Number(preview.combat?.speed) || 30;
    if (speedAfter !== speedBefore) gains.push(`Speed: ${speedBefore} → ${speedAfter} ft`);

    // Features picked in Class Choices are listed with the choices instead.
    const picked = new Set(
      (pendingLevelUp.steps.find((step) => step.key === "features")?.data?.features ?? []).map(
        (feature) => feature.name,
      ),
    );
    const granted = summary.newFeatures.map((feature) => feature.name).filter((name) => !picked.has(name));
    const looked = reviewLookups?.entries
      ? featuresForNewLevel(
          reviewLookups.entries,
          targetLevel,
          (preview.features ?? []).map((feature) => feature.name),
        )
          .filter((entry) => !isReplacedByOption(preview, entry.name))
          .map((entry) => entry.name)
      : [];
    const features = [...new Set([...granted, ...looked])];
    if (features.length) gains.push(`New features: ${features.join(", ")}`);

    const grantedSpells = summary.newSpells.filter((spell) => spell.grantedBy);
    const subclassSpells = subclassSpellsToGrant(
      preview,
      getSubclassBonusSpells(leveledClass?.subclass?.id, reviewLookups?.homebrew ?? []),
      targetLevel,
    );
    const spellNames = [
      ...grantedSpells.map((spell) => `${spell.name} (${spell.grantedBy})`),
      ...subclassSpells.map(
        (spell) =>
          `${spell.name} (${spell.source || leveledClass.subclass.name}${spell.freeCast ? ", 1 free cast per long rest" : ""})`,
      ),
    ];
    if (spellNames.length) gains.push(`Spells you always know: ${spellNames.join(", ")}`);

    // A homebrew feature whose extra damage grows at this level
    // (Dreadful Strikes: 1d4 → 1d6).
    getSubclassFeatureDamage(leveledClass?.subclass?.id, reviewLookups?.homebrew ?? []).forEach(
      (feature) => {
        const now = featureDamageAt(feature, targetLevel);
        const before = featureDamageAt(feature, targetLevel - 1);
        if (!now || feature.level >= targetLevel || now.dice === before?.dice) return;
        gains.push(
          `${feature.name} damage: ${before ? `${before.dice} → ` : ""}${now.dice}${now.type ? ` ${now.type}` : ""}`,
        );
      },
    );
    return gains;
  }

  function handleFinish() {
    const finished = finalizeLevelUp({
      ...sheet,
      pendingLevelUp: { ...pendingLevelUp, status: "complete" },
    });
    // Features skipped in Class Choices, so the sheet doesn't add them anyway
    // when it fills in the new level's features.
    const skippedFeatures =
      pendingLevelUp.steps.find((step) => step.key === "features")?.data?.skipped ?? [];
    onComplete(finished, { skippedFeatures });
  }

  return (
    <div className="level-up-wizard">
      <div className="level-up-wizard__header">
        <p className="level-up-wizard__character-name">
          {sheet.name} — {sheet.race?.name ?? "No race"}{" "}
          {sheet.class?.name ?? "No class"} ·{" "}
          {sheet.background?.name ?? "No background"}
        </p>
        <h2 className="level-up-wizard__title">
          Level {sheet.level} &rarr; {targetLevel}
        </h2>
        <p className="level-up-wizard__step-count">
          Step {Math.min(stepIndex + 1, pendingLevelUp.steps.length)} of{" "}
          {pendingLevelUp.steps.length}
        </p>
      </div>

      <div className="level-up-wizard__current-stats">
        <span className="level-up-wizard__current-stat">
          HP{" "}
          <strong>
            {sheet.combat.hitPoints.current}/{sheet.combat.hitPoints.max}
          </strong>
        </span>
        <span className="level-up-wizard__current-stat">
          AC <strong>{sheet.combat.armorClass}</strong>
        </span>
        <span className="level-up-wizard__current-stat">
          Proficiency{" "}
          <strong>{formatModifier(getProficiencyBonus(sheet.level))}</strong>
        </span>
        {ABILITY_SCORES.map((ability) => (
          <span className="level-up-wizard__current-stat" key={ability}>
            {ABILITY_ABBREVIATIONS[ability]}{" "}
            <strong>
              {sheet.abilityScores[ability]} (
              {formatModifier(getAbilityModifier(sheet.abilityScores[ability]))}
              )
            </strong>
          </span>
        ))}
      </div>

      {/* Shown on the first step only. Levelling up is fine; these are
          finished on the Features tab whenever the player likes. */}
      {stepIndex === 0 && setupTasks.length > 0 && (
        <div className="level-up-wizard__setup-note" role="status">
          <p>
            Still open from earlier ({setupTasks.length}). You can level up now and
            finish {setupTasks.length === 1 ? "it" : "them"} on the Features tab:
          </p>
          <ul>
            {setupTasks.map((task) => (
              <li key={task.key}>{task.label}</li>
            ))}
          </ul>
        </div>
      )}

      {currentStep?.key === "hitPoints" && (
        <div className="level-up-wizard__step">
          <h3 className="level-up-wizard__step-title">Hit Points</h3>
          <p className="level-up-wizard__step-description">
            Roll a d{hitDie} or take the average, then add your Constitution
            modifier ({conModifier >= 0 ? "+" : ""}
            {conModifier}).
          </p>

          <div className="level-up-wizard__hp-options">
            <button
              type="button"
              className="level-up-wizard__hp-button"
              onClick={() =>
                setHpChoice({ source: "roll", amount: rollDie(hitDie) })
              }
            >
              Roll d{hitDie}
            </button>

            <button
              type="button"
              className="level-up-wizard__hp-button"
              onClick={() =>
                setHpChoice({
                  source: "average",
                  amount: getAverageHitDieValue(hitDie),
                })
              }
            >
              Take Average ({getAverageHitDieValue(hitDie)})
            </button>
          </div>

          <div className="level-up-wizard__hp-manual">
            <label
              className="level-up-wizard__hp-manual-label"
              htmlFor="manual-hp-input"
            >
              Rolled it yourself with real dice? Enter the result (1-{hitDie}):
            </label>

            <div className="level-up-wizard__hp-manual-row">
              <input
                id="manual-hp-input"
                type="number"
                min="1"
                max={hitDie}
                className="level-up-wizard__hp-manual-input"
                value={manualHp}
                onChange={(e) => setManualHp(e.target.value)}
              />

              <button
                type="button"
                className="level-up-wizard__hp-button"
                disabled={
                  manualHp === "" ||
                  !Number.isInteger(Number(manualHp)) ||
                  Number(manualHp) < 1 ||
                  Number(manualHp) > hitDie
                }
                onClick={() =>
                  setHpChoice({ source: "manual", amount: Number(manualHp) })
                }
              >
                Use This Roll
              </button>
            </div>
          </div>

          {hpChoice && (
            <p className="level-up-wizard__hp-result">
              {hpChoice.source === "roll"
                ? "Rolled"
                : hpChoice.source === "manual"
                  ? "Entered"
                  : "Took average of"}{" "}
              {hpChoice.amount} + {conModifier} CON ={" "}
              <strong>{Math.max(1, hpChoice.amount + conModifier)}</strong> HP
            </p>
          )}

          <Button
            disabled={!hpChoice}
            onClick={() => completeStep({ amount: hpChoice.amount })}
          >
            Next
          </Button>
        </div>
      )}

      {currentStep?.key === "abilityOrFeat" && (
        <div className="level-up-wizard__step">
          <h3 className="level-up-wizard__step-title">
            Ability Score Improvement
          </h3>
          <p className="level-up-wizard__step-description">
            At level {targetLevel}, choose one: increase two abilities by +1
            each, increase one ability by +2, or take a feat. Ability scores
            can&apos;t go above {MAX_ABILITY_SCORE}.
          </p>

          <div className="level-up-wizard__mode-options">
            <button
              type="button"
              className={`level-up-wizard__mode-button${
                asiMode === "asi-two"
                  ? " level-up-wizard__mode-button--active"
                  : ""
              }`}
              onClick={() => setAsiMode("asi-two")}
            >
              +1 to Two Abilities
            </button>

            <button
              type="button"
              className={`level-up-wizard__mode-button${
                asiMode === "asi-one"
                  ? " level-up-wizard__mode-button--active"
                  : ""
              }`}
              onClick={() => setAsiMode("asi-one")}
            >
              +2 to One Ability
            </button>

            <button
              type="button"
              className={`level-up-wizard__mode-button${
                asiMode === "feat"
                  ? " level-up-wizard__mode-button--active"
                  : ""
              }`}
              onClick={() => setAsiMode("feat")}
            >
              Take a Feat
            </button>
          </div>

          {asiMode === "asi-two" && (
            <div className="level-up-wizard__ability-checklist">
              {ABILITY_SCORES.map((ability) => {
                const score = sheet.abilityScores[ability];
                const isMaxed = !canIncreaseAbility(score, 1);
                return (
                  <label
                    className="level-up-wizard__ability-checkbox"
                    key={ability}
                  >
                    <input
                      type="checkbox"
                      checked={asiAbilities.includes(ability)}
                      disabled={
                        isMaxed ||
                        (!asiAbilities.includes(ability) &&
                          asiAbilities.length >= 2)
                      }
                      onChange={() => toggleAsiAbility(ability)}
                    />
                    <span className="level-up-wizard__ability-checkbox-text">
                      <span className="level-up-wizard__ability-checkbox-name">
                        {ABILITY_LABELS[ability]} ({score})
                      </span>
                      <span className="level-up-wizard__ability-checkbox-hint">
                        {isMaxed
                          ? `Already at ${MAX_ABILITY_SCORE}, the most an ability can be.`
                          : ABILITY_DESCRIPTIONS[ability]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {asiMode === "asi-one" && (
            <>
              <select
                className="level-up-wizard__ability-select"
                value={asiAbility}
                onChange={(e) => setAsiAbility(e.target.value)}
              >
                <option value="">Choose an ability</option>
                {ABILITY_SCORES.map((ability) => {
                  const score = sheet.abilityScores[ability];
                  const canTakeTwo = canIncreaseAbility(score, 2);
                  return (
                    <option
                      key={ability}
                      value={ability}
                      disabled={!canTakeTwo}
                    >
                      {`${ABILITY_LABELS[ability]} (${score}${
                        canTakeTwo
                          ? ` → ${score + 2}`
                          : score >= MAX_ABILITY_SCORE
                            ? `, already at ${MAX_ABILITY_SCORE}`
                            : `, +2 would pass ${MAX_ABILITY_SCORE}`
                      })`}
                    </option>
                  );
                })}
              </select>
              {asiAbility && (
                <p className="level-up-wizard__step-description">
                  {ABILITY_DESCRIPTIONS[asiAbility]}
                </p>
              )}
            </>
          )}

          {asiMode === "feat" && (
            <>
              <select
                className="level-up-wizard__ability-select"
                value={featSelection}
                onChange={(e) => handleFeatSelectionChange(e.target.value)}
              >
                <option value="">Choose a feat</option>
                {allFeats.map((feat) => (
                  <option
                    key={`${feat.edition}:${feat.index}`}
                    value={`${feat.edition}:${feat.index}`}
                  >
                    {feat.name} ({feat.edition === "Homebrew" ? "Homebrew" : `${feat.edition} SRD`})
                  </option>
                ))}
              </select>
              <p className="level-up-wizard__book-spell-hint">
                A feat from a book (like Sharpshooter) isn&apos;t listed: make it as
                homebrew on the Feats page, and it shows up here.
              </p>

              {/* Only shown once there's a feat to describe, so no empty box
                  sits under the dropdown before one is picked. */}
              {(isFeatLoading || featDetails) && (
                <div className="level-up-wizard__feat-card">
                  {isFeatLoading && <p>Loading feat...</p>}
                  {featDetails && (
                    <>
                      <h4>{featDetails.name}</h4>
                      {getFeatDescriptionLines(featDetails).map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <Button disabled={!isAsiValid} onClick={confirmAbilityOrFeat}>
            Next
          </Button>
        </div>
      )}

      {currentStep?.key === "subclass" && (
        <div className="level-up-wizard__step">
          <h3 className="level-up-wizard__step-title">Choose Your Subclass</h3>
          <p className="level-up-wizard__step-description">
            At level {targetLevel}, {sheet.class?.name ?? "your class"} picks a
            subclass that shapes how you play from here on. Pick one to read
            what it does before you choose.
          </p>

          {isSubclassLoading && <p>Loading subclasses...</p>}
          {subclassError && (
            <p className="level-up-wizard__error">{subclassError}</p>
          )}

          {/* One radio button per subclass, with its book as a badge. */}
          {subclassOptions.length > 0 && (
            <div
              className="level-up-wizard__subclass-list"
              role="radiogroup"
              aria-label="Subclasses"
            >
              {subclassOptions.map((option) => (
                <label
                  className={`level-up-wizard__ability-checkbox${
                    selectedSubclassIndex === option.index
                      ? " level-up-wizard__ability-checkbox--active"
                      : ""
                  }`}
                  key={option.index}
                >
                  <input
                    type="radio"
                    name="subclass"
                    value={option.index}
                    checked={selectedSubclassIndex === option.index}
                    onChange={() => setSelectedSubclassIndex(option.index)}
                  />
                  <span className="level-up-wizard__ability-checkbox-text">
                    <span>{option.name}</span>
                    <SourceBadge
                      source={option.source}
                      official={option.sourceGroup === OFFICIAL_BOOKS_GROUP}
                    />
                  </span>
                </label>
              ))}
            </div>
          )}

          {isSubclassDetailLoading && <p>Loading details...</p>}

          {bookSubclass && !isSubclassDetailLoading && (
            <div className="level-up-wizard__feat-card">
              <h4>{classSubclass.name}</h4>
              <BookEntryPanel entry={bookSubclass} />
            </div>
          )}

          {classSubclass && !bookSubclass && !isSubclassDetailLoading && (
            <div className="level-up-wizard__feat-card">
              <h4>{classSubclass.name}</h4>
              <p>
                <em>{classSubclass.subclass_flavor}</em>{" "}
                <SourceBadge source={classSubclass.source} />
              </p>
              {classSubclass.desc?.map((line, index) => (
                <p key={index}>{line}</p>
              ))}

              {/* What you'll get and when, so players can compare. */}
              {subclassFeatures.length > 0 && (
                <>
                  <p>
                    <strong>Features</strong>
                  </p>
                  <ul className="level-up-wizard__feature-list">
                    {subclassFeatures.map((feature) => (
                      <li key={feature.index}>
                        {feature.name}
                        {feature.level ? ` (level ${feature.level})` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {bookSubclass ? (
            bookSubclass.canMakeHomebrew && (
              <Button
                onClick={() =>
                  setHomebrewRequest({
                    category: "subclass",
                    fields: {
                      name: classSubclass.name,
                      basedOn: classSubclass.book,
                      linkUrl: classSubclass.link_url,
                    },
                    data: { parentClass: sheet.class.id, parentClassName: sheet.class.name },
                    // A homebrew class has to be in the form's class list.
                    classOptions: isHomebrewId(sheet.class.id)
                      ? [{ index: sheet.class.id, name: sheet.class.name }]
                      : [],
                  })
                }
              >
                Make it as homebrew
              </Button>
            )
          ) : (
            <Button
              disabled={!classSubclass || isSubclassDetailLoading}
              onClick={() =>
                completeStep({
                  id: classSubclass.index,
                  name: classSubclass.name,
                  source: classSubclass.source ?? "SRD 5.1",
                  flavor: classSubclass.subclass_flavor,
                })
              }
            >
              Choose {classSubclass?.name ?? "a subclass"}
            </Button>
          )}

          <HomebrewDialog
            request={homebrewRequest}
            onClose={() => setHomebrewRequest(null)}
            onCreated={handleHomebrewCreated}
          />
        </div>
      )}

      {currentStep?.key === "features" && (
        <div className="level-up-wizard__step">
          <h3 className="level-up-wizard__step-title">Class Choices</h3>
          <p className="level-up-wizard__step-description">
            At level {targetLevel}, {sheet.class?.name ?? "your class"} makes these
            choices. Each one goes on the Features tab.
          </p>

          {!featureGroups && <p>Loading choices...</p>}
          {featureError && <p className="level-up-wizard__error">{featureError}</p>}
          {featureGroups?.length === 0 && !featureError && (
            <p className="level-up-wizard__step-description">
              Nothing to choose at this level.
            </p>
          )}

          {featureGroups?.map((group) => (
            <div className="level-up-wizard__feature-group" key={group.key}>
              {Array.from({ length: group.choose }, (_, slot) => {
                const slots = featurePicks[group.key] ?? [];
                const value = slots[slot] ?? "";
                // An option picked in another box of this choice isn't offered again.
                const takenHere = new Set(
                  slots.filter(
                    (pick, i) => i !== slot && pick && pick !== BOOK_OPTION && pick !== SKIP_OPTION,
                  ),
                );
                const draftKey = `${group.key}#${slot}`;
                const picked = group.optionEntries?.[value];
                return (
                  <FeaturePickSelect
                    key={draftKey}
                    label={`${group.title}${group.choose > 1 ? ` ${slot + 1}` : ""}`}
                    value={value}
                    options={group.options.filter((option) => !takenHere.has(option.value))}
                    allowBook={group.kind === "option"}
                    allowSkip={group.kind === "list"}
                    bookPrefix={group.bookPrefix}
                    bookDraft={featureBookDrafts[draftKey]}
                    onBookDraftChange={(draft) => setFeatureBookDraft(draftKey, draft)}
                    onChange={(next) => setFeaturePick(group.key, slot, next)}
                    description={picked?.description}
                    hint={slot === 0 ? group.hint : ""}
                  />
                );
              })}
            </div>
          ))}

          <Button
            disabled={!featureGroups || (!featureError && !resolvedFeatureChoices)}
            onClick={() =>
              completeStep(resolvedFeatureChoices ?? { features: [], expertise: [], skipped: [] })
            }
          >
            Next
          </Button>
        </div>
      )}

      {currentStep?.key === "spells" && (
        <div className="level-up-wizard__step">
          <h3 className="level-up-wizard__step-title">Spells</h3>
          {spellPlan.cantrips > 0 && (
            <p className="level-up-wizard__step-description">
              At level {targetLevel}, {sheet.name} learns {spellPlan.cantrips} new{" "}
              {spellPlan.cantrips === 1 ? "cantrip" : "cantrips"}.
            </p>
          )}
          {spellPlan.spells > 0 && (
            <p className="level-up-wizard__step-description">
              {spellPlan.isSpellbook
                ? `Copy ${spellPlan.spells} new spells into ${sheet.name}'s spellbook`
                : `${sheet.name} learns ${spellPlan.spells} new ${
                    spellPlan.spells === 1 ? "spell" : "spells"
                  }`}
              , up to level {maxSpellLevel}.
            </p>
          )}
          {spellPlan.spells === 0 && spellPlan.canSwap && (
            <p className="level-up-wizard__step-description">
              No new spells for a {sheet.class?.name ?? "character"} at level{" "}
              {targetLevel}, but you may swap one you know.
            </p>
          )}
          {spellPlan.isEstimate && (
            <p className="level-up-wizard__step-description">
              QuestKeeper doesn&apos;t have your homebrew class&apos;s spells-known
              table, so it offers one spell. Leave it empty if your class doesn&apos;t
              learn one at this level.
            </p>
          )}

          {isSpellsLoading && <p>Loading spell list...</p>}
          {spellsError && (
            <p className="level-up-wizard__error">{spellsError}</p>
          )}

          {!isSpellsLoading && !spellsError && (
            <>
              {cantripPicks.map((value, slot) => (
                <SpellPickSelect
                  key={`cantrip-${slot}`}
                  label={`New cantrip${cantripPicks.length > 1 ? ` ${slot + 1}` : ""}`}
                  value={value}
                  options={availableCantrips.filter(
                    (spell) => !takenElsewhere(value).has(spell.index),
                  )}
                  onChange={(index) => setPick(setCantripPicks, slot, index)}
                  isCantrip
                  bookDraft={bookDrafts[`cantrip-${slot}`]}
                  onBookDraftChange={(draft) => setBookDraft(`cantrip-${slot}`, draft)}
                  knownSpellNames={knownSpellNames}
                />
              ))}
              {spellPicks.map((value, slot) => (
                <SpellPickSelect
                  key={`spell-${slot}`}
                  label={`${spellPlan.isSpellbook ? "Spellbook spell" : "New spell"}${
                    spellPicks.length > 1 ? ` ${slot + 1}` : ""
                  }`}
                  value={value}
                  options={availableLeveled.filter(
                    (spell) => !takenElsewhere(value).has(spell.index),
                  )}
                  onChange={(index) => setPick(setSpellPicks, slot, index)}
                  maxSpellLevel={maxSpellLevel}
                  bookDraft={bookDrafts[`spell-${slot}`]}
                  onBookDraftChange={(draft) => setBookDraft(`spell-${slot}`, draft)}
                  knownSpellNames={knownSpellNames}
                />
              ))}

              {(spellPlan.cantrips > 0 || spellPlan.spells > 0) &&
                availableSpells.length === 0 && (
                  <p className="level-up-wizard__step-description">
                    {sheet.name} already knows every spell available at this level.
                  </p>
                )}

              {/* A known caster may trade one spell for another each level,
                  e.g. a placeholder picked before the spell they wanted. */}
              {spellPlan.canSwap && swappableSpells.length > 0 && (
                <div className="level-up-wizard__swap">
                  <label className="level-up-wizard__ability-checkbox">
                    <input
                      type="checkbox"
                      checked={isSwapping}
                      onChange={(e) => setIsSwapping(e.target.checked)}
                    />
                    <span className="level-up-wizard__ability-checkbox-text">
                      <span>Swap one spell you know (optional)</span>
                      <span className="level-up-wizard__ability-checkbox-hint">
                        Replace a spell with another {sheet.class?.name ?? "class"} spell
                        of level {maxSpellLevel} or lower, from the list or a book.
                      </span>
                    </span>
                  </label>
                  {isSwapping && (
                    <>
                      <label className="level-up-wizard__pick-label">
                        Forget
                        <select
                          className="level-up-wizard__spell-select"
                          value={swapRemoveIndex}
                          onChange={(e) => setSwapRemoveIndex(e.target.value)}
                        >
                          <option value="">Choose a spell to forget</option>
                          {swappableSpells.map((spell) => (
                            <option key={spell.index} value={spell.index}>
                              Level {spell.level} — {spell.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <SpellPickSelect
                        label="Learn instead"
                        value={swapAddIndex}
                        options={availableLeveled.filter(
                          (spell) => !takenElsewhere(swapAddIndex).has(spell.index),
                        )}
                        onChange={(index) => {
                          setSwapAddIndex(index);
                          if (index && index !== BOOK_PICK) setSelectedSpellIndex(index);
                        }}
                        maxSpellLevel={maxSpellLevel}
                        bookDraft={bookDrafts.swap}
                        onBookDraftChange={(draft) => setBookDraft("swap", draft)}
                        knownSpellNames={knownSpellNames}
                      />
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {selectedSpellIndex && (
            <div className="level-up-wizard__feat-card">
              {isSpellDetailLoading && <p>Loading spell details...</p>}
              {selectedSpellDetails && (
                <>
                  <h4>{selectedSpellDetails.name}</h4>
                  {/* The facts players compare first, before the description. */}
                  <p className="level-up-wizard__spell-facts">
                    {selectedSpellDetails.level === 0
                      ? "Cantrip"
                      : `Level ${selectedSpellDetails.level}`}
                    {selectedSpellDetails.school?.name ? ` · ${selectedSpellDetails.school.name}` : ""}
                    {selectedSpellDetails.concentration ? " · Concentration" : ""}
                    {selectedSpellDetails.ritual ? " · Ritual" : ""}
                  </p>
                  {selectedSpellDetails.components?.length > 0 && (
                    <p>
                      <strong>Components:</strong> {selectedSpellDetails.components.join(", ")}
                      {selectedSpellDetails.material ? ` (${selectedSpellDetails.material})` : ""}
                    </p>
                  )}
                  {selectedSpellDetails.desc?.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                  {selectedSpellDetails.casting_time && (
                    <p>
                      <strong>Casting Time:</strong>{" "}
                      {selectedSpellDetails.casting_time}
                    </p>
                  )}
                  {selectedSpellDetails.range && (
                    <p>
                      <strong>Range:</strong> {selectedSpellDetails.range}
                    </p>
                  )}
                  {selectedSpellDetails.duration && (
                    <p>
                      <strong>Duration:</strong> {selectedSpellDetails.duration}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <p className="level-up-wizard__step-description">
            Bonus spells from a homebrew subclass (set in My Homebrew) and from
            Tasha&apos;s Primal Awareness are added for you and don&apos;t count. Any
            other extra spell goes on the Spells tab with &ldquo;Doesn&apos;t count
            toward spells known&rdquo; ticked.
          </p>

          <Button
            disabled={isSpellsLoading || !isSpellStepValid || isSavingSpells}
            onClick={confirmSpells}
          >
            {isSavingSpells ? "Saving…" : "Next"}
          </Button>
        </div>
      )}

      {!currentStep && (
        <div className="level-up-wizard__step">
          <h3 className="level-up-wizard__step-title">
            Review Level {targetLevel}
          </h3>
          <p className="level-up-wizard__step-description">
            Double-check {sheet.name}&apos;s level {targetLevel} before finishing. Not
            right? Use Back to change a choice; nothing is saved until you confirm.
          </p>

          <h4 className="level-up-wizard__review-heading">Your choices</h4>
          <ul className="level-up-wizard__review-list">
            {pendingLevelUp.steps.map((step) => (
              <li key={step.key}>{describeStepChoice(step)}</li>
            ))}
          </ul>

          <h4 className="level-up-wizard__review-heading">Comes with level {targetLevel}</h4>
          {!reviewLookups && <p className="level-up-wizard__step-description">Looking up this level&apos;s features…</p>}
          {reviewLookups && !reviewLookups.entries && (
            <p className="level-up-wizard__step-description">
              Couldn&apos;t look up this level&apos;s features right now. They&apos;re added
              when you finish if the rules server answers.
            </p>
          )}
          {reviewLookups && (
            <ul className="level-up-wizard__review-list">
              {getAutomaticGains().map((gain) => (
                <li key={gain}>{gain}</li>
              ))}
              {getAutomaticGains().length === 0 && (
                <li>Nothing else changes at this level, beyond your choices above.</li>
              )}
            </ul>
          )}

          <Button onClick={handleFinish} disabled={isFinishing}>
            {isFinishing ? "Adding your new features…" : "Confirm & Finish Level Up"}
          </Button>
        </div>
      )}
      {/* Back keeps every choice (and the HP roll) as it was. */}
      <div className="level-up-wizard__nav">
        {stepIndex > 0 && (
          <Button variant="secondary" onClick={() => setStepIndex((i) => i - 1)}>
            Back
          </Button>
        )}
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// One labelled dropdown of spells to pick from, cantrips shown as "Cantrip".
// The last choice, "Book spell instead", opens boxes to type in a spell from a
// book that isn't in the SRD list (like Ensnaring Strike), so the player
// doesn't have to take a stand-in and fix it later.
function SpellPickSelect({
  label,
  value,
  options,
  onChange,
  isCantrip = false,
  maxSpellLevel = 0,
  bookDraft,
  onBookDraftChange,
  knownSpellNames,
}) {
  const draft = bookDraft ?? { name: "", level: "1", components: "", link: "" };
  const update = (field) => (e) => onBookDraftChange({ ...draft, [field]: e.target.value });
  const typedName = draft.name.trim();
  const typedLink = draft.link.trim();
  const isLinkBad = typedLink !== "" && !getSafeSpellLink(typedLink);
  const isAlreadyKnown = typedName !== "" && knownSpellNames?.has(typedName.toLowerCase());

  return (
    <div className="level-up-wizard__pick">
      <label className="level-up-wizard__pick-label">
        {label}
        <select
          className="level-up-wizard__spell-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose a spell</option>
          {options.map((spell) => (
            <option key={spell.index} value={spell.index}>
              {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`} — {spell.name}
            </option>
          ))}
          <option value={BOOK_PICK}>Book spell instead (type it in)</option>
        </select>
      </label>

      {value === BOOK_PICK && (
        <div className="level-up-wizard__book-spell">
          <p className="level-up-wizard__book-spell-hint">
            Only the name, level and your link are saved. Read the spell&apos;s
            text in your book.
          </p>
          <label className="level-up-wizard__pick-label">
            Spell name
            <input
              type="text"
              className="level-up-wizard__text-input"
              value={draft.name}
              onChange={update("name")}
            />
          </label>
          {isAlreadyKnown && (
            <p className="level-up-wizard__error">{typedName} is already on your sheet.</p>
          )}
          {/* Capped at the highest level the class can cast at the new level. */}
          {!isCantrip && (
            <label className="level-up-wizard__pick-label">
              Spell level
              <select
                className="level-up-wizard__spell-select"
                value={draft.level}
                onChange={update("level")}
              >
                {Array.from({ length: maxSpellLevel }, (_, i) => i + 1).map((level) => (
                  <option key={level} value={String(level)}>
                    Level {level}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="level-up-wizard__pick-label">
            Components (optional)
            <input
              type="text"
              className="level-up-wizard__text-input"
              placeholder="V, S, M"
              value={draft.components}
              onChange={update("components")}
            />
          </label>
          <label className="level-up-wizard__pick-label">
            Book link (optional)
            <input
              type="url"
              className="level-up-wizard__text-input"
              placeholder="https://"
              value={draft.link}
              onChange={update("link")}
            />
          </label>
          {isLinkBad && (
            <p className="level-up-wizard__error">
              Links need to start with http:// or https://.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// One labelled dropdown for a feature choice (a Fighting Style, a skill for
// Expertise). A pick of features can also be "Book option instead": a typed
// name and an optional link, for options from books that aren't in the SRD
// (like Tasha's Blind Fighting). Only the name and link are saved.
function FeaturePickSelect({
  label,
  value,
  options,
  allowBook,
  allowSkip,
  bookPrefix,
  bookDraft,
  onBookDraftChange,
  onChange,
  description,
  hint = "",
}) {
  const draft = bookDraft ?? { name: "", link: "" };
  const update = (field) => (e) => onBookDraftChange({ ...draft, [field]: e.target.value });
  const typedLink = draft.link.trim();
  const isLinkBad = typedLink !== "" && !getSafeSpellLink(typedLink);

  return (
    <div className="level-up-wizard__pick">
      <label className="level-up-wizard__pick-label">
        {label}
        <select
          className="level-up-wizard__spell-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose one</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {allowBook && <option value={BOOK_OPTION}>Book option instead (type it in)</option>}
          {allowSkip && (
            <option value={SKIP_OPTION}>Skip: my table uses a book replacement</option>
          )}
        </select>
      </label>

      {hint && <p className="level-up-wizard__book-spell-hint">{hint}</p>}

      {description && value !== BOOK_OPTION && (
        <div className="level-up-wizard__feat-card">
          {description.split("\n").map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}

      {value === SKIP_OPTION && (
        <p className="level-up-wizard__book-spell-hint">
          This feature won&apos;t be added. If your table uses a book version
          instead (like Tasha&apos;s Favored Foe or Deft Explorer), add it on the
          Features tab with Add Feature.
        </p>
      )}

      {value === BOOK_OPTION && (
        <div className="level-up-wizard__book-spell">
          <p className="level-up-wizard__book-spell-hint">
            Only the name and your link are saved. Read the option&apos;s text in
            your book.
          </p>
          <label className="level-up-wizard__pick-label">
            {bookPrefix ? `Name (saved as "${bookPrefix}…")` : "Name"}
            <input
              type="text"
              className="level-up-wizard__text-input"
              value={draft.name}
              onChange={update("name")}
            />
          </label>
          <label className="level-up-wizard__pick-label">
            Book link (optional)
            <input
              type="url"
              className="level-up-wizard__text-input"
              placeholder="https://"
              value={draft.link}
              onChange={update("link")}
            />
          </label>
          {isLinkBad && (
            <p className="level-up-wizard__error">
              Links need to start with http:// or https://.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default LevelUpWizard;
