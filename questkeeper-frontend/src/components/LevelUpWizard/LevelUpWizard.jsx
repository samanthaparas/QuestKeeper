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
} from "../../utils/characterSheet";

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
import { mapSubclassToPanel } from "../../utils/srdDetails";
import { isHomebrewId, toHomebrewIndex } from "../../utils/homebrewMappers";
import { OFFICIAL_BOOKS_GROUP } from "../../utils/bookBackgrounds";

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
