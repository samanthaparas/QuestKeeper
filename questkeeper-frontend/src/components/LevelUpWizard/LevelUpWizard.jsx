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
  formatModifier,
  getProficiencyBonus,
} from "../../utils/characterSheet";

import {
  getFeats,
  getFeatDetails,
  getClassSpells,
  getClassDetails,
  getSubclassDetails,
  getSpellDetails,
} from "../../utils/api";
import "./LevelUpWizard.css";
import Button from "../Button/Button";

function LevelUpWizard({ sheet, onComplete, onCancel }) {
  const targetLevel = sheet.level + 1;
  const hitDie = sheet.class?.hitDie ?? 8;
  const conModifier = getAbilityModifier(sheet.abilityScores.constitution);

  const [pendingLevelUp, setPendingLevelUp] = useState(() =>
    createPendingLevelUp(
      targetLevel,
      getLevelUpStepKeys(targetLevel, sheet.class),
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

  const [classSubclass, setClassSubclass] = useState(null);
  const [isSubclassLoading, setIsSubclassLoading] = useState(true);
  const [subclassError, setSubclassError] = useState("");

  const [classSpells, setClassSpells] = useState([]);
  const [isSpellsLoading, setIsSpellsLoading] = useState(true);
  const [spellsError, setSpellsError] = useState("");
  const [selectedSpellIndex, setSelectedSpellIndex] = useState("");
  const [selectedSpellDetails, setSelectedSpellDetails] = useState(null);

  const currentStep = pendingLevelUp.steps[stepIndex];

  const isAsiValid =
    (asiMode === "asi-one" && asiAbility) ||
    (asiMode === "asi-two" && asiAbilities.length === 2) ||
    (asiMode === "feat" && Boolean(featDetails));

  const maxSpellLevel = Math.min(9, Math.ceil(targetLevel / 2));
  const knownSpellIndexes = new Set([
    ...(sheet.spellcasting?.cantripsKnown ?? []).map((s) => s.index),
    ...(sheet.spellcasting?.spellsKnown ?? []).map((s) => s.index),
  ]);
  const availableSpells = classSpells.filter(
    (spell) =>
      spell.level <= maxSpellLevel && !knownSpellIndexes.has(spell.index),
  );

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

  useEffect(() => {
    if (currentStep?.key !== "subclass") return;

    getClassDetails(sheet.class.id)
      .then((classData) => {
        const entry = classData.subclasses?.[0];
        if (!entry) throw new Error("No subclass available");
        return getSubclassDetails(entry.index);
      })
      .then(setClassSubclass)
      .catch(() =>
        setSubclassError(
          "Unable to load subclass details. Please try again later.",
        ),
      )
      .finally(() => setIsSubclassLoading(false));
  }, [currentStep?.key, sheet.class]);

  useEffect(() => {
    Promise.all([getFeats(), getFeats("2024")])
      .then(([legacy, updated]) => setAllFeats([...legacy, ...updated]))
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

  function confirmSpell() {
    if (!selectedSpellIndex) {
      completeStep(null);
      return;
    }

    const spell = classSpells.find((s) => s.index === selectedSpellIndex);
    completeStep({
      spellIndex: spell.index,
      spellName: spell.name,
      spellLevel: spell.level,
    });
  }

  function describeStepChoice(step) {
    if (step.key === "hitPoints") {
      const total = Math.max(1, step.data.amount + conModifier);
      return `Hit Points: +${total} (${step.data.amount} rolled/taken + ${conModifier} CON)`;
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

    if (step.key === "spells") {
      return step.data
        ? `New Spell: ${step.data.spellName}`
        : "No new spell learned";
    }

    return null;
  }

  function handleFinish() {
    const finished = finalizeLevelUp({
      ...sheet,
      pendingLevelUp: { ...pendingLevelUp, status: "complete" },
    });
    onComplete(finished);
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
            each, increase one ability by +2, or take a feat.
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
              {ABILITY_SCORES.map((ability) => (
                <label
                  className="level-up-wizard__ability-checkbox"
                  key={ability}
                >
                  <input
                    type="checkbox"
                    checked={asiAbilities.includes(ability)}
                    disabled={
                      !asiAbilities.includes(ability) &&
                      asiAbilities.length >= 2
                    }
                    onChange={() => toggleAsiAbility(ability)}
                  />
                  <span className="level-up-wizard__ability-checkbox-text">
                    <span className="level-up-wizard__ability-checkbox-name">
                      {ABILITY_LABELS[ability]}
                    </span>
                    <span className="level-up-wizard__ability-checkbox-hint">
                      {ABILITY_DESCRIPTIONS[ability]}
                    </span>
                  </span>
                </label>
              ))}
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
                {ABILITY_SCORES.map((ability) => (
                  <option key={ability} value={ability}>
                    {ABILITY_LABELS[ability]}
                  </option>
                ))}
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
                    {feat.name} ({feat.edition} SRD)
                  </option>
                ))}
              </select>

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
            At level {targetLevel}, {sheet.class?.name ?? "your class"} gains a
            subclass that shapes how you play. SRD 2014 only includes one
            subclass per class, so there's nothing to pick between — review it
            below.
          </p>

          {isSubclassLoading && <p>Loading subclass...</p>}
          {subclassError && (
            <p className="level-up-wizard__error">{subclassError}</p>
          )}

          {classSubclass && (
            <div className="level-up-wizard__feat-card">
              <h4>{classSubclass.name}</h4>
              <p>
                <em>{classSubclass.subclass_flavor}</em>
              </p>
              {classSubclass.desc?.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          )}

          <Button
            disabled={!classSubclass}
            onClick={() =>
              completeStep({
                id: classSubclass.index,
                name: classSubclass.name,
                flavor: classSubclass.subclass_flavor,
              })
            }
          >
            Next
          </Button>
        </div>
      )}

      {currentStep?.key === "spells" && (
        <div className="level-up-wizard__step">
          <h3 className="level-up-wizard__step-title">Learn a New Spell</h3>
          <p className="level-up-wizard__step-description">
            Pick one new spell {sheet.name} learns at level {targetLevel}.
          </p>

          {isSpellsLoading && <p>Loading spell list...</p>}
          {spellsError && (
            <p className="level-up-wizard__error">{spellsError}</p>
          )}

          {!isSpellsLoading && !spellsError && availableSpells.length > 0 && (
            <select
              className="level-up-wizard__spell-select"
              value={selectedSpellIndex}
              onChange={(e) => setSelectedSpellIndex(e.target.value)}
            >
              <option value="">Choose a spell</option>
              {availableSpells.map((spell) => (
                <option key={spell.index} value={spell.index}>
                  {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`} —{" "}
                  {spell.name}
                </option>
              ))}
            </select>
          )}

          {selectedSpellIndex && (
            <div className="level-up-wizard__feat-card">
              {isSpellDetailLoading && <p>Loading spell details...</p>}
              {selectedSpellDetails && (
                <>
                  <h4>{selectedSpellDetails.name}</h4>
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

          {!isSpellsLoading && !spellsError && availableSpells.length === 0 && (
            <p className="level-up-wizard__step-description">
              {sheet.name} already knows every spell available at this level.
              Nothing new to learn this time.
            </p>
          )}

          <Button
            disabled={availableSpells.length > 0 && !selectedSpellIndex}
            onClick={confirmSpell}
          >
            Next
          </Button>
        </div>
      )}

      {!currentStep && (
        <div className="level-up-wizard__step">
          <h3 className="level-up-wizard__step-title">
            Review Level {targetLevel}
          </h3>
          <p className="level-up-wizard__step-description">
            Double-check these choices for {sheet.name} before finishing. Not
            right? Use Cancel below to discard this level-up and start over.
          </p>

          <ul className="level-up-wizard__review-list">
            {pendingLevelUp.steps.map((step) => (
              <li key={step.key}>{describeStepChoice(step)}</li>
            ))}
          </ul>

          <Button onClick={handleFinish}>Confirm &amp; Finish Level Up</Button>
        </div>
      )}
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

export default LevelUpWizard;
