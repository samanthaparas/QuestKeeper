import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useTableTurn } from "../../hooks/useTableTurn";
import { applyDamageToHitPoints } from "../../utils/attacks";
import { getCharacter, saveCharacter } from "../../utils/characterStore";
import {
  ABILITY_SCORES,
  ABILITY_ABBREVIATIONS,
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
} from "../../utils/characterSheet";
import LevelUpWizard from "../../components/LevelUpWizard/LevelUpWizard";
import Button from "../../components/Button/Button";
import TurnBanner from "../../components/TurnBanner/TurnBanner";
import AttackPanel from "../../components/AttackPanel/AttackPanel";
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
    "Saving throw bonus, used to resist spells and effects. Click it to mark a save as proficient, and use the bonus box for flat extras.",
  ],
  [
    "P / E (skills)",
    "P: proficient, you add your proficiency bonus. E: expertise, you add it twice. Click the badge to step through them.",
  ],
  [
    "Inspiration",
    "A reward from your DM for great roleplay. Spend it for advantage.",
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
  const [compactPanel, setCompactPanel] = useState("stats");
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [showShortRest, setShowShortRest] = useState(false);
  const [restMessage, setRestMessage] = useState("");
  const [levelUpSummary, setLevelUpSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("actions");
  const [activeSlotLevels, setActiveSlotLevels] = useState(() => new Set());
  const [attackWith, setAttackWith] = useState(null);
  const tableCombat = useTableTurn(sheet?.id);

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

  function handleLevelUpComplete(updatedSheet) {
    const summary = buildLevelUpSummary(sheet, updatedSheet);
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

  function persistSheet(updated) {
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
          ? { ...rest, subclass: { ...(currentSubclass ?? {}), name: value } }
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

  function handleArmorClassChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet({
      ...sheet,
      combat: { ...sheet.combat, armorClass: numeric },
    });
  }

  function handleInitiativeChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet({
      ...sheet,
      combat: { ...sheet.combat, initiative: numeric },
    });
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

  function handleInspirationChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    persistSheet({ ...sheet, inspiration: numeric });
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

    persistSheet({
      ...sheet,
      combat: { ...sheet.combat, hitPoints: after },
    });

    // Tell the player where it went, so "my HP didn't change" is never a mystery.
    const fromTemp = (before.temporary ?? 0) - (after.temporary ?? 0);
    const fromHp = before.current - after.current;
    const parts = [];
    if (fromTemp > 0) parts.push(`${fromTemp} from temporary HP`);
    if (fromHp > 0) parts.push(`${fromHp} from HP`);
    return `Applied ${amount} damage: ${parts.join(" and ") || "nothing left to lose"}.`;
  }

  function handleHpChange(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    persistSheet({
      ...sheet,
      combat: {
        ...sheet.combat,
        hitPoints: setCurrentHp(sheet.combat.hitPoints, numeric),
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
        hitDice: { ...sheet.combat.hitDice, [field]: numeric },
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

  function handleCompanionChange(value) {
    persistSheet({ ...sheet, companion: value });
  }

  function handleCompanionModeToggle() {
    const nextMode = sheet.companionMode === "creature" ? "text" : "creature";
    persistSheet({
      ...sheet,
      companionMode: nextMode,
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

  function handleCompanionCreatureNotesChange(value) {
    persistSheet({
      ...sheet,
      companionCreature: { ...sheet.companionCreature, notes: value },
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
      createFeat({ name: feature.name, description: feature.description }),
    );
    persistSheet({ ...sheet, features: [...(sheet.features ?? []), ...added] });
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
      },
    );
    persistSheet({ ...sheet, spellcasting });
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
    const regained =
      getHitDiceRemaining(rested.combat.hitDice) -
      getHitDiceRemaining(sheet.combat.hitDice);
    persistSheet(rested);
    setShowShortRest(false);
    setRestMessage(
      `Long rest done. HP is back to full${
        regained > 0
          ? `, you got ${regained} Hit ${regained === 1 ? "Die" : "Dice"} back,`
          : ""
      } and spell slots and abilities are refilled.`,
    );
  }

  function handleShortRest(rolls) {
    const { sheet: rested, summary } = takeShortRest(sheet, rolls);
    persistSheet(rested);
    setShowShortRest(false);
    setRestMessage(
      summary.rolls.length > 0
        ? `Short rest done. Rolled ${summary.rolls.join(" + ")} (${formatModifier(
            summary.con,
          )} CON each) and healed ${summary.healed} HP: ${summary.hpBefore} → ${
            summary.hpAfter
          }. ${summary.hitDiceLeft} Hit ${
            summary.hitDiceLeft === 1 ? "Die" : "Dice"
          } left. Short-rest abilities are refilled.`
        : "Short rest done. Short-rest abilities are refilled.",
    );
  }

  function handleAttackAdd(values) {
    const attack = createAttack({
      name: values.name.trim(),
      toHit: values.toHit,
      damage: values.damage.trim(),
      damageType: values.damageType.trim(),
      notes: values.notes.trim(),
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
  const { combat } = sheet;
  const spellcastingAbility =
    sheet.class?.spellcastingAbility ?? getSpellcastingAbility(sheet.class?.id);
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
        <h2 className="character-sheet__section-title">Skills</h2>
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
              <span className="character-sheet__skill-modifier">
                {formatModifier(modifier)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <main className="character-sheet" onChange={stripLeadingZeros}>
      <TurnBanner
        combat={tableCombat}
        onApplyDamage={handleApplyIncomingDamage}
      />

      <div className="character-sheet__content">
        {isLevelingUp && (
          <LevelUpWizard
            sheet={sheet}
            onComplete={handleLevelUpComplete}
            onCancel={() => setIsLevelingUp(false)}
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

              {levelUpSummary.newSpell && (
                <li>New Spell: {levelUpSummary.newSpell.name}</li>
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
                    isCompact && compactPanel === "skills"
                      ? " character-sheet__vitals--skills"
                      : ""
                  }`}
                >
                  <div className="character-sheet__identity">
                    {isCompact && (
                      // One button: a tap anywhere on the pill flips it, and the
                      // thumb slides to the side that's showing.
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
                    )}
                    <h1 className="character-sheet__title">{sheet.name}</h1>
                    <p className="character-sheet__subtitle">
                      Level {sheet.level} {sheet.race?.name ?? "No race"}{" "}
                      {sheet.class?.name ?? "No class"}
                      {sheet.class?.subclass?.name
                        ? ` (${sheet.class.subclass.name})`
                        : ""}{" "}
                      · {sheet.background?.name ?? "No background"}
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
                      onChange={(e) => handleTempHpChange(e.target.value)}
                      min={0}
                    />
                  </label>

                  <label className="character-sheet__vital">
                    <span
                      className="character-sheet__vital-label"
                      title="Armor Class: an attack has to roll this number or higher to hit you."
                    >
                      AC
                      {(sheet.acBonus ?? 0) !== 0 && (
                        <span className="character-sheet__vital-total">
                          {" "}
                          {formatModifier(sheet.acBonus)} ={" "}
                          {getEffectiveArmorClass(sheet)}
                        </span>
                      )}
                    </span>
                    <input
                      type="number"
                      className="character-sheet__vital-input"
                      value={combat.armorClass}
                      onChange={(e) => handleArmorClassChange(e.target.value)}
                      min={0}
                    />
                  </label>

                  <label className="character-sheet__vital">
                    <span
                      className="character-sheet__vital-label"
                      title="Initiative bonus: added to your d20 roll to decide who acts first."
                    >
                      Init
                    </span>
                    <input
                      type="number"
                      className="character-sheet__vital-input"
                      value={combat.initiative}
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
                        onChange={(e) => handleSpeedChange(e.target.value)}
                        min={0}
                      />
                      <span className="character-sheet__vital-unit">ft</span>
                    </span>
                  </div>

                  <div className="character-sheet__vital">
                    <span
                      className="character-sheet__vital-label"
                      title="Proficiency bonus: added to everything you are trained in. It grows as you level."
                    >
                      Prof
                    </span>
                    <span className="character-sheet__vital-static">
                      +{proficiencyBonus}
                    </span>
                  </div>

                  <label className="character-sheet__vital">
                    <span
                      className="character-sheet__vital-label"
                      title="Use the Level Up button to gain a level properly. This box is for fixing a mistake."
                    >
                      Level
                    </span>
                    <input
                      type="number"
                      className="character-sheet__vital-input"
                      value={sheet.level}
                      onChange={(e) => handleLevelChange(e.target.value)}
                      min={1}
                      max={20}
                    />
                  </label>

                  <div className="character-sheet__vital character-sheet__vital--hit-dice">
                    <span className="character-sheet__vital-label">
                      Hit Dice
                    </span>
                    <span className="character-sheet__vital-value">
                      <input
                        type="number"
                        className="character-sheet__vital-input"
                        value={combat.hitDice.total}
                        aria-label="Hit dice total"
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
                        onChange={(e) =>
                          handleHitDiceChange("die", e.target.value)
                        }
                        min={1}
                      />
                    </span>
                  </div>

                  <label className="character-sheet__vital character-sheet__vital--gold">
                    <span className="character-sheet__vital-label">Gold</span>
                    <input
                      type="number"
                      className="character-sheet__vital-input character-sheet__vital-input--wide"
                      value={sheet.gold ?? 0}
                      onChange={(e) => handleGoldChange(e.target.value)}
                      min={0}
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
                            onChange={(e) =>
                              handleAbilityScoreChange(ability, e.target.value)
                            }
                            min={1}
                            max={30}
                          />
                          <span className="character-sheet__ability-modifier">
                            {formatModifier(modifier)}
                          </span>
                          <button
                            type="button"
                            className={`character-sheet__ability-save-badge${
                              isSaveProficient
                                ? ""
                                : " character-sheet__ability-save-badge--plain"
                            }`}
                            aria-pressed={Boolean(isSaveProficient)}
                            title={
                              isSaveProficient
                                ? "Proficient in this saving throw - click to remove"
                                : "Not proficient - click to add"
                            }
                            onClick={() => handleSaveToggle(ability)}
                          >
                            Save {formatModifier(saveBonus)}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="character-sheet__ability-extras">
                    <label className="character-sheet__save-bonus">
                      Temporary AC bonus
                      <input
                        type="number"
                        className="character-sheet__vital-input"
                        value={sheet.acBonus ?? 0}
                        aria-label="Temporary AC bonus"
                        title="A flat extra added to your AC for now, like +2 from Haste. Set it back to 0 when it ends."
                        onChange={(e) => handleAcBonusChange(e.target.value)}
                      />
                    </label>
                    <label className="character-sheet__save-bonus">
                      Bonus to all saves
                      <input
                        type="number"
                        className="character-sheet__vital-input"
                        value={sheet.saveBonus ?? 0}
                        aria-label="Bonus to all saves"
                        title="A flat extra added to every saving throw, like a Paladin's Aura of Protection"
                        onChange={(e) => handleSaveBonusChange(e.target.value)}
                      />
                    </label>
                    <p className="character-sheet__ability-hint">
                      Tip: click a Save badge to mark that saving throw as
                      proficient. Use the bonus box for extras like a Paladin's
                      Aura of Protection.
                    </p>
                  </div>
                </section>

                {isCompact && compactPanel === "skills" && skillsPanel}

                <details className="character-sheet__glossary">
                  <summary>What do these boxes mean?</summary>
                  <dl>
                    {SHEET_TERMS.map(([term, meaning]) => (
                      <div key={term}>
                        <dt>{term}</dt>
                        <dd>{meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </details>

                <div className="character-sheet__tabbar">
                  <CharacterSheetTabs
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                    hasSpellcasting={hasSpellcasting}
                  />
                  <div className="character-sheet__actions">
                    <label className="character-sheet__inspiration">
                      <span className="character-sheet__vital-label">
                        Inspiration
                      </span>
                      <input
                        type="number"
                        className="character-sheet__vital-input"
                        value={sheet.inspiration ?? 0}
                        onChange={(e) =>
                          handleInspirationChange(e.target.value)
                        }
                        min={0}
                      />
                    </label>
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
                </div>

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
                  {activeTab === "actions" &&
                    attackWith &&
                    tableCombat?.isMyTurn && (
                      <AttackPanel
                        attack={attackWith}
                        combat={tableCombat}
                        onClose={() => setAttackWith(null)}
                      />
                    )}

                  {activeTab === "actions" && (
                    <CharacterSheetActionsTab
                      onAttack={tableCombat?.isMyTurn ? setAttackWith : null}
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
                    />
                  )}

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
                    />
                  )}

                  {activeTab === "features" && (
                    <CharacterSheetFeaturesTab
                      classId={sheet.class?.id}
                      subclassId={sheet.class?.subclass?.id}
                      raceId={sheet.race?.id}
                      subraceId={sheet.race?.subrace?.id}
                      features={sheet.features ?? []}
                      level={sheet.level}
                      onFeaturesAddMany={handleFeaturesAddMany}
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

                  {activeTab === "story" && (
                    <CharacterSheetStoryTab
                      userId={user.id}
                      characterId={sheet.id}
                      name={sheet.name}
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
                      portraitUrl={sheet.portraitUrl}
                      onPortraitUpload={handlePortraitUpload}
                      backstory={sheet.backstory}
                      showBackstory={sheet.showBackstory !== false}
                      onBackstoryChange={handleBackstoryChange}
                      onToggleBackstoryVisibility={
                        handleToggleBackstoryVisibility
                      }
                      appearance={sheet.appearance}
                      onAppearanceChange={handleAppearanceChange}
                      companion={sheet.companion}
                      onCompanionChange={handleCompanionChange}
                      companionMode={sheet.companionMode}
                      companionCreature={sheet.companionCreature}
                      onToggleCompanionMode={handleCompanionModeToggle}
                      onCompanionCreatureChange={handleCompanionCreatureChange}
                      onCompanionCreatureHpChange={
                        handleCompanionCreatureHpChange
                      }
                      onCompanionCreatureNotesChange={
                        handleCompanionCreatureNotesChange
                      }
                      notes={sheet.notes}
                      onNotesChange={handleNotesChange}
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default CharacterSheetPage;
