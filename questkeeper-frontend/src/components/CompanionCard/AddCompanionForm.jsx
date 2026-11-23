import { useEffect, useRef, useState } from "react";
import Button from "../Button/Button";
import CompanionIcon from "../CompanionIcon/CompanionIcon";
import { focusInPane } from "../../utils/focusInPane";
import { ABILITY_ABBREVIATIONS, ABILITY_SCORES, SUMMON_TEMPLATES, companionFromDraft } from "../../utils/characterSheet";

// "+ Add companion" on the Actions tab. Instead of saving an empty card
// straight away, it first asks "Who are you adding?":
// - A pet, mount, familiar or other companion: type its stats (name and the
//   main numbers first; ability scores, a first attack and notes are
//   optional and can be added later on its card).
// - A summoned creature: the spells QuestKeeper works out for you (Summon
//   Fey today). Other summon spells use typed stats, and it says so.
// Everything is a draft until "Add companion": Cancel throws it away, so a
// cancelled setup never leaves a blank card on the sheet. A picture is
// added on the card afterwards (so no picture is uploaded for a companion
// that's then cancelled).
//
// onAdd(creature, link): creature is the new companion; link is
// { template, attackName } for a summon (or null).

const blankDraft = () => ({
  name: "",
  maxHp: "",
  armorClass: "",
  speed: "",
  scores: {},
  attackName: "",
  attackToHit: "",
  attackDamage: "",
  attackType: "",
  notes: "",
  summonTemplate: Object.keys(SUMMON_TEMPLATES)[0],
  summonAttackName: "",
});

function Field({ label, children, hint = "" }) {
  return (
    <label className="add-companion__field">
      <span className="add-companion__label">{label}</span>
      {children}
      {hint && <span className="add-companion__hint">{hint}</span>}
    </label>
  );
}

