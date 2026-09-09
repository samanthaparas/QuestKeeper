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
  formatModifier,
  buildLevelUpSummary,
  createResource,
  updateResource,
  setResourceCurrent,
  removeResource,
  setCurrentHp,
  applyRest,
  createEquipmentItem,
  updateEquipmentItem,
  removeEquipmentItem,
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
import EditableItemList from "../../components/EditableItemList/EditableItemList";
import "./CharacterSheetPage.css";

function CharacterSheetPage() {
  const { id } = useParams();
  const [sheet, setSheet] = useState(() => getCharacter(id));
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [levelUpSummary, setLevelUpSummary] = useState(null);

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

  const proficiencyBonus = getProficiencyBonus(sheet.level);
  const { combat } = sheet;

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

              {levelUpSummary.newSpell && (
                <li>New Spell: {levelUpSummary.newSpell.name}</li>
              )}
            </ul>

            <button
              type="button"
              className="character-sheet__level-up-button"
              onClick={() => setLevelUpSummary(null)}
            >
              Continue
            </button>
          </div>
        )}

        {!isLevelingUp && !levelUpSummary && (
          <>
            <header className="character-sheet__header">
              <h1 className="character-sheet__title">{sheet.name}</h1>
              <p className="character-sheet__subtitle">
                Level {sheet.level} {sheet.race?.name ?? "No race"}{" "}
                {sheet.class?.name ?? "No class"} ·{" "}
                {sheet.background?.name ?? "No background"}
              </p>
            </header>

            <div className="character-sheet__actions">
              <button
                type="button"
                className="character-sheet__level-up-button"
                onClick={() => setIsLevelingUp(true)}
              >
                Level Up
              </button>

              <button
                type="button"
                className="character-sheet__rest-button"
                onClick={() => handleRest("long")}
              >
                Long Rest
              </button>
            </div>

            <div className="character-sheet__hero-row">
              <div className="character-sheet__stat-box character-sheet__stat-box--featured">
                <span className="character-sheet__stat-label">Hit Points</span>
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
                <span className="character-sheet__stat-label">Initiative</span>
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
                <span className="character-sheet__stat-label">Proficiency</span>
                <span className="character-sheet__stat-value">
                  +{proficiencyBonus}
                </span>
              </div>

              <div className="character-sheet__stat-box">
                <span className="character-sheet__stat-label">Inspiration</span>
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

            <section className="character-sheet__stat-row">
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
                <span className="character-sheet__stat-label">Armor Class</span>
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
                    onChange={(e) => handleHitDiceChange("die", e.target.value)}
                    min={1}
                  />
                </span>
              </div>
            </section>

            <div className="character-sheet__layout">
              <div className="character-sheet__main">
                <section className="character-sheet__abilities">
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
                </section>

                <EditableItemList
                  title="Attacks"
                  items={sheet.attacks ?? []}
                  getItemId={(item) => item.index}
                  fields={[
                    {
                      key: "name",
                      type: "text",
                      label: "Weapon",
                      placeholder: "Weapon name (e.g. Night Terror Longsword)",
                    },
                    { key: "toHit", type: "number", placeholder: "To Hit" },
                    {
                      key: "damage",
                      type: "text",
                      placeholder: "Damage (e.g. 2d8+10)",
                    },
                    {
                      key: "damageType",
                      type: "text",
                      placeholder: "Type (e.g. Slashing)",
                    },
                    {
                      key: "notes",
                      type: "textarea",
                      placeholder:
                        "Notes (optional) - one line per bullet point",
                    },
                  ]}
                  columns={[
                    {
                      key: "toHit",
                      label: "To Hit",
                      width: "70px",
                      format: (item) => formatModifier(item.toHit),
                    },
                    { key: "damage", label: "Damage", width: "100px" },
                    { key: "damageType", label: "Type", width: "110px" },
                  ]}
                  emptyText="No attacks recorded yet."
                  addButtonLabel="Add Weapon"
                  onAdd={handleAttackAdd}
                  onUpdate={handleAttackUpdate}
                  onRemove={handleAttackRemove}
                />

                <section className="character-sheet__section">
                  <EditableItemList
                    title="Resources"
                    items={sheet.resources ?? []}
                    getItemId={(item) => item.id}
                    fields={[
                      {
                        key: "name",
                        type: "text",
                        placeholder: "Resource name (e.g. Channel Divinity)",
                      },
                      {
                        key: "max",
                        type: "number",
                        placeholder: "Max",
                        width: "small",
                        min: 1,
                      },
                      {
                        key: "resetOn",
                        type: "select",
                        defaultValue: "long",
                        options: [
                          { value: "long", label: "Long Rest" },
                          { value: "short", label: "Short Rest" },
                        ],
                      },
                      {
                        key: "notes",
                        type: "textarea",
                        placeholder:
                          "Notes (optional) - one line per bullet point",
                      },
                    ]}
                    emptyText="No tracked resources yet. Add one below for anything with limited uses - Channel Divinity, Lay on Hands, spell slots, whatever you need."
                    addButtonLabel="Add Resource"
                    onAdd={handleResourceAdd}
                    onUpdate={handleResourceUpdate}
                    onRemove={handleResourceRemove}
                    extraRowContent={(resource) => (
                      <>
                        <span className="character-sheet__resource-count">
                          <input
                            type="number"
                            className="character-sheet__resource-input"
                            value={resource.current}
                            onChange={(e) =>
                              handleResourceCurrentChange(
                                resource.id,
                                e.target.value,
                              )
                            }
                            min={0}
                            max={resource.max}
                          />
                          {" / "}
                          {resource.max}
                        </span>
                        <span className="character-sheet__resource-reset">
                          {resource.resetOn === "short"
                            ? "Short Rest"
                            : "Long Rest"}
                        </span>
                      </>
                    )}
                  />
                </section>

                <section className="character-sheet__section">
                  <EditableItemList
                    title="Equipment"
                    items={sheet.equipment ?? []}
                    getItemId={(item) => item.index}
                    fields={[
                      {
                        key: "name",
                        type: "text",
                        placeholder: "Item name (e.g. Night Terror Longsword)",
                      },
                      {
                        key: "quantity",
                        type: "number",
                        placeholder: "Qty",
                        width: "small",
                        min: 1,
                        defaultValue: "1",
                      },
                      {
                        key: "description",
                        type: "textarea",
                        placeholder:
                          "Description (optional) - one line per bullet point",
                      },
                    ]}
                    formatPrimaryLabel={(item) =>
                      `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`
                    }
                    emptyText="No equipment recorded yet."
                    addButtonLabel="Add Item"
                    onAdd={handleEquipmentAdd}
                    onUpdate={handleEquipmentUpdate}
                    onRemove={handleEquipmentRemove}
                  />
                </section>

                <section className="character-sheet__section">
                  <EditableItemList
                    title="Feats"
                    items={sheet.feats ?? []}
                    getItemId={(item) => item.index}
                    fields={[
                      {
                        key: "name",
                        type: "text",
                        placeholder: "Feat name (e.g. Shield Master)",
                      },
                      {
                        key: "description",
                        type: "textarea",
                        placeholder:
                          "Description (optional) - one line per bullet point",
                      },
                    ]}
                    emptyText="No feats yet."
                    addButtonLabel="Add Feat"
                    onAdd={handleFeatAdd}
                    onUpdate={handleFeatUpdate}
                    onRemove={handleFeatRemove}
                  />
                </section>

                <section className="character-sheet__section">
                  <h2 className="character-sheet__section-title">
                    Spell Slots
                  </h2>

                  <ul className="character-sheet__spell-slots-grid">
                    {getSpellSlots(sheet.spellcasting).map((slot) => (
                      <li
                        className="character-sheet__spell-slot-card"
                        key={slot.level}
                      >
                        <span className="character-sheet__spell-slot-label">
                          Level {slot.level}
                        </span>
                        <span className="character-sheet__spell-slot-count">
                          <input
                            type="number"
                            className="character-sheet__hp-input character-sheet__hp-input--tiny"
                            value={slot.current}
                            onChange={(e) =>
                              handleSpellSlotChange(
                                slot.level,
                                "current",
                                e.target.value,
                              )
                            }
                            min={0}
                            max={slot.max}
                          />
                          {" / "}
                          <input
                            type="number"
                            className="character-sheet__hp-input character-sheet__hp-input--tiny"
                            value={slot.max}
                            onChange={(e) =>
                              handleSpellSlotChange(
                                slot.level,
                                "max",
                                e.target.value,
                              )
                            }
                            min={0}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <EditableItemList
                  title="Spells"
                  items={[
                    ...(sheet.spellcasting?.cantripsKnown ?? []),
                    ...(sheet.spellcasting?.spellsKnown ?? []),
                  ].sort((a, b) => (a.level ?? 0) - (b.level ?? 0))}
                  getItemId={(item) => item.index}
                  fields={[
                    {
                      key: "name",
                      type: "text",
                      placeholder: "Spell name (e.g. Bless)",
                    },
                    {
                      key: "level",
                      type: "select",
                      defaultValue: "0",
                      options: [
                        { value: "0", label: "Cantrip" },
                        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => ({
                          value: String(lvl),
                          label: `Level ${lvl}`,
                        })),
                      ],
                    },
                    {
                      key: "notes",
                      type: "textarea",
                      placeholder:
                        "Notes (optional) - one line per bullet point",
                    },
                  ]}
                  emptyText="No spells recorded yet."
                  addButtonLabel="Add Spell"
                  onAdd={handleSpellAdd}
                  onUpdate={handleSpellUpdate}
                  onRemove={handleSpellRemove}
                  extraRowContent={(spell) => (
                    <span className="character-sheet__resource-reset">
                      {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}
                    </span>
                  )}
                />

                <section className="character-sheet__section">
                  <h2 className="character-sheet__section-title">Companion</h2>
                  <textarea
                    className="character-sheet__textarea"
                    value={sheet.companion ?? ""}
                    onChange={(e) => handleCompanionChange(e.target.value)}
                    placeholder="Mount or companion - name, description, stats, anything you want to remember"
                    rows={3}
                  />
                </section>

                <section className="character-sheet__section">
                  <h2 className="character-sheet__section-title">Notes</h2>
                  <textarea
                    className="character-sheet__textarea"
                    value={sheet.notes ?? ""}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Anything you want to remember"
                    rows={4}
                  />
                </section>
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
