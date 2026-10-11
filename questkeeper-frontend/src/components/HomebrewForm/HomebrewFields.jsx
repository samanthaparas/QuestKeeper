// Small building blocks for the homebrew form. Each takes a value and an
// onChange, so the form keeps all its state in one place.

import { ABILITY_KEYS } from "../../utils/homebrewMappers";
import { SKILLS } from "../../utils/characterSheet";

const ABILITY_NAMES = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

// Adds or removes one value from a list (for checkbox groups).
function toggle(list = [], value) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

// A labelled number box. Empty stays empty while typing; cleaning happens on save.
export function NumberField({ id, label, value, min, max, onChange, hint }) {
  return (
    <label className="homebrew-form__field homebrew-form__field--number" htmlFor={id}>
      <span className="homebrew-form__label">{label}</span>
      <input
        id={id}
        className="homebrew-form__input"
        type="number"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : Number(event.target.value))
        }
      />
      {hint && <span className="homebrew-form__hint">{hint}</span>}
    </label>
  );
}

// Fixed bonuses: one small box per ability (+2 DEX, +1 WIS...).
export function AbilityBonusFields({ idPrefix, value = {}, onChange }) {
  return (
    <fieldset className="homebrew-form__group">
      <legend className="homebrew-form__label">
        Fixed ability bonuses (leave the rest at 0)
      </legend>
      <div className="homebrew-form__ability-grid">
        {ABILITY_KEYS.map((key) => (
          <NumberField
            key={key}
            id={`${idPrefix}-bonus-${key}`}
            label={ABILITY_NAMES[key]}
            min={-2}
            max={3}
            value={value[key] ?? 0}
            onChange={(bonus) => onChange({ ...value, [key]: bonus })}
          />
        ))}
      </div>
    </fieldset>
  );
}

// "Pick N abilities to raise by X", like a Half-Elf. Off unless ticked.
export function AbilityChoiceField({ idPrefix, value, onChange }) {
  const isOn = Boolean(value);
  const choice = value ?? { choose: 1, bonus: 1, from: [...ABILITY_KEYS] };

  return (
    <fieldset className="homebrew-form__group">
      <label className="homebrew-form__check">
        <input
          type="checkbox"
          checked={isOn}
          onChange={() =>
            onChange(isOn ? null : { choose: 1, bonus: 1, from: [...ABILITY_KEYS] })
          }
        />
        The player also picks abilities to raise
      </label>

      {isOn && (
        <>
          <div className="homebrew-form__row">
            <NumberField
              id={`${idPrefix}-choice-count`}
              label="How many"
              min={1}
              max={6}
              value={choice.choose}
              onChange={(choose) => onChange({ ...choice, choose })}
            />
            <NumberField
              id={`${idPrefix}-choice-bonus`}
              label="By how much"
              min={1}
              max={3}
              value={choice.bonus}
              onChange={(bonus) => onChange({ ...choice, bonus })}
            />
          </div>
          <p className="homebrew-form__hint">Which abilities can they pick?</p>
          <div className="homebrew-form__checks">
            {ABILITY_KEYS.map((key) => (
              <label className="homebrew-form__check" key={key}>
                <input
                  type="checkbox"
                  checked={choice.from.includes(key)}
                  onChange={() =>
                    onChange({ ...choice, from: toggle(choice.from, key) })
                  }
                />
                {ABILITY_NAMES[key]}
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}

// Skill checkboxes, e.g. the skills a background grants.
export function SkillChecks({ value = [], onChange, disabledSkills = [] }) {
  return (
    <div className="homebrew-form__checks">
      {SKILLS.map((skill) => (
        <label className="homebrew-form__check" key={skill.index}>
          <input
            type="checkbox"
            checked={value.includes(skill.index)}
            disabled={disabledSkills.includes(skill.index)}
            onChange={() => onChange(toggle(value, skill.index))}
          />
          {skill.name}
        </label>
      ))}
    </div>
  );
}

// Rows of "name + description" (traits), optionally with a level (features).
// Players add and remove rows as needed.
export function NamedListField({
  idPrefix,
  label,
  items = [],
  onChange,
  withLevel = false,
  addLabel,
  namePlaceholder,
}) {
  function update(index, changes) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  }

  return (
    <fieldset className="homebrew-form__group">
      <legend className="homebrew-form__label">{label}</legend>

      {items.map((item, index) => (
        <div className="homebrew-form__list-item" key={index}>
          <div className="homebrew-form__row">
            <input
              className="homebrew-form__input homebrew-form__input--grow"
              aria-label={`${label} ${index + 1} name`}
              placeholder={namePlaceholder}
              maxLength={80}
              value={item.name}
              onChange={(event) => update(index, { name: event.target.value })}
            />
            {withLevel && (
              <NumberField
                id={`${idPrefix}-${index}-level`}
                label="Level"
                min={1}
                max={20}
                value={item.level}
                onChange={(level) => update(index, { level })}
              />
            )}
            <button
              type="button"
              className="homebrew-form__remove"
              aria-label={`Remove ${item.name || `${label} ${index + 1}`}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          <textarea
            className="homebrew-form__textarea"
            aria-label={`${label} ${index + 1} description`}
            placeholder="What it does, in your own words"
            maxLength={2000}
            rows={3}
            value={item.description}
            onChange={(event) => update(index, { description: event.target.value })}
          />
        </div>
      ))}

      <button
        type="button"
        className="homebrew-form__add"
        onClick={() =>
          onChange([
            ...items,
            withLevel
              ? { name: "", level: items.at(-1)?.level ?? 3, description: "" }
              : { name: "", description: "" },
          ])
        }
      >
        {addLabel}
      </button>
    </fieldset>
  );
}
