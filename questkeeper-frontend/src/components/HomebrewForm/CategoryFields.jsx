// The part of the homebrew form that changes with the category.
// Each section edits `data` and hands the whole new object to onChange.

import { SIZES, CLASS_IDS } from "../../utils/homebrewMappers";
import { SKILLS } from "../../utils/characterSheet";
import {
  NumberField,
  AbilityBonusFields,
  AbilityChoiceField,
  SkillChecks,
  NamedListField,
} from "./HomebrewFields";

const SKILL_NAMES = Object.fromEntries(SKILLS.map((skill) => [skill.index, skill.name]));

function TextField({ id, label, value, onChange, placeholder, hint, maxLength = 200 }) {
  return (
    <label className="homebrew-form__field" htmlFor={id}>
      <span className="homebrew-form__label">{label}</span>
      <input
        id={id}
        className="homebrew-form__input"
        placeholder={placeholder}
        maxLength={maxLength}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && <span className="homebrew-form__hint">{hint}</span>}
    </label>
  );
}

function LanguageFields({ data, set }) {
  return (
    <div className="homebrew-form__row">
      <TextField
        id="homebrew-languages"
        label="Languages it always knows"
        placeholder="Common, Elvish"
        hint="Separate with commas."
        value={data.languages}
        onChange={(languages) => set({ languages })}
      />
      <NumberField
        id="homebrew-language-choices"
        label="Extra languages to pick"
        min={0}
        max={5}
        value={data.languageChoices}
        onChange={(languageChoices) => set({ languageChoices })}
      />
    </div>
  );
}

