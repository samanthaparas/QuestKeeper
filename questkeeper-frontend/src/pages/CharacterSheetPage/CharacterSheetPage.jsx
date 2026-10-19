import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useTableTurn } from "../../hooks/useTableTurn";
import { useSheetRolls } from "../../hooks/useSheetRolls";
import RollButton from "../../components/RollDock/RollButton";
import RollDock, { DiceHelp, DiceHelpBody } from "../../components/RollDock/RollDock";
import { RollContext } from "../../components/RollDock/rollContext";
import ConditionBadges from "../../components/ConditionBadges/ConditionBadges";
import DeathSaves from "../../components/DeathSaves/DeathSaves";
import Concentration from "../../components/Concentration/Concentration";
import { conditionWord, turnsElapsed, rollNotesFor, tickConditionRounds } from "../../utils/conditions";
import { countMyTurnsEnded } from "../../utils/initiative";
import { applyDamageToHitPoints } from "../../utils/attacks";
import { getCharacter, saveCharacter } from "../../utils/characterStore";
import {
  ABILITY_SCORES,
  ABILITY_ABBREVIATIONS,
  ABILITY_LABELS,
  SKILLS,
  getAbilityModifier,
  getSkillModifier,
  getSaveModifier,
  getEffectiveArmorClass,
  getProficiencyBonus,
  getSpellcastingAbility,
  formatModifier,
  buildLevelUpSummary,
  createResource,
  createCompanionCreature,
  createCompanionAbilityScores,
  EMPTY_DEATH_SAVES,
  applyDeathSave,
  getConcentrationDc,
  getCompanionNotes,
  updateResource,
  setResourceCurrent,
  removeResource,
  setCurrentHp,
  applyRest,
  takeShortRest,
  getHitDiceRemaining,
  createEquipmentItem,
  updateEquipmentItem,
  removeEquipmentItem,
  getAttunedCount,
  cycleSkillProficiency,
  setTemporaryHp,
  createAttack,
  removeAttack,
  updateAttack,
  createFeat,
  updateFeat,
  removeFeat,
  addManualSpell,
  updateSpell,
  removeSpell,
  getSpellSlots,
  setSpellSlot,
  getSpellsStartAt,
  refreshWeaponAttacks,
  getFightingStyles,
  getOutOfDateNumbers,
  applySpeedUpdates,
  withAutoInitiative,
  setTypedInitiative,
  applyInitiativeUpdate,
  applyFreeCastsSplit,
  applySummonAction,
  getInventoryCategory,
  getSummonInfo,
  getSummonTemplate,
  getSpellAttackModifier,
  isSummonPresent,
  tickSummonRounds,
  withSummonEnded,
  getNewOptionalFeatures,
  markOptionalFeaturesSeen,
  splitMagicWeaponName,
  addSubclassSpells,
  subclassFreeCastsToAdd,
  subclassSpellsToGrant,
  subclassSpellsCountedByHand,
  markSpellsGrantedBy,
  isReplacedByOption,
  applyExpertiseChoices,
  getOptionalClassFeatures,
  describeOptionSwitch,
  switchOptionalFeature,
} from "../../utils/characterSheet";
import LevelUpWizard from "../../components/LevelUpWizard/LevelUpWizard";
import Button from "../../components/Button/Button";
import { getFeatureSubclassId, sourceFromEntry } from "../../utils/featureSources";
import { getSetupTasks } from "../../utils/setupTasks";
import { loadHomebrew } from "../../utils/homebrewCache";
import { getSubclassBonusSpells, getSubclassFeatureDamage } from "../../utils/homebrewMappers";
import { describePicks } from "../../utils/featureChoices";
import { RETRY_DELAYS } from "../../hooks/useSrdEquipmentLookup";
import { fillMissingComponents, spellFactsFromForm } from "../../utils/spellComponents";
import {
  isArmorDetails,
  magicArmorFor,
  withArmorBonus,
  withAutoArmorClass,
  computeWornArmorClass,
} from "../../utils/armorClass";
import { getEquipment, getEquipmentDetails } from "../../utils/api";
import { featuresForNewLevel, loadFeatureEntries, normalizeItemName } from "../../utils/srdDetails";
import CompanionCard from "../../components/CompanionCard/CompanionCard";
import CharacterDetailsDialog from "../../components/CharacterDetailsDialog/CharacterDetailsDialog";
import PortraitUpload from "../../components/PortraitUpload/PortraitUpload";
import TableHandouts from "../../components/TableHandouts/TableHandouts";
import TableJournal from "../../components/TableJournal/TableJournal";
import TurnBanner from "../../components/TurnBanner/TurnBanner";
import AttackPanel from "../../components/AttackPanel/AttackPanel";
import RollHistory from "../../components/RollHistory/RollHistory";
import PersonalJournal from "../../components/PersonalJournal/PersonalJournal";
import ShortRestPanel from "../../components/ShortRestPanel/ShortRestPanel";
import CharacterSheetTabs from "../../components/CharacterSheetTabs/CharacterSheetTabs";
import CharacterSheetActionsTab from "../../components/CharacterSheetActionsTab/CharacterSheetActionsTab";
import CharacterSheetSpellsTab from "../../components/CharacterSheetSpellsTab/CharacterSheetSpellsTab";
import CharacterSheetResourcesTab from "../../components/CharacterSheetResourcesTab/CharacterSheetResourcesTab";
import CharacterSheetInventoryTab from "../../components/CharacterSheetInventoryTab/CharacterSheetInventoryTab";
import CharacterSheetFeaturesTab from "../../components/CharacterSheetFeaturesTab/CharacterSheetFeaturesTab";
import CharacterSheetStoryTab from "../../components/CharacterSheetStoryTab/CharacterSheetStoryTab";
import "./CharacterSheetPage.css";

// A controlled number input keeps typed text like "025" on screen even though
// the stored value is 25. Rewrite the visible text once, sheet-wide, so a
// leading zero never sticks around.
function stripLeadingZeros(event) {
  const input = event.target;
  if (input.type === "number" && /^-?0+\d/.test(input.value)) {
    input.value = input.value.replace(/^(-?)0+(?=\d)/, "$1");
  }
}

const SHEET_TERMS = [
  ["Hit Points", "Your health. At 0 you fall unconscious."],
  ["Temp", "Temporary Hit Points. They absorb damage first and do not heal."],
  [
    "AC",
    "Armor Class. An attack must roll this or higher to hit you. Use the Temporary AC bonus box for effects like Haste.",
  ],
  [
    "Init",
    "Initiative bonus. Added to your d20 roll to decide who goes first.",
  ],
  ["Speed", "How far you can move on your turn, in feet."],
  ["Prof", "Proficiency bonus. Added to everything you are trained in."],
  ["Hit Dice", "Dice you can spend on a short rest to heal."],
  [
    "Save",
    "Saving throw bonus, used to resist spells and effects. Tap it to roll the save; tap the dot beside it to mark the save as proficient. Use the bonus box for flat extras.",
  ],
  [
    "P / E (skills)",
    "P: proficient, you add your proficiency bonus. E: expertise, you add it twice. Click the badge to step through them.",
  ],
  [
    "Inspiration",
    "A reward from your DM for great roleplay. You can only hold one at a time: switch it on when you get it, and off when you spend it for advantage.",
  ],
  [
    "Long / Short Rest",
    "A long rest restores HP and spell slots. A short rest lets you spend Hit Dice.",
  ],
];

function CharacterSheetPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [sheet, setSheet] = useState(null);
  const [loadedId, setLoadedId] = useState(null);
  const [showSkillBonuses, setShowSkillBonuses] = useState(false);
  // Below 1024px the skills list would sit under everything else, so a
  // Stats | Skills switch by the name flips the top of the sheet instead.
  const isCompact = useMediaQuery("(max-width: 1023px)");
  // Wide screens get a third column on the right for the portrait and the
  // quick controls, so the tabs fit on one line.
  const isWide = useMediaQuery("(min-width: 1300px)");
  // Phones keep them under the tabs, where they get a tidy grid of their own.
  const isPhone = useMediaQuery("(max-width: 600px)");
  const controlsPlace = isWide ? "side" : isPhone ? "tabbar" : "header";
  const [compactPanel, setCompactPanel] = useState("stats");
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [showShortRest, setShowShortRest] = useState(false);
  // The Help panel (what the boxes mean, and the dice) on screens with no side
  // panel to keep it in.
  const [showHelp, setShowHelp] = useState(false);
  // At a table, the Journal tab switches between the table's journal (with its
  // handouts) and the character's own private notes.
  const [journalView, setJournalView] = useState("table");
  const [restMessage, setRestMessage] = useState("");
  const [levelUpSummary, setLevelUpSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("actions");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  // Stats are locked until the player taps "Edit stats", so a stray tap can't
  // change AC or a score by accident. Current HP, temp HP, the temporary AC
  // box, conditions, Inspiration and Gold always stay editable.
  const [statsLocked, setStatsLocked] = useState(true);
  // The latest death save ("Rolled 14: a success"), and the CON save owed
  // after taking damage while concentrating ({ dc }). Neither is saved.
  const [deathSaveNote, setDeathSaveNote] = useState("");
  const [concentrationCheck, setConcentrationCheck] = useState(null);
  // True while a finished level-up looks up the new level's features.
  const [isAddingLevelFeatures, setIsAddingLevelFeatures] = useState(false);
  // Every SRD feature for this race and class: shared with the Features tab,
  // and used to spot choices still to make (Character setup).
  const [featureEntries, setFeatureEntries] = useState({ key: null, entries: [] });
  const [activeSlotLevels, setActiveSlotLevels] = useState(() => new Set());
  const [attackWith, setAttackWith] = useState(null);
  const tableCombat = useTableTurn(sheet?.id);
  // Click-to-roll: any bonus on the sheet rolls, and can be shared with the
  // character's table.
  const roller = useSheetRolls(sheet?.id, sheet?.name);

  // A Tireless roll (Deft Explorer) waiting for the player to choose whether
  // it becomes their temporary HP. Kept here, not read from the roll card,
  // because the card fades after a few seconds. Regular and max HP are never
  // touched.
  const [tempHpOffer, setTempHpOffer] = useState(null);
  // Only a new roll (a new id) can make a new offer.
  const [offerSeenRollId, setOfferSeenRollId] = useState(null);
  const lastRollForOffer = roller?.lastRoll;
  if (lastRollForOffer?.id && lastRollForOffer.id !== offerSeenRollId) {
    setOfferSeenRollId(lastRollForOffer.id);
    if (lastRollForOffer.kind === "damage" && lastRollForOffer.label === "Tireless temporary HP") {
      setTempHpOffer({ id: lastRollForOffer.id, total: lastRollForOffer.total });
    }
  }

  // Timed conditions ("Poisoned for 3 rounds") and a timed concentration spell
  // lose a round at the end of each of this character's own turns, and end at
  // 0. The sheet remembers how many of its turns it has counted (roundSeen),
  // so a reload never counts one twice. (Two tabs of the same sheet open at
  // once would each count it.)
  const [endedConditionsNote, setEndedConditionsNote] = useState("");
  const fightTableId = tableCombat?.table?.id ?? null;
  const fightTurns = tableCombat
    ? countMyTurnsEnded(
        tableCombat.combatants ?? [],
        tableCombat.table?.current_combatant_id,
        tableCombat.round,
        tableCombat.myCombatant?.id,
      )
    : null;
  const elapsedRounds = sheet ? turnsElapsed(sheet.roundSeen, fightTableId, fightTurns) : 0;
  // A concentration spell can be timed the same way ("Bless, 10 rounds").
  const hasTimers =
    Boolean(sheet?.conditions?.some((condition) => typeof condition.rounds === "number")) ||
    typeof sheet?.concentration?.rounds === "number" ||
    // A summon cast for 1 minute (no concentration) counts down too.
    (isSummonPresent(sheet) && typeof sheet.companionCreature.summon.rounds === "number");
  // Out of step with the fight: one of this character's turns ended, or it's a
  // new fight or a different table, which just resets the count.
  const roundOutOfStep =
    Boolean(fightTableId) &&
    fightTurns !== null &&
    (sheet?.roundSeen?.tableId !== fightTableId || sheet?.roundSeen?.turns !== fightTurns);
  useEffect(() => {
    if (!hasTimers || !roundOutOfStep) return undefined;
    // After this render, so the save doesn't happen mid-render.
    const timer = setTimeout(() => {
      const { conditions, ended } = tickConditionRounds(sheet.conditions ?? [], elapsedRounds);
      const names = ended.map((key) => conditionWord(key)?.name ?? key);

      let { concentration } = sheet;
      if (typeof concentration?.rounds === "number" && elapsedRounds > 0) {
        const left = concentration.rounds - elapsedRounds;
        if (left > 0) {
          concentration = { ...concentration, rounds: left };
        } else {
          names.push(concentration.spell);
          concentration = null;
          setConcentrationCheck(null);
        }
      }

      const summonTick = tickSummonRounds(sheet, elapsedRounds);
      if (summonTick.ended) names.push(getSummonTemplate(sheet.companionCreature).spell);

      persistSheet({
        ...summonTick.sheet,
        conditions,
        // (Only the 1-minute version ticks, and it never holds concentration.)
        concentration,
        roundSeen: { tableId: fightTableId, turns: fightTurns },
      });
      if (names.length > 0) {
        setEndedConditionsNote(
          `${names.join(" and ")} ${names.length === 1 ? "has" : "have"} ended (the rounds ran out).`,
        );
      }
    }, 0);
    return () => clearTimeout(timer);
    // Runs once per new round; the sheet itself is read fresh inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTimers, roundOutOfStep, elapsedRounds, fightTableId, fightTurns]);

  const entriesKey = sheet
    ? [sheet.class?.id, getFeatureSubclassId(sheet.class), sheet.race?.id, sheet.race?.subrace?.id].join("|")
    : null;
  useEffect(() => {
    if (!entriesKey || !sheet?.class?.id) return undefined;
    let ignore = false;
    loadFeatureEntries({
      classId: sheet.class.id,
      subclassId: getFeatureSubclassId(sheet.class),
      raceId: sheet.race?.id,
      subraceId: sheet.race?.subrace?.id,
    })
      .then((entries) => !ignore && setFeatureEntries({ key: entriesKey, entries }))
      .catch(() => {});
    return () => {
      ignore = true;
    };
    // Reload only when the race, class or subclass changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesKey]);
  const currentEntries = featureEntries.key === entriesKey ? featureEntries.entries : [];

  // SRD details for inventory items, by name, so armor and shields can be
  // equipped and the AC worked out (null: not SRD gear). Magic armor gets the
  // details of the armor it's made from, with its bonus added.
  const [gearDetails, setGearDetails] = useState({});
  // Inventory items, plus the weapon behind each attack ("Longbow" for a
  // "+1 Longbow" or a renamed one), so attack numbers can be checked too.
  const lookupItems = [
    ...(sheet?.equipment ?? []),
    ...(sheet?.attacks ?? []).map((attack) => ({
      name: splitMagicWeaponName(attack.baseWeapon || attack.name).baseName,
    })),
  ];
  const gearNames = lookupItems.map((item) => normalizeItemName(item.name)).join("|");
  // If the rules server can't be reached (the free plan's server can take up to
  // a minute to wake up), nothing is remembered for those items and the look-up
  // tries again after a pause, a few times, so armor isn't lost for good.
  const [gearAttempt, setGearAttempt] = useState(0);
  const gearFailures = useRef(0);
  useEffect(() => {
    const items = lookupItems.filter(
      (item, position) =>
        !(normalizeItemName(item.name) in gearDetails) &&
        lookupItems.findIndex((other) => normalizeItemName(other.name) === normalizeItemName(item.name)) ===
          position,
    );
    if (items.length === 0) return undefined;
    let ignore = false;
    let timer = null;
    let listFailed = false;
    getEquipment("2014")
      .catch(() => {
        listFailed = true;
        return [];
      })
      .then((list) =>
        listFailed
          ? []
          : Promise.all(
              items.map(async (item) => {
                const match = list.find(
                  (entry) => normalizeItemName(entry.name) === normalizeItemName(item.name),
                );
                // Magic armor ("Armor of Invulnerability", "+1 Chain Mail") isn't
                // in the plain list; look up the armor it's made from instead.
                const magicArmor = match ? null : magicArmorFor(item.name);
                const index = match?.index ?? magicArmor?.base ?? item.index;
                const details = index ? await getEquipmentDetails(index).catch(() => null) : null;
                return [normalizeItemName(item.name), withArmorBonus(details, magicArmor?.bonus)];
              }),
            ),
      )
      .then((pairs) => {
        if (ignore) return;
        if (listFailed) {
          gearFailures.current += 1;
          if (gearFailures.current <= RETRY_DELAYS.length) {
            timer = setTimeout(() => setGearAttempt((count) => count + 1), RETRY_DELAYS[gearFailures.current - 1]);
          }
          return;
        }
        gearFailures.current = 0;
        setGearDetails((known) => ({ ...known, ...Object.fromEntries(pairs) }));
      });
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
    // Look up only when the inventory's names change (or a retry is due).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gearNames, gearAttempt]);
  const gearDetailsFor = (item) => gearDetails[normalizeItemName(item.name)];

  // The player's homebrew, so a race, background or subclass picked as a
  // draft in creation can remind them to fill in its details.
  const [homebrewList, setHomebrewList] = useState([]);
  useEffect(() => {
    let ignore = false;
    loadHomebrew().then((entries) => !ignore && setHomebrewList(entries));
    return () => {
      ignore = true;
    };
  }, []);

  const setupTasks = getSetupTasks(sheet, currentEntries, homebrewList);

  const saveTimeoutRef = useRef(null);
  const pendingUpdateRef = useRef(null);

  const isLoading = loadedId !== id;

  useEffect(() => {
    let isCancelled = false;

    getCharacter(id).then((loaded) => {
      if (isCancelled) return;

      setSheet(loaded);
      setLoadedId(id);
      setIsLevelingUp(false);
      setLevelUpSummary(null);
      setActiveTab("actions");
      setActiveSlotLevels(
        new Set(
          getSpellSlots(loaded?.spellcasting)
            .filter((slot) => slot.max > 0)
            .map((slot) => slot.level),
        ),
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      clearTimeout(saveTimeoutRef.current);
      runPendingSave();
    };
  }, []);

  if (isLoading) {
    return (
      <main className="character-sheet character-sheet--empty">
        <h1 className="character-sheet__title">Loading character...</h1>
      </main>
    );
  }

  if (!sheet) {
    return (
      <main className="character-sheet character-sheet--empty">
        <h1 className="character-sheet__title">Character not found</h1>
        <Link className="character-sheet__back-link" to="/characters">
          Back to Characters
        </Link>
      </main>
    );
  }

  // The new level's class and subclass features, added for the player so
  // they don't have to go looking. The free server can take about 20 seconds
  // to wake up, so it waits up to 45 seconds (and tries once more if the first
  // look-up fails quickly) before saying so in the summary instead.
  // skippedFeatures: ones the player chose to leave off in the wizard (a
  // Favored Enemy their table replaces with Favored Foe).
  async function withNewLevelFeatures(updatedSheet, skippedFeatures = []) {
    const attempt = () =>
      loadFeatureEntries({
        classId: updatedSheet.class?.id,
        subclassId: getFeatureSubclassId(updatedSheet.class),
        raceId: updatedSheet.race?.id,
        subraceId: updatedSheet.race?.subrace?.id,
      }).then((entries) =>
        featuresForNewLevel(
          entries,
          updatedSheet.level,
          [...(updatedSheet.features ?? []).map((feature) => feature.name), ...skippedFeatures],
        ).filter((entry) => !isReplacedByOption(updatedSheet, entry.name)),
      );
    const lookup = attempt().catch(() => attempt());
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("slow")), 45000));
    // The subclass's bonus spells (from the player's homebrew), up to the new
    // level: any it gave at earlier levels that aren't on the sheet yet come
    // too, and ones already there are left as they are. The list is read
    // again, in case the subclass was made in this level-up.
    const latestHomebrew = await loadHomebrew().catch(() => homebrewList);
    const subclass = updatedSheet.class?.subclass;
    updatedSheet = addSubclassSpells(
      updatedSheet,
      getSubclassBonusSpells(subclass?.id, latestHomebrew),
      updatedSheet.level,
      subclass?.name ?? "your subclass",
    );
    try {
      const found = await Promise.race([lookup, timeout]);
      const added = found.map((entry) =>
        createFeat({
          name: entry.name,
          description: entry.description,
          source: sourceFromEntry(entry),
          choices: entry.choices ?? null,
        }),
      );
      return {
        sheet: { ...updatedSheet, features: [...(updatedSheet.features ?? []), ...added] },
        featuresFailed: false,
      };
    } catch {
      return { sheet: updatedSheet, featuresFailed: true };
    }
  }

  async function handleLevelUpComplete(leveledSheet, { skippedFeatures = [] } = {}) {
    setIsAddingLevelFeatures(true);
    const { sheet: withFeatures, featuresFailed } = await withNewLevelFeatures(
      leveledSheet,
      skippedFeatures,
    );
    // A new Dexterity or proficiency bonus changes the AC and attacks too.
    const updatedSheet = withCurrentNumbers(sheet, withFeatures);
    setIsAddingLevelFeatures(false);
    // Lists both the features picked in the wizard (a Fighting Style) and the
    // ones added for the new level.
    const baseSummary = buildLevelUpSummary(sheet, updatedSheet);
    const summary = {
      ...baseSummary,
      // With what was picked: "Favored Enemy (2 types): Fiends".
      addedFeatures: baseSummary.newFeatures.map((feature) => {
        const picks = describePicks(feature.choices ?? []);
        return picks ? `${feature.name}: ${picks}` : feature.name;
      }),
      featuresFailed,
    };
    setSheet(updatedSheet);
    setLevelUpSummary(summary);
    setIsLevelingUp(false);
    setActiveSlotLevels((prev) => {
      const next = new Set(prev);
      getSpellSlots(updatedSheet.spellcasting)
        .filter((slot) => slot.max > 0)
        .forEach((slot) => next.add(slot.level));
      return next;
    });

    saveCharacter(updatedSheet)
      .then((saved) => {
        setSheet((current) =>
          current?.id === saved.id
            ? { ...current, updatedAt: saved.updatedAt }
            : current,
        );
      })
      .catch((err) => console.error("Failed to save character:", err));
  }

  function runPendingSave() {
    const toSave = pendingUpdateRef.current;
    pendingUpdateRef.current = null;
    if (!toSave) return;

    saveCharacter(toSave)
      .then((saved) => {
        setSheet((current) =>
          current?.id === saved.id
            ? { ...current, updatedAt: saved.updatedAt }
            : current,
        );
      })
      .catch((err) => console.error("Failed to save character:", err));
  }

  // The numbers saved on the sheet that come from its scores and level: the
  // AC (when on auto) and auto-filled weapon attacks, worked out again.
  const weaponDetailsFor = (name) => gearDetails[normalizeItemName(name)] ?? null;
  function withCurrentNumbers(before, next) {
    // Initiative follows Dexterity too (see withAutoInitiative).
    return withAutoInitiative(
      before,
      withAutoArmorClass(refreshWeaponAttacks(before, next, weaponDetailsFor), gearDetailsFor),
    );
  }

  // Tasha's options this character could use now and hasn't looked at: a red
  // dot on the Features tab and the options line until they open it.
  const newOptionalFeatures = getNewOptionalFeatures(sheet);

  // Saved numbers that are out of date (often from before they followed
  // level-ups). Only changed when the player taps Update.
  const outOfDate = getOutOfDateNumbers(
    sheet,
    weaponDetailsFor,
    sheet.acMode === "auto" ? computeWornArmorClass(sheet, gearDetailsFor) : null,
  );
  const outOfDateCount =
    (outOfDate.armorClass ? 1 : 0) +
    (outOfDate.initiative ? 1 : 0) +
    outOfDate.freeCasts.length +
    outOfDate.attacks.length +
    outOfDate.speed.length;

  // Bonus spells the homebrew subclass gives that the sheet doesn't have yet
  // (a character who passed those levels before bonus spells existed), and
  // ones typed in by hand that still count toward spells known.
  const subclassName = sheet.class?.subclass?.name ?? "your subclass";
  const bonusSpells = getSubclassBonusSpells(sheet.class?.subclass?.id, homebrewList);
  const missingBonusSpells = subclassSpellsToGrant(sheet, bonusSpells);
  const handCountedBonusSpells = subclassSpellsCountedByHand(sheet, bonusSpells);
  // Spells on the sheet whose free cast (once per long rest, no slot) isn't
  // tracked yet, e.g. the subclass was edited to say so after they arrived.
  const missingFreeCasts = subclassFreeCastsToAdd(sheet, bonusSpells);
  const bonusSpellSource = (name) =>
    bonusSpells.find((spell) => spell.name.toLowerCase() === name.toLowerCase())?.source ||
    subclassName;

  function handleAddBonusSpells() {
    persistSheet(addSubclassSpells(sheet, bonusSpells, sheet.level ?? 1, subclassName));
  }

  // Each one is marked with where it comes from: its feature, or the subclass.
  function handleMarkBonusSpells() {
    persistSheet(
      handCountedBonusSpells.reduce(
        (next, spell) => markSpellsGrantedBy(next, [spell.index], bonusSpellSource(spell.name)),
        sheet,
      ),
    );
  }

  function handleUpdateNumbers() {
    const worked = new Map(outOfDate.attacks.map((item) => [item.index, item.worked]));
    const attacks = (sheet.attacks ?? []).map((attack) =>
      worked.has(attack.index) ? { ...attack, ...worked.get(attack.index) } : attack,
    );
    // persistSheet works the auto AC out again as it saves.
    const updated = applySpeedUpdates({ ...sheet, attacks }, outOfDate.speed);
    const withInitiative = outOfDate.initiative ? applyInitiativeUpdate(updated) : updated;
    persistSheet(outOfDate.freeCasts.length ? applyFreeCastsSplit(withInitiative) : withInitiative);
  }

  // "Keep mine": these numbers stay as typed and aren't offered again. The AC
  // goes to manual (the player can switch auto back on beside it).
  function handleKeepNumbers() {
    const keep = new Set(outOfDate.attacks.map((item) => item.index));
    const next = {
      ...sheet,
      attacks: (sheet.attacks ?? []).map((attack) =>
        keep.has(attack.index) ? { ...attack, manual: true } : attack,
      ),
      ...(outOfDate.armorClass ? { acMode: "manual" } : {}),
    };
    const kept = applySpeedUpdates(next, outOfDate.speed, { keep: true });
    const keptInitiative = outOfDate.initiative ? applyInitiativeUpdate(kept, { keep: true }) : kept;
    persistSheet(
      outOfDate.freeCasts.length ? applyFreeCastsSplit(keptInitiative, { keep: true }) : keptInitiative,
    );
  }

  function persistSheet(next) {
    // Back above 0 HP (healing, a rest, a typed number): the death save
    // marks are wiped, ready for the next time.
    const isUp = (next.combat?.hitPoints?.current ?? 0) > 0;
    const hasMarks = (next.deathSaves?.successes ?? 0) + (next.deathSaves?.failures ?? 0) > 0;
    if (isUp && hasMarks) {
      next = { ...next, deathSaves: { ...EMPTY_DEATH_SAVES } };
      setDeathSaveNote("");
    }

    // On auto AC, worn armor and Dexterity set the AC (see armorClass.js), and
    // auto-filled weapon attacks follow new scores (see refreshWeaponAttacks).
    // A summoned companion whose spell has ended (concentration broken, the
    // minute run out) is marked as gone, never left looking present.
    const updated = withSummonEnded(withCurrentNumbers(sheet, next));
    setSheet(updated);
    pendingUpdateRef.current = updated;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(runPendingSave, 600);
  }

  function handlePortraitUpload(url) {
    persistSheet({ ...sheet, portraitUrl: url });
  }

  // Race, class, background and spellcasting can all be retyped, so homebrew
  // or non-SRD options (an Artificer, a custom race) can match the paper sheet.
  function handleDetailChange(field, value) {
    if (field === "name") {
      persistSheet({ ...sheet, name: value });
    } else if (field === "race") {
      persistSheet({ ...sheet, race: { ...(sheet.race ?? {}), name: value } });
    } else if (field === "background") {
      persistSheet({
        ...sheet,
        background: { ...(sheet.background ?? {}), name: value },
      });
    } else if (field === "class") {
      persistSheet({
        ...sheet,
        class: { ...(sheet.class ?? {}), name: value },
      });
    } else if (field === "subclass") {
      const { subclass: currentSubclass, ...rest } = sheet.class ?? {};
      persistSheet({
        ...sheet,
        class: value
          ? {
              ...rest,
              subclass: {
                ...(currentSubclass ?? {}),
                name: value,
                // Remember what was picked, so a retyped subclass stops
                // offering the old one's features (getFeatureSubclassId).
                ...(currentSubclass?.id
                  ? { originalName: currentSubclass.originalName ?? currentSubclass.name }
                  : {}),
              },
            }
          : rest,
      });
    } else if (field === "spellcastingAbility") {
      const nextClass = { ...(sheet.class ?? {}) };
      delete nextClass.spellcastingAbility;
      if (value !== "default") {
        nextClass.spellcastingAbility = value === "none" ? "" : value;
      }
      persistSheet({ ...sheet, class: nextClass });
    }
  }

  function handleSaveToggle(ability) {
    persistSheet({
      ...sheet,
      savingThrows: {
        ...sheet.savingThrows,
        [ability]: !sheet.savingThrows?.[ability],
      },
    });
  }

  function handleLevelChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet({ ...sheet, level: numeric });
  }

  // Typing an AC means "I'll set it myself" (auto stops until switched back).
  function handleArmorClassChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet({
      ...sheet,
      acMode: sheet.acMode ? "manual" : sheet.acMode,
      combat: { ...sheet.combat, armorClass: numeric },
    });
  }

  function handleArmorClassAuto() {
    persistSheet({ ...sheet, acMode: "auto" });
  }

  // Putting armor on (or taking it off). The first time, AC goes on auto.
  function handleEquipToggle(id, currentlyEquipped) {
    persistSheet({
      ...sheet,
      acMode: sheet.acMode ?? "auto",
      equipment: updateEquipmentItem(sheet.equipment, id, { equipped: !currentlyEquipped }),
    });
  }

  // A typed Initiative keeps following Dexterity, with the difference kept
  // as a bonus (see setTypedInitiative).
  function handleInitiativeChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet(setTypedInitiative(sheet, numeric));
  }

  function handleSpeedChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet({ ...sheet, combat: { ...sheet.combat, speed: numeric } });
  }

  function handleSizeChange(value) {
    persistSheet({ ...sheet, size: value });
  }

  function handleLanguagesChange(value) {
    persistSheet({ ...sheet, languages: value });
  }

  // You either have inspiration or you don't, so it's an on/off switch.
  // Saved as 1 or 0, which older sheets (with a number box) also used.
  function handleInspirationToggle() {
    persistSheet({ ...sheet, inspiration: sheet.inspiration > 0 ? 0 : 1 });
  }

  // Prone, Poisoned, Exhaustion 2...
  function handleConditionsChange(conditions) {
    setEndedConditionsNote("");
    // Mid-fight, a new timer starts counting from this turn.
    const roundSeen = fightTableId && fightTurns !== null ? { tableId: fightTableId, turns: fightTurns } : sheet.roundSeen;
    persistSheet({ ...sheet, conditions, roundSeen });
  }

  function handleGoldChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet({ ...sheet, gold: numeric });
  }

  // Damage the DM posted for this character ("Kobold hits you for 5").
  // Temporary HP absorbs it first.
  function handleApplyIncomingDamage(amount) {
    const before = sheet.combat.hitPoints;
    const after = applyDamageToHitPoints(before, amount);

    persistSheet(
      withDamageEffects({ ...sheet, combat: { ...sheet.combat, hitPoints: after } }, before, after, {
        incoming: amount,
      }),
    );

    // Tell the player where it went, so "my HP didn't change" is never a mystery.
    const fromTemp = (before.temporary ?? 0) - (after.temporary ?? 0);
    const fromHp = before.current - after.current;
    const parts = [];
    if (fromTemp > 0) parts.push(`${fromTemp} from temporary HP`);
    if (fromHp > 0) parts.push(`${fromHp} from HP`);
    // Already at 0 HP, there's no HP left to lose, but the hit still counts.
    if (parts.length === 0 && before.current <= 0 && amount > 0) {
      return `Applied ${amount} damage. You were already at 0 HP, so that's a failed death save.`;
    }
    return `Applied ${amount} damage: ${parts.join(" and ") || "nothing left to lose"}.`;
  }

  // What taking damage does besides lowering HP: while concentrating, a CON
  // save is owed (DC 10 or half the damage). Damage applied from the DM is one
  // clear hit, so it also ends concentration at 0 HP and counts as a failed
  // death save when already at 0. A number typed in the HP box only gives the
  // reminder: clearing the box to retype it passes through 0 on the way.
  function withDamageEffects(next, before, after, { typed = false, incoming = 0 } = {}) {
    const lost = before.current + (before.temporary ?? 0) - (after.current + (after.temporary ?? 0));
    // A hit on someone already at 0 HP loses no HP (there's none left), but it
    // is still a hit, so it counts as a failed death save.
    const hitAtZero = !typed && before.current <= 0 && (lost > 0 || incoming > 0);
    if (lost <= 0 && !hitAtZero) return next;

    let result = next;
    if (sheet.concentration) {
      if (!typed && after.current <= 0) {
        result = { ...result, concentration: null };
        setConcentrationCheck(null);
      } else if (after.current > 0) {
        setConcentrationCheck((check) => ({ dc: Math.max(check?.dc ?? 0, getConcentrationDc(lost)) }));
      }
    }
    if (!typed && before.current <= 0) {
      const marks = { ...EMPTY_DEATH_SAVES, ...sheet.deathSaves };
      result = {
        ...result,
        deathSaves: { ...marks, failures: Math.min(3, marks.failures + 1) },
      };
      setDeathSaveNote("Taking damage at 0 HP counts as a failed death save.");
    }
    return result;
  }

  function handleHpChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    const before = sheet.combat.hitPoints;
    const after = setCurrentHp(before, numeric);
    const next = { ...sheet, combat: { ...sheet.combat, hitPoints: after } };
    // An empty box is someone mid-retype, not damage.
    persistSheet(value === "" ? next : withDamageEffects(next, before, after, { typed: true }));
  }

  // A death save: d20, no bonus. Shared with the table like any roll.
  function handleRollDeathSave() {
    // With real dice the roll finishes after the player types their number.
    roller.roll("Death save", 0, { onResult: applyDeathSaveRoll });
  }

  function applyDeathSaveRoll(result) {
    const { deathSaves, regainsHp } = applyDeathSave(sheet.deathSaves, result.natural);
    if (regainsHp) {
      setDeathSaveNote("Natural 20! You're back up with 1 HP.");
      persistSheet({
        ...sheet,
        deathSaves,
        combat: { ...sheet.combat, hitPoints: setCurrentHp(sheet.combat.hitPoints, 1) },
      });
      return;
    }
    setDeathSaveNote(
      result.natural === 1
        ? "Rolled a 1: that's two failures."
        : `Rolled ${result.natural}: ${result.natural >= 10 ? "a success" : "a failure"}.`,
    );
    persistSheet({ ...sheet, deathSaves });
  }

  function handleConcentrationStart(spell) {
    setConcentrationCheck(null);
    persistSheet({ ...sheet, concentration: { spell } });
  }

  // Sets the spell's rounds left (0 takes the timer off). Mid-fight, the
  // count starts from this round.
  function handleConcentrationRounds(rounds) {
    const next = { spell: sheet.concentration.spell };
    if (rounds > 0) next.rounds = rounds;
    const roundSeen = fightTableId && fightTurns !== null ? { tableId: fightTableId, turns: fightTurns } : sheet.roundSeen;
    persistSheet({ ...sheet, concentration: next, roundSeen });
  }

  function handleConcentrationEnd() {
    setConcentrationCheck(null);
    persistSheet({ ...sheet, concentration: null });
  }

  // The CON save after damage: a failure ends the spell.
  function handleConcentrationCheck(conSave) {
    const dc = concentrationCheck.dc;
    roller.roll(`Concentration (CON save, DC ${dc})`, conSave, {
      onResult: (result) => {
        setConcentrationCheck(null);
        if (result.total < dc) persistSheet({ ...sheet, concentration: null });
      },
    });
  }

  function handleMaxHpChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    persistSheet({
      ...sheet,
      combat: {
        ...sheet.combat,
        hitPoints: { ...sheet.combat.hitPoints, max: numeric },
      },
    });
  }

  // Temporary HP doesn't stack (2014 rules): the player picks the new
  // amount or keeps what they have.
  function handleUseTempHpOffer() {
    persistSheet({
      ...sheet,
      combat: {
        ...sheet.combat,
        hitPoints: setTemporaryHp(sheet.combat.hitPoints, tempHpOffer.total),
      },
    });
    setTempHpOffer(null);
  }

  function handleTempHpChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    persistSheet({
      ...sheet,
      combat: {
        ...sheet.combat,
        hitPoints: setTemporaryHp(sheet.combat.hitPoints, numeric),
      },
    });
  }

  function handleHitDiceChange(field, value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    persistSheet({
      ...sheet,
      combat: {
        ...sheet.combat,
        hitDice: {
          ...sheet.combat.hitDice,
          // What's left can't go below 0 or above the total.
          [field]:
            field === "remaining"
              ? Math.max(0, Math.min(numeric, Number(sheet.combat.hitDice.total) || 0))
              : numeric,
        },
      },
    });
  }

  function handleAbilityScoreChange(ability, value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    persistSheet({
      ...sheet,
      abilityScores: { ...sheet.abilityScores, [ability]: numeric },
    });
  }

  function handleNotesChange(value) {
    persistSheet({ ...sheet, notes: value });
  }

  // "+ Add a companion" on the Actions tab. A companion added before keeps
  // everything it had; a freeform companion's old text comes along as notes.
  function handleCompanionAdd() {
    persistSheet({
      ...sheet,
      companionMode: "creature",
      companionCreature: sheet.companionCreature ?? createCompanionCreature(),
    });
  }

  function handleCompanionCreatureChange(field, value) {
    const numeric = field === "name" ? value : Number(value);
    if (field !== "name" && Number.isNaN(numeric)) return;

    persistSheet({
      ...sheet,
      companionCreature: { ...sheet.companionCreature, [field]: numeric },
    });
  }

  function handleCompanionCreatureHpChange(field, value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    persistSheet({
      ...sheet,
      companionCreature: {
        ...sheet.companionCreature,
        hitPoints: { ...sheet.companionCreature.hitPoints, [field]: numeric },
      },
    });
  }

  // One of the companion's six ability scores, typed on the Story tab.
  function handleCompanionAbilityChange(ability, value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    persistSheet({
      ...sheet,
      companionCreature: {
        ...sheet.companionCreature,
        abilityScores: {
          ...createCompanionAbilityScores(sheet.companionCreature.abilityScores),
          [ability]: numeric,
        },
      },
    });
  }

  // A companion's saving throw bonus, typed while editing its stats. An empty
  // box goes back to the plain ability modifier.
  function handleCompanionSaveChange(ability, value) {
    const savingThrows = { ...sheet.companionCreature.savingThrows };
    if (value === "") {
      delete savingThrows[ability];
    } else {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) return;
      savingThrows[ability] = numeric;
    }

    persistSheet({
      ...sheet,
      companionCreature: { ...sheet.companionCreature, savingThrows },
    });
  }

  function handleCompanionPortraitUpload(url) {
    persistSheet({
      ...sheet,
      companionCreature: { ...sheet.companionCreature, portraitUrl: url },
    });
  }

  // The companion's attacks (Bite, Talons), rolled from the Actions tab.
  function setCompanionAttacks(change) {
    const creature = sheet.companionCreature ?? createCompanionCreature();
    persistSheet({
      ...sheet,
      companionCreature: { ...creature, attacks: change(creature.attacks ?? []) },
    });
  }

  const cleanCompanionAttack = (values) => ({
    name: values.name.trim(),
    toHit: Number(values.toHit) || 0,
    damage: (values.damage ?? "").trim(),
    damageType: (values.damageType ?? "").trim(),
    notes: (values.notes ?? "").trim(),
  });

  function handleCompanionAttackAdd(values) {
    setCompanionAttacks((attacks) => [
      ...attacks,
      { id: crypto.randomUUID(), ...cleanCompanionAttack(values) },
    ]);
  }

  function handleCompanionAttackUpdate(id, values) {
    setCompanionAttacks((attacks) =>
      attacks.map((attack) => (attack.id === id ? { ...attack, ...cleanCompanionAttack(values) } : attack)),
    );
  }

  function handleCompanionAttackRemove(id) {
    setCompanionAttacks((attacks) => attacks.filter((attack) => attack.id !== id));
  }

  // The companion's bulleted notes. Saving the list replaces the old
  // single block of text, which has already been turned into bullets.
  function handleCompanionNotesChange(noteList) {
    persistSheet({
      ...sheet,
      companion: "",
      companionCreature: { ...sheet.companionCreature, notes: "", noteList },
    });
  }

  function handleBackstoryChange(value) {
    persistSheet({ ...sheet, backstory: value });
  }

  function handleToggleBackstoryVisibility() {
    persistSheet({ ...sheet, showBackstory: sheet.showBackstory === false });
  }

  function handleAppearanceChange(value) {
    persistSheet({ ...sheet, appearance: value });
  }

  function handleResourceCurrentChange(id, value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    persistSheet({
      ...sheet,
      resources: setResourceCurrent(sheet.resources ?? [], id, numeric),
    });
  }

  function handleEquipmentAdd(values) {
    const item = createEquipmentItem({
      name: values.name.trim(),
      quantity: Number(values.quantity) || 1,
      description: values.description.trim(),
      category: values.category,
    });
    persistSheet({ ...sheet, equipment: [...(sheet.equipment ?? []), item] });
  }

  function handleEquipmentUpdate(id, values) {
    persistSheet({
      ...sheet,
      equipment: updateEquipmentItem(sheet.equipment, id, {
        name: values.name.trim(),
        quantity: Number(values.quantity) || 1,
        description: values.description.trim(),
        // "Guess for me" clears a picked category.
        category: values.category || undefined,
      }),
    });
  }

  function handleEquipmentRemove(id) {
    persistSheet({
      ...sheet,
      equipment: removeEquipmentItem(sheet.equipment, id),
    });
  }

  function handleEquipmentAttuneToggle(id, currentlyAttuned) {
    if (!currentlyAttuned && getAttunedCount(sheet.equipment) >= 3) {
      window.alert("You can only attune to 3 items at a time.");
      return;
    }
    persistSheet({
      ...sheet,
      equipment: updateEquipmentItem(sheet.equipment, id, {
        attuned: !currentlyAttuned,
      }),
    });
  }

  function handleEquipmentProficientToggle(id, currentlyProficient) {
    persistSheet({
      ...sheet,
      equipment: updateEquipmentItem(sheet.equipment, id, {
        proficient: !currentlyProficient,
      }),
    });
  }

  function handleSkillCycle(skillIndex) {
    persistSheet({
      ...sheet,
      ...cycleSkillProficiency(sheet.skills, sheet.skillExpertise, skillIndex),
    });
  }

  function handleSkillBonusChange(skillIndex, value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet({
      ...sheet,
      skillBonuses: { ...(sheet.skillBonuses ?? {}), [skillIndex]: numeric },
    });
  }

  function handleAcBonusChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet({ ...sheet, acBonus: numeric });
  }

  function handleSaveBonusChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet({ ...sheet, saveBonus: numeric });
  }

  function handleResourceAdd(values) {
    const resource = createResource({
      name: values.name.trim(),
      max: Number(values.max),
      resetOn: values.resetOn,
      notes: values.notes.trim(),
    });
    persistSheet({
      ...sheet,
      resources: [...(sheet.resources ?? []), resource],
    });
  }

  function handleResourceUpdate(id, values) {
    persistSheet({
      ...sheet,
      resources: updateResource(sheet.resources, id, {
        name: values.name.trim(),
        max: Number(values.max),
        resetOn: values.resetOn,
        notes: values.notes.trim(),
      }),
    });
  }

  function handleResourceRemove(id) {
    persistSheet({ ...sheet, resources: removeResource(sheet.resources, id) });
  }

  function handleFeatAdd(values) {
    const feat = createFeat({
      name: values.name.trim(),
      description: values.description.trim(),
    });
    persistSheet({ ...sheet, feats: [...(sheet.feats ?? []), feat] });
  }

  function handleFeatUpdate(id, values) {
    persistSheet({
      ...sheet,
      feats: updateFeat(sheet.feats, id, {
        name: values.name.trim(),
        description: values.description.trim(),
      }),
    });
  }

  function handleFeatRemove(id) {
    persistSheet({ ...sheet, feats: removeFeat(sheet.feats, id) });
  }

  function handleFeatureAdd(values) {
    const feature = createFeat({
      name: values.name.trim(),
      description: values.description.trim(),
    });
    persistSheet({ ...sheet, features: [...(sheet.features ?? []), feature] });
  }

  function handleFeaturesAddMany(list) {
    const added = list.map((feature) =>
      createFeat({
        name: feature.name,
        description: feature.description,
        source: feature.source ?? null,
        choices: feature.choices ?? null,
      }),
    );
    persistSheet({ ...sheet, features: [...(sheet.features ?? []), ...added] });
  }

  // A pick for a feature's choice (Favored Enemy: Undead).
  function handleFeatureChoose(id, choices) {
    // A pick that grants Expertise (Canny) doubles that skill, with the
    // feature saved as where it came from.
    const withExpertise = applyExpertiseChoices(sheet, id, choices);
    persistSheet({ ...withExpertise, features: updateFeat(sheet.features, id, { choices }) });
  }

  // Switching one of Tasha's optional class features on or off, after the
  // player sees what comes off and what goes on.
  function handleOptionalFeatureSwitch(key, turnOn) {
    const option = getOptionalClassFeatures(sheet.class).find((item) => item.key === key);
    const { remove, add } = describeOptionSwitch(sheet, key, turnOn);
    const lines = [
      turnOn ? `Use ${option.name} instead of ${option.replaces}?` : `Stop using ${option.name}?`,
      remove.length ? `Comes off: ${remove.join(", ")}` : "",
      add.length ? `Goes on: ${add.join(", ")}` : "",
      turnOn
        ? ""
        : `To get ${option.replaces} back, use "Add from my class and race" on the Features tab.`,
    ].filter(Boolean);
    if (!window.confirm(lines.join("\n\n"))) return;
    persistSheet(switchOptionalFeature(sheet, key, turnOn));
  }

  // Removing features that belong to another subclass (the player confirms
  // which ones first, on the Features tab).
  function handleFeaturesRemoveMany(ids) {
    const removing = new Set(ids);
    persistSheet({
      ...sheet,
      features: (sheet.features ?? []).filter((feature) => !removing.has(feature.index)),
    });
  }

  function handleFeatureUpdate(id, values) {
    persistSheet({
      ...sheet,
      features: updateFeat(sheet.features, id, {
        name: values.name.trim(),
        description: values.description.trim(),
      }),
    });
  }

  function handleFeatureRemove(id) {
    persistSheet({ ...sheet, features: removeFeat(sheet.features, id) });
  }

  function handleProficiencyAdd(values) {
    const proficiency = createFeat({
      name: values.name.trim(),
      description: values.description.trim(),
    });
    persistSheet({
      ...sheet,
      proficiencies: [...(sheet.proficiencies ?? []), proficiency],
    });
  }

  function handleProficiencyUpdate(id, values) {
    persistSheet({
      ...sheet,
      proficiencies: updateFeat(sheet.proficiencies, id, {
        name: values.name.trim(),
        description: values.description.trim(),
      }),
    });
  }

  function handleProficiencyRemove(id) {
    persistSheet({
      ...sheet,
      proficiencies: removeFeat(sheet.proficiencies, id),
    });
  }

  function findSpellListKey(id) {
    return (sheet.spellcasting?.cantripsKnown ?? []).some(
      (spell) => spell.index === id,
    )
      ? "cantripsKnown"
      : "spellsKnown";
  }

  function handleSpellAdd(values) {
    const spellcasting = addManualSpell(sheet, {
      name: values.name.trim(),
      level: values.level,
      notes: values.notes.trim(),
      components: values.components.trim(),
      bonusSpell: Boolean(values.bonusSpell),
      link: values.link?.trim() ?? "",
      facts: spellFactsFromForm(values),
    });
    persistSheet({ ...sheet, spellcasting });
  }

  function handleSpellUpdate(id, values) {
    const spellcasting = updateSpell(
      sheet.spellcasting,
      findSpellListKey(id),
      id,
      {
        name: values.name.trim(),
        level: Number(values.level),
        notes: values.notes.trim(),
        components: values.components.trim(),
        bonusSpell: Boolean(values.bonusSpell),
        link: values.link?.trim() ?? "",
        ...spellFactsFromForm(values, { keepBlank: true }),
      },
    );
    persistSheet({ ...sheet, spellcasting });
  }

  // "Fill in from the SRD": only spells missing components or details
  // (school, casting time, duration...) get them; typed ones are kept.
  async function handleFillComponents(findSrdIndex) {
    const spellcasting = await fillMissingComponents(sheet.spellcasting, findSrdIndex);
    if (spellcasting !== sheet.spellcasting) persistSheet({ ...sheet, spellcasting });
  }

  function handleSpellRemove(id) {
    const spellcasting = removeSpell(
      sheet.spellcasting,
      findSpellListKey(id),
      id,
    );
    persistSheet({ ...sheet, spellcasting });
  }

  function handleSpellLockToggle(spell) {
    const spellcasting = updateSpell(
      sheet.spellcasting,
      findSpellListKey(spell.index),
      spell.index,
      { locked: !spell.locked },
    );
    persistSheet({ ...sheet, spellcasting });
  }

  function handleLongRest() {
    const rested = applyRest(sheet, "long");
    // A summoned companion isn't healed by the rest: its spell ends instead.
    const isSummon = Boolean(getSummonTemplate(sheet.companionCreature));
    const companionName =
      sheet.companionMode === "creature" && sheet.companionCreature && !isSummon
        ? sheet.companionCreature.name || "your companion"
        : null;
    const summonEnded = isSummonPresent(sheet)
      ? ` ${sheet.companionCreature.name || "Your summon"} is gone (${getSummonTemplate(sheet.companionCreature).spell} ended).`
      : "";
    const regained =
      getHitDiceRemaining(rested.combat.hitDice) -
      getHitDiceRemaining(sheet.combat.hitDice);
    persistSheet(rested);
    setShowShortRest(false);
    setRestMessage(
      `Long rest done. HP is back to full${companionName ? ` (${companionName}'s too)` : ""}${
        regained > 0
          ? `, you got ${regained} Hit ${regained === 1 ? "Die" : "Dice"} back,`
          : ""
      } and spell slots and abilities are refilled.${summonEnded}`,
    );
  }

  function handleShortRest(rolls) {
    const { sheet: rested, summary } = takeShortRest(sheet, rolls);
    persistSheet(rested);
    setShowShortRest(false);
    // Tireless (Deft Explorer) takes a level of exhaustion off a short rest.
    const exhaustionNote = summary.exhaustion
      ? ` Tireless: exhaustion ${summary.exhaustion.from} → ${summary.exhaustion.to}.`
      : "";
    // A short rest (an hour or more) outlasts a summon too.
    const summonNote = isSummonPresent(sheet)
      ? ` ${sheet.companionCreature.name || "Your summon"} is gone (${getSummonTemplate(sheet.companionCreature).spell} ended).`
      : "";
    setRestMessage(
      (summary.rolls.length > 0
        ? `Short rest done. Rolled ${summary.rolls.join(" + ")} (${formatModifier(
            summary.con,
          )} CON each) and healed ${summary.healed} HP: ${summary.hpBefore} → ${
            summary.hpAfter
          }. ${summary.hitDiceLeft} Hit ${
            summary.hitDiceLeft === 1 ? "Die" : "Dice"
          } left. Short-rest abilities are refilled.`
        : "Short rest done. Short-rest abilities are refilled.") +
        exhaustionNote +
        summonNote,
    );
  }

  function handleAttackAdd(values) {
    const attack = createAttack({
      name: values.name.trim(),
      toHit: values.toHit,
      damage: values.damage.trim(),
      damageType: values.damageType.trim(),
      notes: values.notes.trim(),
      baseWeapon: (values.baseWeapon ?? "").trim(),
    });
    persistSheet({ ...sheet, attacks: [...(sheet.attacks ?? []), attack] });
  }

  function handleAttackUpdate(id, values) {
    persistSheet({
      ...sheet,
      attacks: updateAttack(sheet.attacks, id, {
        name: values.name.trim(),
        toHit: Number(values.toHit) || 0,
        damage: values.damage.trim(),
        damageType: values.damageType.trim(),
        notes: values.notes.trim(),
        baseWeapon: (values.baseWeapon ?? "").trim(),
      }),
    });
  }

  function handleAttackRemove(id) {
    persistSheet({ ...sheet, attacks: removeAttack(sheet.attacks, id) });
  }

  function handleSpellSlotChange(level, field, value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    persistSheet({
      ...sheet,
      spellcasting: setSpellSlot(sheet.spellcasting, level, field, numeric),
    });
  }

  function handleShowSlotLevel(level) {
    setActiveSlotLevels((prev) => new Set(prev).add(level));
  }

  function handleHideSlotLevel(level) {
    setActiveSlotLevels((prev) => {
      const next = new Set(prev);
      next.delete(level);
      return next;
    });
  }

  const proficiencyBonus = getProficiencyBonus(sheet.level);
  // The Constitution save, for keeping concentration after damage.
  const conSave = getSaveModifier(
    sheet.abilityScores.constitution,
    sheet.savingThrows?.constitution,
    proficiencyBonus,
    sheet.saveBonus ?? 0,
  );
  const { combat } = sheet;
  const spellcastingAbility =
    sheet.class?.spellcastingAbility ?? getSpellcastingAbility(sheet.class ?? null);
  const hasSpellcasting =
    Boolean(spellcastingAbility) ||
    (sheet.spellcasting?.cantripsKnown?.length ?? 0) > 0 ||
    (sheet.spellcasting?.spellsKnown?.length ?? 0) > 0 ||
    getSpellSlots(sheet.spellcasting).some((slot) => slot.max > 0);

  // Shown in the left rail on wide screens, or at the top of the sheet when
  // the Stats | Skills switch is on Skills.
  const skillsPanel = (
    <section className="character-sheet__section character-sheet__skills">
      <div className="character-sheet__section-header-row">
        {/* Proficiency bonus sits by the title: it's what P adds to a skill. */}
        <div className="character-sheet__skills-heading">
          <h2 className="character-sheet__section-title">Skills</h2>
          <span
            className="character-sheet__prof"
            title="Proficiency bonus: added to everything you are trained in. It grows as you level."
          >
            Prof <strong>+{proficiencyBonus}</strong>
          </span>
        </div>
        <button
          type="button"
          className="character-sheet__resource-remove"
          aria-pressed={showSkillBonuses}
          title="Show boxes to add flat bonuses to individual skills"
          onClick={() => setShowSkillBonuses((shown) => !shown)}
        >
          {showSkillBonuses ? "Done" : "Bonuses"}
        </button>
      </div>
      <ul className="character-sheet__skills-list">
        {SKILLS.map((skill) => {
          const isProficient = Boolean(sheet.skills?.[skill.index]);
          const hasExpertise =
            isProficient && Boolean(sheet.skillExpertise?.[skill.index]);
          const bonus = sheet.skillBonuses?.[skill.index] ?? 0;
          const modifier = getSkillModifier(
            sheet.abilityScores[skill.ability],
            isProficient,
            proficiencyBonus,
            { expertise: hasExpertise, bonus },
          );

          return (
            <li
              className={`character-sheet__skill-row${
                isProficient ? " character-sheet__skill-row--proficient" : ""
              }`}
              key={skill.index}
            >
              <span className="character-sheet__skill-name">{skill.name}</span>
              <span className="character-sheet__skill-ability">
                {ABILITY_ABBREVIATIONS[skill.ability]}
              </span>
              <button
                type="button"
                className="character-sheet__skill-prof-badge"
                aria-pressed={isProficient}
                aria-label={`${skill.name} proficiency`}
                title={
                  hasExpertise
                    ? "Expertise (double proficiency) - click to remove"
                    : isProficient
                      ? "Proficient - click for expertise"
                      : "Not proficient - click to add"
                }
                onClick={() => handleSkillCycle(skill.index)}
              >
                {hasExpertise ? "E" : isProficient ? "P" : ""}
              </button>
              {showSkillBonuses && (
                <input
                  type="number"
                  className="character-sheet__skill-bonus-input"
                  value={bonus}
                  aria-label={`${skill.name} bonus`}
                  onChange={(e) =>
                    handleSkillBonusChange(skill.index, e.target.value)
                  }
                />
              )}
              <RollButton
                label={skill.name}
                bonus={modifier}
                className="character-sheet__skill-modifier"
              >
                {formatModifier(modifier)}
              </RollButton>
            </li>
          );
        })}
      </ul>
    </section>
  );

  // Below 1024px the skills share the top card: this pill flips between
  // the stats and the skills. One button: a tap anywhere on the pill flips
  // it, and the thumb slides to the side that's showing.
  const panelSwitch = (
    <button
      type="button"
      role="switch"
      aria-checked={compactPanel === "skills"}
      aria-label="Show skills"
      className={`character-sheet__panel-switch${
        compactPanel === "skills"
          ? " character-sheet__panel-switch--skills"
          : ""
      }`}
      onClick={() =>
        setCompactPanel((panel) =>
          panel === "skills" ? "stats" : "skills",
        )
      }
    >
      <span
        className="character-sheet__panel-switch-thumb"
        aria-hidden="true"
      />
      <span
        className="character-sheet__panel-switch-label character-sheet__panel-switch-label--stats"
        aria-hidden="true"
      >
        Stats
      </span>
      <span
        className="character-sheet__panel-switch-label character-sheet__panel-switch-label--skills"
        aria-hidden="true"
      >
        Skills
      </span>
    </button>
  );

  // What the boxes at the top mean. On wide screens it is a collapsed item in
  // the side panel; on smaller ones it is in the Help panel under the tabs.
  const glossaryBody = (
    <>
      <p className="character-sheet__glossary-tip">
        Tip: tap any bonus to roll it. The dot beside a Save marks that saving throw as proficient. Use All
        saves for extras like a Paladin&apos;s Aura of Protection, and the small box beside AC for a temporary
        bonus like Haste.
      </p>
      <dl>
        {SHEET_TERMS.map(([term, meaning]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
    </>
  );

  // Inspiration, Gold, Level Up and the rests. Where they sit depends on the
  // screen: a side panel on wide screens, the top card on laptops and
  // tablets, and under the tabs on phones (see controlsPlace).
  const quickControls = (
    <div className="character-sheet__actions">
      {/* Inspiration and Gold, then Level Up and the rests. */}
      <div className="character-sheet__keepsakes">
        <button
          type="button"
          role="switch"
          aria-checked={sheet.inspiration > 0}
          className="character-sheet__inspiration"
          title="You can hold one inspiration at a time. Switch it off when you spend it."
          onClick={handleInspirationToggle}
        >
          <span className="character-sheet__vital-label">
            Inspiration
          </span>
          <span
            className="character-sheet__toggle"
            aria-hidden="true"
          />
        </button>
        <label className="character-sheet__gold">
          <span className="character-sheet__vital-label">
            Gold
          </span>
          <input
            type="number"
            className="character-sheet__vital-input character-sheet__vital-input--wide"
            value={sheet.gold ?? 0}
            onChange={(e) => handleGoldChange(e.target.value)}
            min={0}
          />
        </label>
      </div>
      <Button onClick={() => setIsLevelingUp(true)}>
        Level Up
      </Button>
      <Button variant="secondary" onClick={handleLongRest}>
        Long Rest
      </Button>
      <Button
        variant="secondary"
        aria-expanded={showShortRest}
        onClick={() => {
          setRestMessage("");
          setShowShortRest((open) => !open);
        }}
      >
        Short Rest
      </Button>
    </div>
  );

  // Where this character plays: a link to their game, or a way to join one.
  const tableLink = (
    <p className="character-sheet__table-link">
      {roller.tableId ? (
        <>
          <span className="character-sheet__table-line">
            Playing at <strong>{roller.tableName}</strong>
          </span>
          <span className="character-sheet__table-sep"> · </span>
          <Link className="character-sheet__table-line character-sheet__tap-link" to={`/games/${roller.tableId}`}>
            Open the game page
          </Link>
        </>
      ) : (
        <>
          <span className="character-sheet__table-line">Not at a table yet</span>
          <span className="character-sheet__table-sep"> · </span>
          <Link className="character-sheet__table-line character-sheet__tap-link" to={`/games?character=${sheet.id}`}>
            Join a table
          </Link>
        </>
      )}
    </p>
  );

  const sheetPage = (
    <main className="character-sheet" onChange={stripLeadingZeros}>
      <TurnBanner
        combat={tableCombat}
        onApplyDamage={handleApplyIncomingDamage}
      />

      <div className="character-sheet__content">
        {controlsPlace !== "side" && tableLink}

        {isLevelingUp && (
          <LevelUpWizard
            sheet={sheet}
            onComplete={handleLevelUpComplete}
            setupTasks={setupTasks}
            onCancel={() => setIsLevelingUp(false)}
            isFinishing={isAddingLevelFeatures}
          />
        )}

        {!isLevelingUp && levelUpSummary && (
          <div className="character-sheet__level-up-summary">
            <h2 className="character-sheet__section-title">
              Level {levelUpSummary.toLevel}!
            </h2>

            <ul className="character-sheet__level-up-summary-list">
              <li>
                Hit Points: +{levelUpSummary.hpGained} (now{" "}
                {sheet.combat.hitPoints.max})
              </li>

              {levelUpSummary.toProficiency !==
                levelUpSummary.fromProficiency && (
                <li>
                  Proficiency Bonus: +{levelUpSummary.fromProficiency} &rarr; +
                  {levelUpSummary.toProficiency}
                </li>
              )}

              {levelUpSummary.abilityChanges.map(({ ability, from, to }) => (
                <li key={ability}>
                  {ABILITY_ABBREVIATIONS[ability]}: {from} &rarr; {to}
                </li>
              ))}

              {levelUpSummary.newFeat && (
                <li>New Feat: {levelUpSummary.newFeat.name}</li>
              )}

              {levelUpSummary.newSubclass && (
                <li>New Subclass: {levelUpSummary.newSubclass.name}</li>
              )}

              {levelUpSummary.newSpells?.length > 0 && (
                <li>
                  New {levelUpSummary.newSpells.length === 1 ? "Spell" : "Spells"}:{" "}
                  {levelUpSummary.newSpells.map((spell) => spell.name).join(", ")}
                </li>
              )}

              {levelUpSummary.removedSpells?.length > 0 && (
                <li>
                  Swapped Out: {levelUpSummary.removedSpells.map((spell) => spell.name).join(", ")}
                </li>
              )}

              {levelUpSummary.newExpertise?.length > 0 && (
                <li>Expertise: {levelUpSummary.newExpertise.join(", ")}</li>
              )}

              {levelUpSummary.addedFeatures?.length > 0 && (
                <li>New features added: {levelUpSummary.addedFeatures.join(", ")}</li>
              )}

              {levelUpSummary.featuresFailed && (
                <li>
                  Couldn&rsquo;t look up this level&rsquo;s features right now. On the Features tab, tap
                  &ldquo;Add from my class and race&rdquo; to add them.
                </li>
              )}
            </ul>

            <Button onClick={() => setLevelUpSummary(null)}>Continue</Button>
          </div>
        )}

        {!isLevelingUp && !levelUpSummary && (
          <>
            <div className="character-sheet__shell">
              {!isCompact && (
                <aside className="character-sheet__rail">{skillsPanel}</aside>
              )}

              <div className="character-sheet__body">
                <section
                  className={`character-sheet__vitals${
                    statsLocked ? " character-sheet__vitals--locked" : ""
                  }${
                    isCompact && compactPanel === "skills"
                      ? " character-sheet__vitals--skills"
                      : ""
                  }`}
                >
                  <div className="character-sheet__identity">
                    {isCompact && controlsPlace !== "header" && panelSwitch}
                    {/* No side panel on smaller screens: a small portrait here instead. */}
                    {controlsPlace !== "side" && (
                      <PortraitUpload
                        userId={user.id}
                        characterId={sheet.id}
                        name={sheet.name}
                        portraitUrl={sheet.portraitUrl}
                        onUpload={handlePortraitUpload}
                        size="tiny"
                      />
                    )}
                    <h1 className="character-sheet__title">{sheet.name}</h1>
                    <p className="character-sheet__subtitle">
                      Level {sheet.level} {sheet.race?.name ?? "No race"}{" "}
                      {sheet.class?.name ?? "No class"}
                      {sheet.class?.subclass?.name
                        ? ` (${sheet.class.subclass.name})`
                        : ""}{" "}
                      · {sheet.background?.name ?? "No background"}{" "}
                      <button
                        type="button"
                        className="character-sheet__edit-details"
                        onClick={() => setIsEditingDetails(true)}
                      >
                        ✏️ Edit details
                      </button>
                    </p>
                  </div>

                  <div className="character-sheet__vital character-sheet__vital--hp">
                    <span className="character-sheet__vital-label">
                      Hit Points
                      {combat.hitPoints.temporary > 0 && (
                        <span className="character-sheet__vital-total">
                          {" "}
                          +{combat.hitPoints.temporary} ={" "}
                          {combat.hitPoints.current +
                            combat.hitPoints.temporary}
                        </span>
                      )}
                    </span>
                    <span className="character-sheet__vital-value">
                      <input
                        type="number"
                        className="character-sheet__vital-input character-sheet__vital-input--hp"
                        value={combat.hitPoints.current}
                        aria-label="Current HP"
                        onChange={(e) => handleHpChange(e.target.value)}
                        min={0}
                        max={combat.hitPoints.max}
                      />
                      {"/"}
                      <input
                        type="number"
                        className="character-sheet__vital-input character-sheet__vital-input--hp"
                        value={combat.hitPoints.max}
                        aria-label="Max HP"
                        readOnly={statsLocked}
                        onChange={(e) => handleMaxHpChange(e.target.value)}
                        min={0}
                      />
                    </span>
                  </div>

                  <label className="character-sheet__vital">
                    <span
                      className="character-sheet__vital-label"
                      title="Temporary Hit Points: a buffer that soaks up damage first and does not heal."
                    >
                      Temp
                    </span>
                    <input
                      type="number"
                      className="character-sheet__vital-input"
                      value={combat.hitPoints.temporary ?? 0}
                      aria-label="Temporary HP"
                      onChange={(e) => handleTempHpChange(e.target.value)}
                      min={0}
                    />
                  </label>

                  {/* AC, plus a small box for a temporary bonus (Haste, Shield of
                      Faith). When the bonus isn't 0 the label shows the total. */}
                  <div className="character-sheet__vital character-sheet__vital--ac">
                    <span
                      className="character-sheet__vital-label"
                      title="Armor Class: an attack has to roll this number or higher to hit you. The small box is a temporary bonus."
                    >
                      AC
                      {sheet.acMode === "auto" ? (
                        <span
                          className="character-sheet__ac-mode"
                          title="Worked out from your equipped armor and Dexterity. Type a number to set it yourself."
                        >
                          {" "}auto
                        </span>
                      ) : (
                        (sheet.equipment ?? []).some((item) => isArmorDetails(gearDetailsFor(item))) && (
                          <button
                            type="button"
                            className="character-sheet__ac-mode character-sheet__ac-mode--button"
                            title="Work AC out from your equipped armor again"
                            onClick={handleArmorClassAuto}
                          >
                            {" "}↺ auto
                          </button>
                        )
                      )}
                      {(sheet.acBonus ?? 0) !== 0 && (
                        <span className="character-sheet__vital-total">
                          {" "}= {getEffectiveArmorClass(sheet)}
                        </span>
                      )}
                    </span>
                    <span className="character-sheet__vital-value">
                      <input
                        type="number"
                        className="character-sheet__vital-input"
                        value={combat.armorClass}
                        aria-label="Armor Class"
                        readOnly={statsLocked}
                        onChange={(e) => handleArmorClassChange(e.target.value)}
                        min={0}
                      />
                      <span className="character-sheet__ac-plus" aria-hidden="true">+</span>
                      <input
                        type="number"
                        className={`character-sheet__vital-input character-sheet__ac-bonus${
                          (sheet.acBonus ?? 0) !== 0 ? " character-sheet__ac-bonus--on" : ""
                        }`}
                        value={sheet.acBonus ?? 0}
                        aria-label="Temporary AC bonus"
                        title="Temporary AC bonus, like +2 from Haste. Set it back to 0 when it ends."
                        onChange={(e) => handleAcBonusChange(e.target.value)}
                      />
                    </span>
                  </div>

                  <label className="character-sheet__vital">
                    {/* Tap "Init" to roll initiative. */}
                    <RollButton
                      label="Initiative"
                      bonus={combat.initiative}
                      className="character-sheet__vital-label"
                    >
                      Init
                    </RollButton>
                    {sheet.initiativeMode === "auto" && (
                      <span
                        className="character-sheet__ac-mode"
                        title={`Your Dexterity modifier${
                          sheet.combat?.initiativeBonus
                            ? `, plus a ${formatModifier(sheet.combat.initiativeBonus)} bonus`
                            : ""
                        }. Type a number to add a bonus (like Alert's +5).`}
                      >
                        auto
                      </span>
                    )}
                    <input
                      type="number"
                      className="character-sheet__vital-input"
                      value={combat.initiative}
                      aria-label="Initiative"
                      readOnly={statsLocked}
                      onChange={(e) => handleInitiativeChange(e.target.value)}
                    />
                  </label>

                  <div className="character-sheet__vital">
                    <span className="character-sheet__vital-label">Speed</span>
                    <span className="character-sheet__vital-value">
                      <input
                        type="number"
                        className="character-sheet__vital-input"
                        value={combat.speed}
                        aria-label="Speed"
                        readOnly={statsLocked}
                        onChange={(e) => handleSpeedChange(e.target.value)}
                        min={0}
                      />
                      <span className="character-sheet__vital-unit">ft</span>
                    </span>
                  </div>

                  <div className="character-sheet__vital character-sheet__vital--hit-dice">
                    <span className="character-sheet__vital-label">
                      Hit Dice
                    </span>
                    {/* Left / total, then the die: "3 / 15 d10". What's left
                        goes down on a Short Rest and back up on a Long Rest,
                        and can always be typed, like current HP. */}
                    <span className="character-sheet__vital-value">
                      <input
                        type="number"
                        className="character-sheet__vital-input character-sheet__hit-dice-left"
                        value={getHitDiceRemaining(combat.hitDice)}
                        aria-label="Hit dice left"
                        onChange={(e) =>
                          handleHitDiceChange("remaining", e.target.value)
                        }
                        min={0}
                        max={combat.hitDice.total}
                      />
                      <span className="character-sheet__vital-unit">/</span>
                      <input
                        type="number"
                        className="character-sheet__vital-input"
                        value={combat.hitDice.total}
                        aria-label="Hit dice total"
                        readOnly={statsLocked}
                        onChange={(e) =>
                          handleHitDiceChange("total", e.target.value)
                        }
                        min={0}
                        max={20}
                      />
                      <span className="character-sheet__vital-unit">d</span>
                      <input
                        type="number"
                        className="character-sheet__vital-input"
                        value={combat.hitDice.die ?? ""}
                        aria-label="Hit die size"
                        readOnly={statsLocked}
                        onChange={(e) =>
                          handleHitDiceChange("die", e.target.value)
                        }
                        min={1}
                      />
                    </span>
                  </div>

                  <div className="character-sheet__ability-row">
                  {/* One bonus for every save, like a Paladin's Aura of Protection. */}
                  <label
                    className="character-sheet__all-saves"
                    title="A flat extra added to every saving throw, like a Paladin's Aura of Protection"
                  >
                    <span className="character-sheet__vital-label">All saves</span>
                    <input
                      type="number"
                      className="character-sheet__vital-input"
                      value={sheet.saveBonus ?? 0}
                      aria-label="Bonus to all saves"
                      readOnly={statsLocked}
                      onChange={(e) => handleSaveBonusChange(e.target.value)}
                    />
                  </label>
                  <div className="character-sheet__abilities">
                    {ABILITY_SCORES.map((ability) => {
                      const score = sheet.abilityScores[ability];
                      const modifier = getAbilityModifier(score);
                      const isSaveProficient = sheet.savingThrows[ability];
                      const saveBonus = getSaveModifier(
                        score,
                        isSaveProficient,
                        proficiencyBonus,
                        sheet.saveBonus ?? 0,
                      );

                      return (
                        <div
                          className="character-sheet__ability-card"
                          key={ability}
                        >
                          <span className="character-sheet__ability-name">
                            {ABILITY_ABBREVIATIONS[ability]}
                          </span>
                          <input
                            type="number"
                            className="character-sheet__ability-input"
                            value={score}
                            aria-label={`${ability} score`}
                            readOnly={statsLocked}
                            onChange={(e) =>
                              handleAbilityScoreChange(ability, e.target.value)
                            }
                            min={1}
                            max={30}
                          />
                          <RollButton
                            label={`${ABILITY_LABELS[ability]} check`}
                            bonus={modifier}
                            className="character-sheet__ability-modifier"
                          >
                            {formatModifier(modifier)}
                          </RollButton>
                          {/* The dot marks the save as proficient; the badge
                              rolls it. */}
                          <span
                            className={`character-sheet__save${
                              isSaveProficient ? " character-sheet__save--proficient" : ""
                            }`}
                          >
                            <button
                              type="button"
                              className="character-sheet__save-dot"
                              aria-pressed={Boolean(isSaveProficient)}
                              aria-label={`${ABILITY_LABELS[ability]} save proficiency`}
                              disabled={statsLocked}
                              title={
                                statsLocked
                                  ? "Tap Edit stats to change save proficiency"
                                  : isSaveProficient
                                    ? "Proficient in this saving throw - click to remove"
                                    : "Not proficient - click to add"
                              }
                              onClick={() => handleSaveToggle(ability)}
                            />
                            <RollButton
                              label={`${ABILITY_LABELS[ability]} save`}
                              bonus={saveBonus}
                              className={`character-sheet__ability-save-badge${
                                isSaveProficient
                                  ? ""
                                  : " character-sheet__ability-save-badge--plain"
                              }`}
                            >
                              Save {formatModifier(saveBonus)}
                            </RollButton>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  </div>

                  {/* Conditions, with what each one does on hover or tap. */}
                  <div className="character-sheet__conditions">
                    <ConditionBadges
                      conditions={sheet.conditions ?? []}
                      onChange={handleConditionsChange}
                    />
                    <Concentration
                      spell={sheet.concentration?.spell ?? ""}
                      spellNames={(sheet.spellcasting?.spellsKnown ?? [])
                        .map((spell) => spell?.name)
                        .filter(Boolean)}
                      check={concentrationCheck}
                      conSave={conSave}
                      onStart={handleConcentrationStart}
                      onEnd={handleConcentrationEnd}
                      rounds={sheet.concentration?.rounds ?? null}
                      onRoundsChange={handleConcentrationRounds}
                      onRollCheck={() => handleConcentrationCheck(conSave)}
                    />
                    {/* Unlock to change AC, scores and the rest on purpose. */}
                    <button
                      type="button"
                      className={`character-sheet__stats-lock${
                        statsLocked ? "" : " character-sheet__stats-lock--open"
                      }`}
                      aria-pressed={!statsLocked}
                      title={
                        statsLocked
                          ? "Unlock to change Max HP, AC, Initiative, Speed, Hit Dice, ability scores and saves"
                          : "Lock your stats again so a stray tap can't change them"
                      }
                      onClick={() => setStatsLocked((locked) => !locked)}
                    >
                      {statsLocked ? "🔒 Edit stats" : "🔓 Done editing"}
                    </button>
                  </div>

                  {endedConditionsNote && (
                    <p className="character-sheet__conditions-ended" role="status">
                      ⏱ {endedConditionsNote}{" "}
                      <button type="button" onClick={() => setEndedConditionsNote("")}>
                        OK
                      </button>
                    </p>
                  )}

                  {/* At 0 HP: the death saves, front and centre. */}
                  {(combat.hitPoints.current ?? 0) <= 0 && (combat.hitPoints.max ?? 0) > 0 && (
                    <DeathSaves
                      deathSaves={sheet.deathSaves}
                      onChange={(deathSaves) => persistSheet({ ...sheet, deathSaves })}
                      onRoll={handleRollDeathSave}
                      lastResult={deathSaveNote}
                    />
                  )}

                  {controlsPlace === "header" && (
                    <div className="character-sheet__ability-extras">
                      {/* Tablets: the Stats | Skills pill leads this line, so it
                          doesn't crowd the character's name. */}
                      {isCompact && panelSwitch}
                      {quickControls}
                    </div>
                  )}
                </section>

                {isCompact && compactPanel === "skills" && skillsPanel}

                {/* Saved numbers that don't match the sheet's scores any more. */}
                {outOfDateCount > 0 && (
                  <div className="character-sheet__setup" role="status">
                    <p className="character-sheet__stray-title">
                      {outOfDateCount === 1 ? "1 number is" : `${outOfDateCount} numbers are`} out of
                      date
                    </p>
                    <ul className="character-sheet__setup-list">
                      {outOfDate.armorClass && (
                        <li>
                          AC {outOfDate.armorClass.saved} → {outOfDate.armorClass.worked} (from your
                          armor and Dexterity)
                        </li>
                      )}
                      {outOfDate.initiative && (
                        <li>
                          Initiative {formatModifier(outOfDate.initiative.saved)} →{" "}
                          {formatModifier(outOfDate.initiative.worked)} (from your Dexterity)
                        </li>
                      )}
                      {/* A shared free-cast pool from before, split into one per
                          spell; any casts already used stay used. */}
                      {outOfDate.freeCasts.map((item) => (
                        <li key={item.key}>
                          {item.poolName} {item.pool.current}/{item.pool.max} → one free cast
                          each: {item.spells.join(", ")}
                          {item.used.length > 0 &&
                            ` (${item.used.join(", ")} will show as used; tap a pip to move it)`}
                        </li>
                      ))}
                      {outOfDate.speed.map((item) => (
                        <li key={item.featureIndex}>
                          Speed {item.saved} → {item.worked} ft (from {item.name})
                        </li>
                      ))}
                      {outOfDate.attacks.map((item) => (
                        <li key={item.index}>
                          {item.name}: {formatModifier(item.saved.toHit)} / {item.saved.damage || "—"}{" "}
                          → {formatModifier(item.worked.toHit)} / {item.worked.damage}
                        </li>
                      ))}
                    </ul>
                    <div className="character-sheet__setup-actions">
                      <Button onClick={handleUpdateNumbers}>Update</Button>
                      <Button variant="secondary" onClick={handleKeepNumbers}>
                        Keep mine
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tireless rolled: use it as temporary HP, or keep the current. */}
                {tempHpOffer && (
                  <div className="character-sheet__setup" role="status">
                    <p className="character-sheet__stray-title">
                      Tireless: {tempHpOffer.total} temporary HP
                    </p>
                    <p className="character-sheet__empty-text">
                      Temporary HP doesn&apos;t stack, so choose one. You have{" "}
                      {combat.hitPoints?.temporary ?? 0} now.
                    </p>
                    <div className="character-sheet__setup-actions">
                      <Button onClick={handleUseTempHpOffer}>Use {tempHpOffer.total}</Button>
                      <Button variant="secondary" onClick={() => setTempHpOffer(null)}>
                        {(combat.hitPoints?.temporary ?? 0) > 0
                          ? `Keep ${combat.hitPoints.temporary}`
                          : "Not now"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Subclass bonus spells not on the sheet, or counted by mistake. */}
                {(missingBonusSpells.length > 0 ||
                  handCountedBonusSpells.length > 0 ||
                  missingFreeCasts.length > 0) && (
                  <div className="character-sheet__setup" role="status">
                    <p className="character-sheet__stray-title">
                      {subclassName} spells to sort out
                    </p>
                    <ul className="character-sheet__setup-list">
                      {missingBonusSpells.length > 0 && (
                        <li>
                          Not on your sheet yet:{" "}
                          {missingBonusSpells.map((spell) => spell.name).join(", ")}
                        </li>
                      )}
                      {handCountedBonusSpells.length > 0 && (
                        <li>
                          On your sheet but counted toward spells known:{" "}
                          {handCountedBonusSpells.map((spell) => spell.name).join(", ")}
                        </li>
                      )}
                      {missingFreeCasts.length > 0 && (
                        <li>
                          Free cast not tracked yet:{" "}
                          {missingFreeCasts.map((spell) => spell.name).join(", ")}
                        </li>
                      )}
                    </ul>
                    <div className="character-sheet__setup-actions">
                      {(missingBonusSpells.length > 0 || missingFreeCasts.length > 0) && (
                        <Button onClick={handleAddBonusSpells}>
                          Add {missingBonusSpells.length + missingFreeCasts.length === 1 ? "it" : "them"}
                        </Button>
                      )}
                      {handCountedBonusSpells.length > 0 && (
                        <Button variant="secondary" onClick={handleMarkBonusSpells}>
                          Mark as from {subclassName}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="character-sheet__tabbar">
                  <CharacterSheetTabs
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                    hasTable={Boolean(roller.tableId)}
                    hasSpellcasting={hasSpellcasting}
                    // Setup choices still to make show as a count on Features.
                    badges={{ features: setupTasks.length }}
                    dots={{ features: newOptionalFeatures.length > 0 }}
                  />
                  {/* No side panel on smaller screens: one Help button opens the
                      explanations (what the boxes mean, and the dice). */}
                  {controlsPlace !== "side" && (
                    <button
                      type="button"
                      className="character-sheet__help-button"
                      aria-expanded={showHelp}
                      aria-controls="character-sheet-help"
                      onClick={() => setShowHelp((open) => !open)}
                    >
                      ? Help
                    </button>
                  )}
                  {controlsPlace === "tabbar" && quickControls}
                </div>

                {controlsPlace !== "side" && showHelp && (
                  <section id="character-sheet-help" className="character-sheet__help-panel" aria-label="Help with the sheet">
                    <h2 className="character-sheet__help-title">What do these boxes mean?</h2>
                    {glossaryBody}
                    <h2 className="character-sheet__help-title">New to dice? What does this mean?</h2>
                    <DiceHelpBody />
                  </section>
                )}

                {showShortRest && (
                  <ShortRestPanel
                    sheet={sheet}
                    onRest={handleShortRest}
                    onClose={() => setShowShortRest(false)}
                  />
                )}

                {restMessage && (
                  <p className="character-sheet__rest-message" role="status">
                    {restMessage}
                    <button
                      type="button"
                      className="character-sheet__resource-remove"
                      onClick={() => setRestMessage("")}
                    >
                      Dismiss
                    </button>
                  </p>
                )}

                <div className="character-sheet__main">
                  {activeTab === "actions" && (
                    <CharacterSheetActionsTab
                      onAttack={tableCombat?.isMyTurn ? setAttackWith : null}
                      // The attack panel opens right under the attack you
                      // tapped, so the target picker is where you're looking.
                      attackPanelFor={(attack) =>
                        tableCombat?.isMyTurn && attackWith && attack.index === attackWith.index ? (
                          <AttackPanel
                            attack={attackWith}
                            combat={tableCombat}
                            onClose={() => setAttackWith(null)}
                          />
                        ) : null
                      }
                      attacks={sheet.attacks ?? []}
                      onAttackAdd={handleAttackAdd}
                      onAttackUpdate={handleAttackUpdate}
                      onAttackRemove={handleAttackRemove}
                      equipment={sheet.equipment ?? []}
                      abilityScores={sheet.abilityScores}
                      proficiencyNames={(sheet.proficiencies ?? []).map(
                        (proficiency) => proficiency.name,
                      )}
                      proficiencyBonus={proficiencyBonus}
                      fightingStyles={getFightingStyles(sheet.features)}
                    />
                  )}

                  {/* The companion's whole card (stats, attacks, notes) lives
                      here; with no companion, a line offers to add one. */}
                  {activeTab === "actions" &&
                    (sheet.companionMode === "creature" && sheet.companionCreature ? (
                      <CompanionCard
                        companion={sheet.companionCreature}
                        notes={getCompanionNotes(sheet.companionCreature, sheet.companion)}
                        userId={user.id}
                        characterId={sheet.id}
                        onPortraitUpload={handleCompanionPortraitUpload}
                        onFieldChange={handleCompanionCreatureChange}
                        onHpChange={handleCompanionCreatureHpChange}
                        onAbilityChange={handleCompanionAbilityChange}
                        onSaveChange={handleCompanionSaveChange}
                        onNotesChange={handleCompanionNotesChange}
                        onAttackAdd={handleCompanionAttackAdd}
                        onAttackUpdate={handleCompanionAttackUpdate}
                        onAttackRemove={handleCompanionAttackRemove}
                        // A companion that follows a summon spell (Fable and
                        // Summon Fey); null for an ordinary one.
                        summon={getSummonInfo(
                          sheet,
                          spellcastingAbility
                            ? getSpellAttackModifier(sheet.abilityScores[spellcastingAbility] ?? 10, proficiencyBonus)
                            : proficiencyBonus,
                        )}
                        onSummon={(action, payload) => persistSheet(applySummonAction(sheet, action, payload))}
                      />
                    ) : (
                      <p className="companion-card__add">
                        <Button variant="secondary" onClick={handleCompanionAdd}>
                          + Add a companion
                        </Button>
                        <span>
                          {sheet.companion?.trim()
                            ? "Your companion notes will come along as bullet points."
                            : "A mount, familiar or animal friend, with its own HP, stats and attacks."}
                        </span>
                      </p>
                    ))}

                  {activeTab === "spells" && hasSpellcasting && (
                    <CharacterSheetSpellsTab
                      spellcasting={sheet.spellcasting}
                      spellcastingAbility={spellcastingAbility}
                      abilityScore={sheet.abilityScores[spellcastingAbility]}
                      proficiencyBonus={proficiencyBonus}
                      activeSlotLevels={activeSlotLevels}
                      onSpellSlotChange={handleSpellSlotChange}
                      onShowSlotLevel={handleShowSlotLevel}
                      onHideSlotLevel={handleHideSlotLevel}
                      onSpellAdd={handleSpellAdd}
                      onSpellUpdate={handleSpellUpdate}
                      onSpellRemove={handleSpellRemove}
                      onSpellLockToggle={handleSpellLockToggle}
                      spellsStartAt={getSpellsStartAt(sheet.class, sheet.level)}
                      onFillComponents={handleFillComponents}
                    />
                  )}

                  {activeTab === "resources" && (
                    <CharacterSheetResourcesTab
                      resources={sheet.resources ?? []}
                      onResourceCurrentChange={handleResourceCurrentChange}
                      onResourceAdd={handleResourceAdd}
                      onResourceUpdate={handleResourceUpdate}
                      onResourceRemove={handleResourceRemove}
                    />
                  )}

                  {activeTab === "inventory" && (
                    <CharacterSheetInventoryTab
                      equipment={sheet.equipment ?? []}
                      onEquipmentAdd={handleEquipmentAdd}
                      onEquipmentUpdate={handleEquipmentUpdate}
                      onEquipmentRemove={handleEquipmentRemove}
                      onEquipmentAttuneToggle={handleEquipmentAttuneToggle}
                      onEquipmentProficientToggle={
                        handleEquipmentProficientToggle
                      }
                      isArmor={(item) => isArmorDetails(gearDetailsFor(item))}
                      categoryOf={(item) => getInventoryCategory(item, gearDetailsFor(item))}
                      onEquipToggle={handleEquipToggle}
                    />
                  )}

                  {activeTab === "features" && (
                    <CharacterSheetFeaturesTab
                      classId={sheet.class?.id}
                      subclassId={getFeatureSubclassId(sheet.class)}
                      subclassName={sheet.class?.subclass?.name ?? null}
                      raceId={sheet.race?.id}
                      subraceId={sheet.race?.subrace?.id}
                      features={sheet.features ?? []}
                      level={sheet.level}
                      onFeaturesAddMany={handleFeaturesAddMany}
                      onFeaturesRemoveMany={handleFeaturesRemoveMany}
                      onFeatureChoose={handleFeatureChoose}
                      optionalFeatures={getOptionalClassFeatures(sheet.class)}
                      optionalFeaturesOn={sheet.optionalFeatures ?? {}}
                      onOptionalFeatureSwitch={handleOptionalFeatureSwitch}
                      isReplacedFeature={(name) => isReplacedByOption(sheet, name)}
                      abilityScores={sheet.abilityScores}
                      homebrewFeatureDamage={getSubclassFeatureDamage(sheet.class?.subclass?.id, homebrewList)}
                      newOptionalCount={newOptionalFeatures.length}
                      onOptionalFeaturesSeen={() => persistSheet(markOptionalFeaturesSeen(sheet))}
                      featureEntries={currentEntries}
                      setupTasks={setupTasks}
                      background={sheet.background ?? null}
                      onFeatureAdd={handleFeatureAdd}
                      onFeatureUpdate={handleFeatureUpdate}
                      onFeatureRemove={handleFeatureRemove}
                      feats={sheet.feats ?? []}
                      onFeatAdd={handleFeatAdd}
                      onFeatUpdate={handleFeatUpdate}
                      onFeatRemove={handleFeatRemove}
                      proficiencies={sheet.proficiencies ?? []}
                      onProficiencyAdd={handleProficiencyAdd}
                      onProficiencyUpdate={handleProficiencyUpdate}
                      onProficiencyRemove={handleProficiencyRemove}
                      languages={sheet.languages ?? ""}
                      onLanguagesChange={handleLanguagesChange}
                      size={sheet.size ?? "Medium"}
                      onSizeChange={handleSizeChange}
                    />
                  )}

                  {activeTab === "journal" && (
                    <div className="character-sheet__journal-stack">
                      {/* At a table: the table's journal and handouts, or my own
                          private notes (which can be brought into the table). */}
                      {roller.tableId && (
                        <div className="character-sheet__journal-switch" role="group" aria-label="Which journal">
                          <button
                            type="button"
                            aria-pressed={journalView === "table"}
                            onClick={() => setJournalView("table")}
                          >
                            {roller.tableName ?? "Table"}: journal &amp; handouts
                          </button>
                          <button
                            type="button"
                            aria-pressed={journalView === "mine"}
                            onClick={() => setJournalView("mine")}
                          >
                            My private notes
                          </button>
                        </div>
                      )}

                      {roller.tableId && journalView === "table" ? (
                        <>
                          <TableHandouts tableId={roller.tableId} isDm={false} />
                          <TableJournal
                            tableId={roller.tableId}
                            userId={user.id}
                            isDm={false}
                            sessionNumber={roller.tableSession}
                          />
                        </>
                      ) : (
                        <PersonalJournal
                          characterId={sheet.id}
                          name={sheet.name}
                          portraitUrl={sheet.portraitUrl}
                          table={roller.tableId ? { id: roller.tableId, name: roller.tableName } : null}
                        />
                      )}
                    </div>
                  )}

                  {activeTab === "rolls" && (
                    <RollHistory history={roller.history} onClear={roller.clearHistory} />
                  )}

                  {activeTab === "story" && (
                    <CharacterSheetStoryTab
                      backstory={sheet.backstory}
                      showBackstory={sheet.showBackstory !== false}
                      onBackstoryChange={handleBackstoryChange}
                      onToggleBackstoryVisibility={
                        handleToggleBackstoryVisibility
                      }
                      appearance={sheet.appearance}
                      onAppearanceChange={handleAppearanceChange}
                      notes={sheet.notes}
                      onNotesChange={handleNotesChange}
                    />
                  )}
                </div>
              </div>

              {/* Wide screens: portrait and the quick controls on the right. */}
              {controlsPlace === "side" && (
                <aside className="character-sheet__side" aria-label="Portrait and quick controls">
                  <PortraitUpload
                    userId={user.id}
                    characterId={sheet.id}
                    name={sheet.name}
                    portraitUrl={sheet.portraitUrl}
                    onUpload={handlePortraitUpload}
                    size="large"
                  />
                  {quickControls}
                  {tableLink}
                  {/* Help, kept out of the middle of the sheet. */}
                  <details className="character-sheet__glossary">
                    <summary>What do these boxes mean?</summary>
                    {glossaryBody}
                  </details>
                  <DiceHelp />
                </aside>
              )}
            </div>
          </>
        )}
      </div>
      <CharacterDetailsDialog
        isOpen={isEditingDetails}
        onClose={() => setIsEditingDetails(false)}
        name={sheet.name}
        level={sheet.level}
        onLevelChange={handleLevelChange}
        details={{
          race: sheet.race?.name ?? "",
          className: sheet.class?.name ?? "",
          subclass: sheet.class?.subclass?.name ?? "",
          background: sheet.background?.name ?? "",
          spellcastingAbility:
            sheet.class?.spellcastingAbility === undefined
              ? "default"
              : sheet.class.spellcastingAbility === ""
                ? "none"
                : sheet.class.spellcastingAbility,
        }}
        onDetailChange={handleDetailChange}
      />
      {/* Nothing is rolled while levelling up (or on the summary after), so
          the roll bar steps aside there instead of covering the buttons.
          Its settings (advantage, real dice, sharing) live on the sheet and
          are kept. */}
      {!isLevelingUp && !levelUpSummary && <RollDock />}
    </main>
  );

  // Every rollable number on the page reads the roller from here.
  // The roll bar also reminds you of conditions that change your rolls.
  return (
    <RollContext.Provider
      value={{
        ...roller,
        conditionNotes: rollNotesFor(sheet.conditions ?? []),
        // "See my roll history" on the roll card jumps to the Rolls tab.
        openHistory: () => setActiveTab("rolls"),
      }}
    >
      {sheetPage}
    </RollContext.Provider>
  );
}

export default CharacterSheetPage;
