// The part of the homebrew form that changes with the category.
// Each section edits `data` and hands the whole new object to onChange.

import {
  SIZES,
  CLASS_IDS,
  HIT_DICE,
  ABILITY_KEYS,
  CASTER_PROGRESSION_LABELS,
} from "../../utils/homebrewMappers";
import { SKILLS } from "../../utils/characterSheet";
import {
  NumberField,
  AbilityBonusFields,
  AbilityChoiceField,
  SkillChecks,
  NamedListField,
} from "./HomebrewFields";

const SKILL_NAMES = Object.fromEntries(SKILLS.map((skill) => [skill.index, skill.name]));

const ABILITY_NAMES = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);

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
      <SkillGrantFields data={data} set={set} />
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
      <SkillGrantFields data={data} set={set} />
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

// Skills an option always gives, plus an optional "choose N from this list"
// (an Innkeeper picks 1 of 3; a Half-Elf picks any 2). Used by backgrounds,
// races and subraces.
function SkillGrantFields({ data, set }) {
  const choice = data.skillChoice;
  const skills = data.skills ?? [];

  return (
    <>
      <fieldset className="homebrew-form__group">
        <legend className="homebrew-form__label">Skills it always gives (up to 4)</legend>
        <SkillChecks value={skills} onChange={(skills) => set({ skills })} />
      </fieldset>

      {/* Optional "pick N of these" skills, like an Innkeeper's or a Half-Elf's. */}
      <fieldset className="homebrew-form__group">
        <label className="homebrew-form__check">
          <input
            type="checkbox"
            checked={Boolean(choice)}
            onChange={() =>
              set({ skillChoice: choice ? null : { choose: 1, from: [] } })
            }
          />
          Let players choose extra skills from a list
        </label>
        <p className="homebrew-form__hint">
          On top of the skills above, players pick a set number from a list
          you choose (an Innkeeper picks 1 of 3; a Half-Elf picks any 2).
        </p>
        {choice && (
          <>
            <NumberField
              id="homebrew-skill-choice-count"
              label="How many skills they choose"
              min={1}
              max={4}
              value={choice.choose}
              onChange={(choose) => set({ skillChoice: { ...choice, choose } })}
            />
            <p className="homebrew-form__hint">
              Pick from:{" "}
              {choice.from.length === Object.keys(SKILL_NAMES).length
                ? "any skill"
                : choice.from.length > 0
                  ? choice.from.map((skill) => SKILL_NAMES[skill]).join(", ")
                  : "tick at least one skill below"}{" "}
              <button
                type="button"
                className="homebrew-form__link"
                onClick={() =>
                  set({ skillChoice: { ...choice, from: Object.keys(SKILL_NAMES) } })
                }
              >
                Allow any skill
              </button>
            </p>
            <SkillChecks
              value={choice.from}
              disabledSkills={skills}
              onChange={(from) => set({ skillChoice: { ...choice, from } })}
            />
          </>
        )}
      </fieldset>
    </>
  );
}