function RaceFields({ data, set }) {
  return (
    <>
      <div className="homebrew-form__row">
        <NumberField
          id="homebrew-speed"
          label="Walking speed (feet)"
          min={0}
          max={120}
          value={data.speed}
          onChange={(speed) => set({ speed })}
        />
        <label className="homebrew-form__field" htmlFor="homebrew-size">
          <span className="homebrew-form__label">Size</span>
          <select
            id="homebrew-size"
            className="homebrew-form__input"
            value={data.size}
            onChange={(event) => set({ size: event.target.value })}
          >
            {SIZES.map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      <AbilityBonusFields
        idPrefix="homebrew-race"
        value={data.abilityBonuses}
        onChange={(abilityBonuses) => set({ abilityBonuses })}
      />
      <AbilityChoiceField
        idPrefix="homebrew-race"
        value={data.abilityChoice}
        onChange={(abilityChoice) => set({ abilityChoice })}
      />
      <LanguageFields data={data} set={set} />
      <NamedListField
        idPrefix="homebrew-trait"
        label="Traits"
        items={data.traits}
        onChange={(traits) => set({ traits })}
        addLabel="Add a trait"
        namePlaceholder="Trait name (e.g. Darkvision)"
      />
    </>
  );
}

// raceOptions: every race a subrace can belong to ({ index, name, source }).
function SubraceFields({ data, set, raceOptions }) {
  return (
    <>
      <label className="homebrew-form__field" htmlFor="homebrew-parent-race">
        <span className="homebrew-form__label">Which race is this a subrace of?</span>
        <select
          id="homebrew-parent-race"
          className="homebrew-form__input"
          value={data.parentRace}
          onChange={(event) => {
            const race = raceOptions.find((option) => option.index === event.target.value);
            set({ parentRace: race?.index ?? "", parentRaceName: race?.name ?? "" });
          }}
        >
          <option value="">Choose a race</option>
          {raceOptions.map((race) => (
            <option key={race.index} value={race.index}>
              {race.name}
              {race.source ? ` (${race.source})` : ""}
            </option>
          ))}
        </select>
      </label>

      <AbilityBonusFields
        idPrefix="homebrew-subrace"
        value={data.abilityBonuses}
        onChange={(abilityBonuses) => set({ abilityBonuses })}
      />
      <AbilityChoiceField
        idPrefix="homebrew-subrace"
        value={data.abilityChoice}
        onChange={(abilityChoice) => set({ abilityChoice })}
      />
      <NamedListField
        idPrefix="homebrew-trait"
        label="Traits"
        items={data.traits}
        onChange={(traits) => set({ traits })}
        addLabel="Add a trait"
        namePlaceholder="Trait name"
      />
    </>
  );
}

function BackgroundFields({ data, set }) {
  const choice = data.skillChoice;

  return (
    <>
      <fieldset className="homebrew-form__group">
        <legend className="homebrew-form__label">Skills it always gives (up to 4)</legend>
        <SkillChecks value={data.skills} onChange={(skills) => set({ skills })} />
      </fieldset>

      {/* Optional "pick 1 of these" skill, like an Innkeeper's. */}
      <fieldset className="homebrew-form__group">
        <label className="homebrew-form__check">
          <input
            type="checkbox"
            checked={Boolean(choice)}
            onChange={() =>
              set({ skillChoice: choice ? null : { choose: 1, from: [] } })
            }
          />
          The player also picks a skill from a list
        </label>
        {choice && (
          <>
            <NumberField
              id="homebrew-skill-choice-count"
              label="How many"
              min={1}
              max={4}
              value={choice.choose}
              onChange={(choose) => set({ skillChoice: { ...choice, choose } })}
            />
            <p className="homebrew-form__hint">
              Pick from:{" "}
              {choice.from.length > 0
                ? choice.from.map((skill) => SKILL_NAMES[skill]).join(", ")
                : "tick at least one skill below"}
            </p>
            <SkillChecks
              value={choice.from}
              disabledSkills={data.skills}
              onChange={(from) => set({ skillChoice: { ...choice, from } })}
            />
          </>
        )}
      </fieldset>

      <LanguageFields data={data} set={set} />
      <TextField
        id="homebrew-tools"
        label="Tool proficiencies"
        placeholder="e.g. Brewer's supplies"
        maxLength={500}
        value={data.tools}
        onChange={(tools) => set({ tools })}
      />
      <TextField
        id="homebrew-equipment"
        label="Starting gear"
        placeholder="e.g. An apron, a tankard, and 10 gp"
        hint="Goes in the character's notes."
        maxLength={1000}
        value={data.equipment}
        onChange={(equipment) => set({ equipment })}
      />

      <fieldset className="homebrew-form__group">
        <legend className="homebrew-form__label">Background feature (optional)</legend>
        <input
          className="homebrew-form__input"
          aria-label="Feature name"
          placeholder="Feature name"
          maxLength={80}
          value={data.feature?.name ?? ""}
          onChange={(event) =>
            set({ feature: { ...data.feature, name: event.target.value } })
          }
        />
        <textarea
          className="homebrew-form__textarea"
          aria-label="Feature description"
          placeholder="What it does, in your own words"
          maxLength={2000}
          rows={3}
          value={data.feature?.description ?? ""}
          onChange={(event) =>
            set({ feature: { ...data.feature, description: event.target.value } })
          }
        />
      </fieldset>
    </>
  );
}

function SubclassFields({ data, set }) {
  return (
    <>
      <label className="homebrew-form__field" htmlFor="homebrew-parent-class">
        <span className="homebrew-form__label">Which class is this for?</span>
        <select
          id="homebrew-parent-class"
          className="homebrew-form__input"
          value={data.parentClass}
          onChange={(event) => set({ parentClass: event.target.value })}
        >
          <option value="">Choose a class</option>
          {CLASS_IDS.map((id) => (
            <option key={id} value={id}>
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <NamedListField
        idPrefix="homebrew-feature"
        label="Features"
        items={data.features}
        withLevel
        onChange={(features) => set({ features })}
        addLabel="Add a feature"
        namePlaceholder="Feature name"
      />
    </>
  );
}

const SECTIONS = {
  race: RaceFields,
  subrace: SubraceFields,
  background: BackgroundFields,
  subclass: SubclassFields,
};

function CategoryFields({ category, data, onChange, raceOptions = [] }) {
  const Section = SECTIONS[category];
  // Merge one change into the rest of the data.
  const set = (changes) => onChange({ ...data, ...changes });
  return Section ? <Section data={data} set={set} raceOptions={raceOptions} /> : null;
}

export default CategoryFields;
