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
        Ability score bonuses everyone gets (leave the rest at 0)
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
        Let players choose some ability bonuses themselves
      </label>
      <p className="homebrew-form__hint">
        For options like the Half-Elf, where players add +1 to two abilities
        of their choice. Leave this off if every bonus is set above.
      </p>

      {isOn && (
        <>
          <div className="homebrew-form__row">
            <NumberField
              id={`${idPrefix}-choice-count`}
              label="How many abilities"
              min={1}
              max={6}
              value={choice.choose}
              onChange={(choose) => onChange({ ...choice, choose })}
            />
            <NumberField
              id={`${idPrefix}-choice-bonus`}
              label="Bonus to each"
              min={1}
              max={3}
              value={choice.bonus}
              onChange={(bonus) => onChange({ ...choice, bonus })}
            />
          </div>
          {/* The choice in one plain sentence, as players will see it. */}
          <p className="homebrew-form__hint">
            Players choose {choice.choose} {choice.choose === 1 ? "ability" : "abilities"} and
            add +{choice.bonus} to {choice.choose === 1 ? "it" : "each"}. Which can they choose from?
          </p>
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
  // Subclass features: an optional "damage by level" list under each one.
  withDamage = false,
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
          {withDamage && (
            <FeatureDamageField
              idPrefix={`${idPrefix}-${index}`}
              featureName={item.name || `${label} ${index + 1}`}
              item={item}
              onChange={(changes) => update(index, changes)}
            />
          )}
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

// Extra damage a feature does, growing with class level (1d4 psychic from
// level 3, 1d6 from 11), and when it applies. The sheet shows the dice for
// the character's level with a roll button; it's never added to attacks.
function FeatureDamageField({ idPrefix, featureName, item, onChange }) {
  const rows = item.damage ?? [];
  function updateRow(index, changes) {
    onChange({ damage: rows.map((row, i) => (i === index ? { ...row, ...changes } : row)) });
  }
  return (
    <div className="homebrew-form__damage">
      {rows.map((row, index) => (
        <div className="homebrew-form__row homebrew-form__row--sub" key={index}>
          <NumberField
            id={`${idPrefix}-damage-${index}-level`}
            label="From level"
            min={1}
            max={20}
            value={row.level}
            onChange={(level) => updateRow(index, { level })}
          />
          <input
            className="homebrew-form__input"
            aria-label={`${featureName} damage ${index + 1} dice`}
            placeholder="Dice, e.g. 1d4"
            maxLength={20}
            value={row.dice ?? ""}
            onChange={(event) => updateRow(index, { dice: event.target.value })}
          />
          <input
            className="homebrew-form__input"
            aria-label={`${featureName} damage ${index + 1} type`}
            placeholder="Type, e.g. psychic"
            maxLength={30}
            value={row.type ?? ""}
            onChange={(event) => updateRow(index, { type: event.target.value })}
          />
          <button
            type="button"
            className="homebrew-form__remove"
            aria-label={`Remove ${featureName} damage ${index + 1}`}
            onClick={() => onChange({ damage: rows.filter((_, i) => i !== index) })}
          >
            Remove
          </button>
        </div>
      ))}
      {rows.length > 0 && (
        <input
          className="homebrew-form__input homebrew-form__input--grow"
          aria-label={`${featureName} damage: when it applies`}
          placeholder="When it applies, e.g. once per creature per turn (optional)"
          maxLength={200}
          value={item.damageNote ?? ""}
          onChange={(event) => onChange({ damageNote: event.target.value })}
        />
      )}
      <button
        type="button"
        className="homebrew-form__add homebrew-form__add--small"
        aria-label={`${rows.length ? "Add a damage step to" : "Add extra damage to"} ${featureName}`}
        onClick={() =>
          onChange({
            damage: [
              ...rows,
              { level: rows.at(-1)?.level ?? item.level ?? 1, dice: "", type: rows.at(-1)?.type ?? "" },
            ],
          })
        }
      >
        {rows.length ? "Add a damage step" : "Add extra damage (optional)"}
      </button>
    </div>
  );
}
