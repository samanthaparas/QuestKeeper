import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCharacter, saveCharacter } from "../../utils/characterStore";
import {
  ABILITY_SCORES,
  ABILITY_ABBREVIATIONS,
  SKILLS,
  getAbilityModifier,
  getSkillModifier,
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
  createEquipmentItem,
  updateEquipmentItem,
  removeEquipmentItem,
  getAttunedCount,
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
import CharacterSheetTabs from "../../components/CharacterSheetTabs/CharacterSheetTabs";
import CharacterSheetActionsTab from "../../components/CharacterSheetActionsTab/CharacterSheetActionsTab";
import CharacterSheetSpellsTab from "../../components/CharacterSheetSpellsTab/CharacterSheetSpellsTab";
import CharacterSheetResourcesTab from "../../components/CharacterSheetResourcesTab/CharacterSheetResourcesTab";
import CharacterSheetInventoryTab from "../../components/CharacterSheetInventoryTab/CharacterSheetInventoryTab";
import CharacterSheetFeaturesTab from "../../components/CharacterSheetFeaturesTab/CharacterSheetFeaturesTab";
import CharacterSheetStoryTab from "../../components/CharacterSheetStoryTab/CharacterSheetStoryTab";
import "./CharacterSheetPage.css";

function CharacterSheetPage() {
  const { id } = useParams();
  const [sheet, setSheet] = useState(() => getCharacter(id));
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [levelUpSummary, setLevelUpSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("actions");
  const [activeSlotLevels, setActiveSlotLevels] = useState(
    () =>
      new Set(
        getSpellSlots(sheet?.spellcasting)
          .filter((slot) => slot.max > 0)
          .map((slot) => slot.level),
      ),
  );

  const [loadedId, setLoadedId] = useState(id);

  if (id !== loadedId) {
    const loaded = getCharacter(id);
    setLoadedId(id);
    setSheet(loaded);
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
    const saved = saveCharacter(updatedSheet);
    setSheet(saved);
    setLevelUpSummary(summary);
    setIsLevelingUp(false);
  }

  function persistSheet(updated) {
    const saved = saveCharacter(updated);
    setSheet(saved);
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

  function handleRest(restType) {
    persistSheet(applyRest(sheet, restType));
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

  return (
    <main className="character-sheet">
      <div className="character-sheet__content">
        <Link className="character-sheet__back-link" to="/characters">
          Back to Characters
        </Link>

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
            <header className="character-sheet__header">
              <h1 className="character-sheet__title">{sheet.name}</h1>
              <p className="character-sheet__subtitle">
                Level {sheet.level} {sheet.race?.name ?? "No race"}{" "}
                {sheet.class?.name ?? "No class"}
                {sheet.class?.subclass?.name
                  ? ` (${sheet.class.subclass.name})`
                  : ""}{" "}
                · {sheet.background?.name ?? "No background"}
              </p>
            </header>

            <div className="character-sheet__actions">
              <Button onClick={() => setIsLevelingUp(true)}>Level Up</Button>
              <Button variant="secondary" onClick={() => handleRest("long")}>
                Long Rest
              </Button>
            </div>

            <section className="character-sheet__combat-header">
              <div className="character-sheet__hero-row">
                <div className="character-sheet__stat-box character-sheet__stat-box--featured">
                  <span className="character-sheet__stat-label">
                    Hit Points
                  </span>
                  <span className="character-sheet__stat-value character-sheet__hp-value">
                    <input
                      type="number"
                      className="character-sheet__hp-input"
                      value={combat.hitPoints.current}
                      onChange={(e) => handleHpChange(e.target.value)}
                      min={0}
                      max={combat.hitPoints.max}
                    />
                    {" / "}
                    <input
                      type="number"
                      className="character-sheet__hp-input"
                      value={combat.hitPoints.max}
                      onChange={(e) => handleMaxHpChange(e.target.value)}
                      min={0}
                    />
                    {combat.hitPoints.temporary > 0 &&
                      ` (+${combat.hitPoints.temporary})`}
                  </span>
                </div>

                <div className="character-sheet__stat-box">
                  <span className="character-sheet__stat-label">
                    Initiative
                  </span>
                  <input
                    type="number"
                    className="character-sheet__stat-input"
                    value={combat.initiative}
                    onChange={(e) => handleInitiativeChange(e.target.value)}
                  />
                </div>

                <div className="character-sheet__stat-box">
                  <span className="character-sheet__stat-label">Speed</span>
                  <span className="character-sheet__stat-value character-sheet__hp-value">
                    <input
                      type="number"
                      className="character-sheet__hp-input"
                      value={combat.speed}
                      onChange={(e) => handleSpeedChange(e.target.value)}
                      min={0}
                    />
                    {" ft"}
                  </span>
                </div>

                <div className="character-sheet__stat-box">
                  <span className="character-sheet__stat-label">
                    Proficiency
                  </span>
                  <span className="character-sheet__stat-value">
                    +{proficiencyBonus}
                  </span>
                </div>

                <div className="character-sheet__stat-box">
                  <span className="character-sheet__stat-label">
                    Inspiration
                  </span>
                  <input
                    type="number"
                    className="character-sheet__stat-input"
                    value={sheet.inspiration ?? 0}
                    onChange={(e) => handleInspirationChange(e.target.value)}
                    min={0}
                  />
                </div>

                <div className="character-sheet__stat-box">
                  <span className="character-sheet__stat-label">Gold</span>
                  <input
                    type="number"
                    className="character-sheet__stat-input"
                    value={sheet.gold ?? 0}
                    onChange={(e) => handleGoldChange(e.target.value)}
                    min={0}
                  />
                </div>
              </div>

              <div className="character-sheet__stat-row">
                <div className="character-sheet__stat-box">
                  <span className="character-sheet__stat-label">Level</span>
                  <input
                    type="number"
                    className="character-sheet__stat-input"
                    value={sheet.level}
                    onChange={(e) => handleLevelChange(e.target.value)}
                    min={1}
                    max={20}
                  />
                </div>
                <div className="character-sheet__stat-box">
                  <span className="character-sheet__stat-label">
                    Armor Class
                  </span>
                  <input
                    type="number"
                    className="character-sheet__stat-input"
                    value={combat.armorClass}
                    onChange={(e) => handleArmorClassChange(e.target.value)}
                    min={0}
                  />
                </div>
                <div className="character-sheet__stat-box">
                  <span className="character-sheet__stat-label">Hit Dice</span>
                  <span className="character-sheet__stat-value character-sheet__hp-value">
                    <input
                      type="number"
                      className="character-sheet__hp-input character-sheet__hp-input--tiny"
                      value={combat.hitDice.total}
                      onChange={(e) =>
                        handleHitDiceChange("total", e.target.value)
                      }
                      min={0}
                      max={20}
                    />
                    d
                    <input
                      type="number"
                      className="character-sheet__hp-input character-sheet__hp-input--tiny"
                      value={combat.hitDice.die ?? ""}
                      onChange={(e) =>
                        handleHitDiceChange("die", e.target.value)
                      }
                      min={1}
                    />
                  </span>
                </div>

                <div className="character-sheet__stat-box">
                  <span className="character-sheet__stat-label">Size</span>
                  <select
                    className="character-sheet__stat-input"
                    value={sheet.size ?? "Medium"}
                    onChange={(e) => handleSizeChange(e.target.value)}
                  >
                    <option value="Tiny">Tiny</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Huge">Huge</option>
                    <option value="Gargantuan">Gargantuan</option>
                  </select>
                </div>
                <div className="character-sheet__stat-box">
                  <span className="character-sheet__stat-label">Languages</span>
                  <textarea
                    className="character-sheet__stat-textarea"
                    value={sheet.languages ?? ""}
                    onChange={(e) => handleLanguagesChange(e.target.value)}
                    placeholder={"Common\nInfernal"}
                    rows={2}
                  />
                </div>
              </div>

              <div className="character-sheet__abilities">
                {ABILITY_SCORES.map((ability) => {
                  const score = sheet.abilityScores[ability];
                  const modifier = getAbilityModifier(score);
                  const isSaveProficient = sheet.savingThrows[ability];
                  const saveBonus =
                    modifier + (isSaveProficient ? proficiencyBonus : 0);

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
                        onChange={(e) =>
                          handleAbilityScoreChange(ability, e.target.value)
                        }
                        min={1}
                        max={30}
                      />
                      <span className="character-sheet__ability-modifier">
                        {formatModifier(modifier)}
                      </span>
                      <span
                        className={`character-sheet__ability-save-badge${
                          isSaveProficient
                            ? ""
                            : " character-sheet__ability-save-badge--plain"
                        }`}
                      >
                        Save {formatModifier(saveBonus)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="character-sheet__layout">
              <div className="character-sheet__main">
                <CharacterSheetTabs
                  activeTab={activeTab}
                  onSelect={setActiveTab}
                  hasSpellcasting={hasSpellcasting}
                />

                {activeTab === "actions" && (
                  <CharacterSheetActionsTab
                    attacks={sheet.attacks ?? []}
                    onAttackAdd={handleAttackAdd}
                    onAttackUpdate={handleAttackUpdate}
                    onAttackRemove={handleAttackRemove}
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
                  />
                )}

                {activeTab === "features" && (
                  <CharacterSheetFeaturesTab
                    features={sheet.features ?? []}
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
                  />
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

              <aside className="character-sheet__sidebar">
                <section className="character-sheet__section">
                  <h2 className="character-sheet__section-title">Skills</h2>
                  <ul className="character-sheet__skills-list">
                    {SKILLS.map((skill) => {
                      const isProficient = Boolean(sheet.skills?.[skill.index]);
                      const modifier = getSkillModifier(
                        sheet.abilityScores[skill.ability],
                        isProficient,
                        proficiencyBonus,
                      );

                      return (
                        <li
                          className={`character-sheet__skill-row${
                            isProficient
                              ? " character-sheet__skill-row--proficient"
                              : ""
                          }`}
                          key={skill.index}
                        >
                          <span className="character-sheet__skill-name">
                            {skill.name}
                          </span>
                          <span className="character-sheet__skill-ability">
                            {ABILITY_ABBREVIATIONS[skill.ability]}
                          </span>
                          <span className="character-sheet__skill-prof-badge">
                            {isProficient ? "P" : ""}
                          </span>
                          <span className="character-sheet__skill-modifier">
                            {formatModifier(modifier)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default CharacterSheetPage;