function BackgroundFields({ data, set }) {
  return (
    <>
      <SkillGrantFields data={data} set={set} />

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

// A whole class: the basics, spellcasting, when it picks a subclass, and its
// features by level.
function ClassFields({ data, set }) {
  const casts = data.progression !== "none";
  const saves = data.savingThrows ?? [];
  const skillChoice = data.skillChoice ?? { choose: 2, from: [] };

  return (
    <>
      <div className="homebrew-form__row">
        <label className="homebrew-form__field" htmlFor="homebrew-hit-die">
          <span className="homebrew-form__label">Hit die</span>
          <select
            id="homebrew-hit-die"
            className="homebrew-form__input"
            value={data.hitDie}
            onChange={(event) => set({ hitDie: Number(event.target.value) })}
          >
            {HIT_DICE.map((die) => (
              <option key={die} value={die}>
                d{die}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="homebrew-form__group">
        <legend className="homebrew-form__label">Saving throws (pick 2)</legend>
        <div className="homebrew-form__checks">
          {ABILITY_KEYS.map((key) => (
            <label className="homebrew-form__check" key={key}>
              <input
                type="checkbox"
                checked={saves.includes(key)}
                // Two at most, like every class.
                disabled={!saves.includes(key) && saves.length >= 2}
                onChange={() =>
                  set({
                    savingThrows: saves.includes(key)
                      ? saves.filter((save) => save !== key)
                      : [...saves, key],
                  })
                }
              />
              {ABILITY_NAMES[key]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="homebrew-form__group">
        <legend className="homebrew-form__label">Skills players choose</legend>
        <NumberField
          id="homebrew-class-skill-count"
          label="How many skills they choose"
          min={0}
          max={4}
          value={skillChoice.choose}
          onChange={(choose) => set({ skillChoice: { ...skillChoice, choose } })}
        />
        <p className="homebrew-form__hint">
          Choose from:{" "}
          {skillChoice.from.length > 0
            ? skillChoice.from.map((skill) => SKILL_NAMES[skill]).join(", ")
            : "tick the skills below"}
        </p>
        <SkillChecks
          value={skillChoice.from}
          onChange={(from) => set({ skillChoice: { ...skillChoice, from } })}
        />
      </fieldset>

      <div className="homebrew-form__row">
        <TextField
          id="homebrew-class-armor"
          label="Armor"
          placeholder="Light armor, medium armor, shields"
          value={data.armor}
          onChange={(armor) => set({ armor })}
        />
        <TextField
          id="homebrew-class-weapons"
          label="Weapons"
          placeholder="Simple weapons"
          value={data.weapons}
          onChange={(weapons) => set({ weapons })}
        />
      </div>
      <TextField
        id="homebrew-class-tools"
        label="Tools"
        placeholder="Thieves' tools, tinker's tools"
        hint="Separate with commas. Each becomes a proficiency on the sheet."
        value={data.tools}
        onChange={(tools) => set({ tools })}
      />
      <TextField
        id="homebrew-class-gear"
        label="Starting gear"
        placeholder="A light crossbow, 20 bolts, studded leather armor..."
        hint="Goes in the character's notes, to add to the inventory."
        maxLength={1000}
        value={data.equipment}
        onChange={(equipment) => set({ equipment })}
      />

      <fieldset className="homebrew-form__group">
        <legend className="homebrew-form__label">Spellcasting</legend>
        <label className="homebrew-form__field" htmlFor="homebrew-class-progression">
          <span className="homebrew-form__label">Spell slots</span>
          <select
            id="homebrew-class-progression"
            className="homebrew-form__input"
            value={data.progression}
            onChange={(event) => set({ progression: event.target.value })}
          >
            {Object.entries(CASTER_PROGRESSION_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>

        {casts && (
          <>
            <div className="homebrew-form__row">
              <label className="homebrew-form__field" htmlFor="homebrew-class-ability">
                <span className="homebrew-form__label">Casts with</span>
                <select
                  id="homebrew-class-ability"
                  className="homebrew-form__input"
                  value={data.spellcastingAbility}
                  onChange={(event) => set({ spellcastingAbility: event.target.value })}
                >
                  {["intelligence", "wisdom", "charisma"].map((ability) => (
                    <option key={ability} value={ability}>
                      {capitalize(ability)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="homebrew-form__field" htmlFor="homebrew-class-list">
                <span className="homebrew-form__label">Uses the spell list of</span>
                <select
                  id="homebrew-class-list"
                  className="homebrew-form__input"
                  value={data.spellList}
                  onChange={(event) => set({ spellList: event.target.value })}
                >
                  {CLASS_IDS.filter((id) => !["barbarian", "fighter", "monk", "rogue"].includes(id)).map(
                    (id) => (
                      <option key={id} value={id}>
                        {capitalize(id)}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <div className="homebrew-form__checks" role="radiogroup" aria-label="How spells are chosen">
              <label className="homebrew-form__check">
                <input
                  type="radio"
                  name="homebrew-class-spell-type"
                  checked={data.spellcastingType === "prepared"}
                  onChange={() => set({ spellcastingType: "prepared" })}
                />
                Prepares spells each day (like a Cleric)
              </label>
              <label className="homebrew-form__check">
                <input
                  type="radio"
                  name="homebrew-class-spell-type"
                  checked={data.spellcastingType === "known"}
                  onChange={() => set({ spellcastingType: "known" })}
                />
                Knows a set number of spells (like a Bard)
              </label>
            </div>

            <div className="homebrew-form__row">
              <NumberField
                id="homebrew-class-cantrips"
                label="Cantrips at level 1"
                min={0}
                max={6}
                value={data.cantripsAtFirst}
                onChange={(cantripsAtFirst) => set({ cantripsAtFirst })}
              />
              {data.spellcastingType === "known" && (
                <NumberField
                  id="homebrew-class-known"
                  label="Spells known at level 1"
                  min={0}
                  max={10}
                  value={data.spellsKnownAtFirst}
                  onChange={(spellsKnownAtFirst) => set({ spellsKnownAtFirst })}
                />
              )}
            </div>
          </>
        )}
      </fieldset>

      <div className="homebrew-form__row">
        <NumberField
          id="homebrew-class-subclass-level"
          label="Picks a subclass at level"
          min={1}
          max={20}
          value={data.subclassLevel}
          onChange={(subclassLevel) => set({ subclassLevel })}
        />
        <TextField
          id="homebrew-class-subclass-word"
          label="What its subclasses are called"
          placeholder="e.g. Specialist"
          maxLength={40}
          value={data.subclassFlavor}
          onChange={(subclassFlavor) => set({ subclassFlavor })}
        />
      </div>

      <NamedListField
        idPrefix="homebrew-class-feature"
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

// classOptions: the player's homebrew classes, which can have subclasses too.
function SubclassFields({ data, set, classOptions = [] }) {
  return (
    <>
      <label className="homebrew-form__field" htmlFor="homebrew-parent-class">
        <span className="homebrew-form__label">Which class is this for?</span>
        <select
          id="homebrew-parent-class"
          className="homebrew-form__input"
          value={data.parentClass}
          onChange={(event) => {
            const homebrew = classOptions.find((option) => option.index === event.target.value);
            set({ parentClass: event.target.value, parentClassName: homebrew?.name ?? "" });
          }}
        >
          <option value="">Choose a class</option>
          {CLASS_IDS.map((id) => (
            <option key={id} value={id}>
              {capitalize(id)}
            </option>
          ))}
          {classOptions.length > 0 && (
            <optgroup label="Homebrew classes">
              {classOptions.map((option) => (
                <option key={option.index} value={option.index}>
                  {option.name}
                </option>
              ))}
            </optgroup>
          )}
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

      <BonusSpellsField spells={data.spells ?? []} onChange={(spells) => set({ spells })} />
    </>
  );
}

// Spells the subclass always gives (Fey Wanderer Magic, a Cleric domain's):
// each one is added to the character's sheet at its class level, and doesn't
// count toward spells known. Only the name and levels are kept.
function BonusSpellsField({ spells, onChange }) {
  function update(index, changes) {
    onChange(spells.map((spell, i) => (i === index ? { ...spell, ...changes } : spell)));
  }
  return (
    <fieldset className="homebrew-form__group">
      <legend className="homebrew-form__label">Bonus spells (optional)</legend>
      <p className="homebrew-form__hint">
        Spells this subclass always gives. They&apos;re added to the sheet at the class
        level you give, and don&apos;t count toward spells known.
      </p>
      {spells.map((spell, index) => (
        <div className="homebrew-form__row" key={index}>
          <input
            className="homebrew-form__input homebrew-form__input--grow"
            aria-label={`Bonus spell ${index + 1} name`}
            placeholder="Spell name"
            maxLength={80}
            value={spell.name}
            onChange={(event) => update(index, { name: event.target.value })}
          />
          <NumberField
            id={`homebrew-bonus-spell-${index}-level`}
            label="Class level"
            min={1}
            max={20}
            value={spell.level}
            onChange={(level) => update(index, { level })}
          />
          <NumberField
            id={`homebrew-bonus-spell-${index}-spell-level`}
            label="Spell level"
            min={0}
            max={9}
            value={spell.spellLevel}
            onChange={(spellLevel) => update(index, { spellLevel })}
          />
          <button
            type="button"
            className="homebrew-form__remove"
            aria-label={`Remove ${spell.name || `bonus spell ${index + 1}`}`}
            onClick={() => onChange(spells.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="homebrew-form__add"
        onClick={() =>
          onChange([...spells, { name: "", level: spells.at(-1)?.level ?? 3, spellLevel: 1 }])
        }
      >
        Add a bonus spell
      </button>
    </fieldset>
  );
}

// A feat is a name, a prerequisite and what it does (the Summary box above).
function FeatFields({ data, set }) {
  return (
    <label className="homebrew-form__field" htmlFor="homebrew-prerequisite">
      <span className="homebrew-form__label">Prerequisite (optional)</span>
      <input
        id="homebrew-prerequisite"
        className="homebrew-form__input"
        placeholder="e.g. Strength 13 or higher"
        maxLength={200}
        value={data.prerequisite}
        onChange={(event) => set({ prerequisite: event.target.value })}
      />
    </label>
  );
}

const SECTIONS = {
  race: RaceFields,
  subrace: SubraceFields,
  background: BackgroundFields,
  class: ClassFields,
  subclass: SubclassFields,
  feat: FeatFields,
};

function CategoryFields({ category, data, onChange, raceOptions = [], classOptions = [] }) {
  const Section = SECTIONS[category];
  // Merge one change into the rest of the data.
  const set = (changes) => onChange({ ...data, ...changes });
  return Section ? (
    <Section data={data} set={set} raceOptions={raceOptions} classOptions={classOptions} />
  ) : null;
}

export default CategoryFields;