function AddCompanionForm({ onAdd, onCancel }) {
  const [step, setStep] = useState("choose");
  const [draft, setDraft] = useState(blankDraft);
  const [nameError, setNameError] = useState("");
  const headingRef = useRef(null);
  const nameRef = useRef(null);
  const templates = Object.values(SUMMON_TEMPLATES);
  const template = SUMMON_TEMPLATES[draft.summonTemplate] ?? templates[0];

  // Each step starts with its heading focused, so a keyboard or screen
  // reader user hears where they are.
  useEffect(() => {
    focusInPane(headingRef.current);
  }, [step]);

  const set = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const setScore = (ability) => (event) =>
    setDraft((current) => ({ ...current, scores: { ...current.scores, [ability]: event.target.value } }));

  function submit(event) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setNameError("Give it a name first.");
      focusInPane(nameRef.current);
      return;
    }
    if (step === "summon") {
      onAdd(
        { ...companionFromDraft({ ...blankDraft(), name: draft.name, notes: draft.notes }) },
        { template: template.key, attackName: draft.summonAttackName.trim() },
      );
      return;
    }
    onAdd(companionFromDraft(draft), null);
  }

  const nameField = (placeholder) => (
    <div className="add-companion__field">
    <Field label="Name">
      <input
        ref={nameRef}
        type="text"
        className="add-companion__input add-companion__input--wide"
        value={draft.name}
        placeholder={placeholder}
        aria-invalid={nameError ? true : undefined}
        aria-describedby={nameError ? "add-companion-name-error" : undefined}
        onChange={(event) => {
          setNameError("");
          set("name")(event);
        }}
      />
    </Field>
      {/* Outside the label, so the box's name stays "Name". */}
      {nameError && (
        <span className="add-companion__error" id="add-companion-name-error" role="alert">
          {nameError}
        </span>
      )}
    </div>
  );

  if (step === "choose") {
    return (
      <div className="add-companion" role="group" aria-labelledby="add-companion-title">
        <h3 className="add-companion__title" id="add-companion-title" ref={headingRef} tabIndex={-1}>
          Who are you adding?
        </h3>
        <div className="add-companion__choices">
          <button type="button" className="add-companion__choice" onClick={() => setStep("manual")}>
            <CompanionIcon name="companion-paw" size={24} />
            <span className="add-companion__choice-text">
              <span className="add-companion__choice-title">Pet, mount, familiar or other companion</span>
              <span className="add-companion__choice-detail">You enter its stats from its stat block.</span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
          <button type="button" className="add-companion__choice" onClick={() => setStep("summon")}>
            <CompanionIcon name="summon-spark" size={24} />
            <span className="add-companion__choice-text">
              <span className="add-companion__choice-title">Summoned creature</span>
              <span className="add-companion__choice-detail">
                For {templates.map((item) => item.spell).join(" or ")}: its HP, AC and attacks are worked out for you.
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        </div>
        <p className="add-companion__note">
          Other summon spells, and features that give you a familiar or companion, aren&apos;t worked out for you yet:
          choose the first option and enter their stats.
        </p>
        <div className="add-companion__actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="add-companion" aria-labelledby="add-companion-title" onSubmit={submit} noValidate>
      <h3 className="add-companion__title" id="add-companion-title" ref={headingRef} tabIndex={-1}>
        <CompanionIcon name={step === "summon" ? "summon-spark" : "companion-paw"} size={22} />
        {step === "summon" ? "Add a summoned creature" : "Add a pet, mount or familiar"}
      </h3>

      {step === "summon" ? (
        <>
          <div className="add-companion__row">
            {nameField("e.g. Fable")}
            {templates.length > 1 ? (
              <Field label="Summon spell">
                <select className="add-companion__input" value={draft.summonTemplate} onChange={set("summonTemplate")}>
                  {templates.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.spell}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <p className="add-companion__fixed">
                <span className="add-companion__label">Summon spell</span>
                {template.spell}
              </p>
            )}
            <Field label="Attack name (optional)" hint={`Its numbers stay the spell's. Blank: ${template.attackName}.`}>
              <input
                type="text"
                className="add-companion__input"
                value={draft.summonAttackName}
                placeholder={template.attackName}
                onChange={set("summonAttackName")}
              />
            </Field>
          </div>
          <p className="add-companion__note">
            Its HP, AC and attacks are worked out from the spell level when you cast it. It starts not summoned:
            tap <strong>Prepare summon</strong> on its card when you cast {template.spell}.
          </p>
        </>
      ) : (
        <>
          <div className="add-companion__row">
            {nameField("e.g. Victory")}
            <Field label="Max HP">
              <input type="number" min={0} className="add-companion__input" value={draft.maxHp} onChange={set("maxHp")} />
            </Field>
            <Field label="AC">
              <input
                type="number"
                min={0}
                className="add-companion__input"
                value={draft.armorClass}
                placeholder="10"
                onChange={set("armorClass")}
              />
            </Field>
            <Field label="Speed (ft)">
              <input
                type="number"
                min={0}
                className="add-companion__input"
                value={draft.speed}
                placeholder="30"
                onChange={set("speed")}
              />
            </Field>
          </div>

          <fieldset className="add-companion__group">
            <legend>Ability scores (optional, 10 if left blank)</legend>
            <div className="add-companion__row add-companion__row--scores">
              {ABILITY_SCORES.map((ability) => (
                <Field key={ability} label={ABILITY_ABBREVIATIONS[ability]}>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className="add-companion__input add-companion__input--score"
                    value={draft.scores[ability] ?? ""}
                    placeholder="10"
                    onChange={setScore(ability)}
                  />
                </Field>
              ))}
            </div>
          </fieldset>

          <fieldset className="add-companion__group">
            <legend>First attack (optional, more can be added on its card)</legend>
            <div className="add-companion__row">
              <Field label="Attack">
                <input
                  type="text"
                  className="add-companion__input"
                  value={draft.attackName}
                  placeholder="Bite"
                  onChange={set("attackName")}
                />
              </Field>
              <Field label="To hit">
                <input
                  type="number"
                  className="add-companion__input add-companion__input--score"
                  value={draft.attackToHit}
                  placeholder="+4"
                  onChange={set("attackToHit")}
                />
              </Field>
              <Field label="Damage">
                <input
                  type="text"
                  className="add-companion__input"
                  value={draft.attackDamage}
                  placeholder="2d4+2"
                  onChange={set("attackDamage")}
                />
              </Field>
              <Field label="Type">
                <input
                  type="text"
                  className="add-companion__input"
                  value={draft.attackType}
                  placeholder="piercing"
                  onChange={set("attackType")}
                />
              </Field>
            </div>
          </fieldset>
        </>
      )}

      <Field label="Notes (optional, one per line)">
        <textarea
          className="add-companion__input add-companion__input--wide"
          rows={2}
          value={draft.notes}
          placeholder="Knows the Help action"
          onChange={set("notes")}
        />
      </Field>
      <p className="add-companion__note">You can add a picture on its card once it&apos;s added.</p>

      <div className="add-companion__actions">
        <Button type="submit">Add companion</Button>
        <Button variant="secondary" onClick={() => setStep("choose")}>
          Back
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default AddCompanionForm;
