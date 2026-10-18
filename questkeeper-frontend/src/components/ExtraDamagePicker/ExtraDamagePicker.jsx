import { useId } from "react";
import { EXTRA_DAMAGE_PRESETS } from "../../utils/attacks";
import "./ExtraDamagePicker.css";

// The "extra damage" boxes shared by the attack panel and the sheet's damage
// roll: a list of common choices (a Paladin's Divine Smite, a Rogue's Sneak
// Attack...) that fills in the dice and the name, and the two boxes themselves
// for anything else (their typing suggestions come from the same list).
//
// text, label: the dice ("2d8") and the name ("Smite").
// onChange({ text, label }): called when either one changes.
function ExtraDamagePicker({ text, label, onChange }) {
  const id = useId();
  const groups = [...new Set(EXTRA_DAMAGE_PRESETS.map((preset) => preset.group))];
  const diceSuggestions = [...new Set(EXTRA_DAMAGE_PRESETS.map((preset) => preset.dice))];
  const nameSuggestions = [...new Set(EXTRA_DAMAGE_PRESETS.map((preset) => preset.label))];
  // Shows the matching common choice when the boxes happen to hold one.
  const matching = EXTRA_DAMAGE_PRESETS.findIndex((preset) => preset.dice === text && preset.label === label);

  function handlePreset(event) {
    const preset = EXTRA_DAMAGE_PRESETS[Number(event.target.value)];
    if (preset) onChange({ text: preset.dice, label: preset.label });
  }

  return (
    <div className="extra-damage-picker">
      <label className="extra-damage-picker__field" htmlFor={`${id}-preset`}>
        <span className="extra-damage-picker__label">Pick a common one</span>
        <select
          id={`${id}-preset`}
          className="extra-damage-picker__input"
          value={matching === -1 ? "" : String(matching)}
          onChange={handlePreset}
        >
          <option value="">Something else (type it below)</option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {EXTRA_DAMAGE_PRESETS.map((preset, index) =>
                preset.group === group ? (
                  <option key={index} value={String(index)}>
                    {preset.name}
                  </option>
                ) : null,
              )}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="extra-damage-picker__row">
        <label className="extra-damage-picker__field" htmlFor={`${id}-dice`}>
          <span className="extra-damage-picker__label">Dice to add</span>
          <input
            id={`${id}-dice`}
            className="extra-damage-picker__input"
            type="text"
            aria-label="Extra damage dice"
            placeholder="2d8"
            list={`${id}-dice-list`}
            value={text}
            onChange={(event) => onChange({ text: event.target.value, label })}
          />
          <datalist id={`${id}-dice-list`}>
            {diceSuggestions.map((dice) => (
              <option key={dice} value={dice} />
            ))}
          </datalist>
        </label>
        <label className="extra-damage-picker__field" htmlFor={`${id}-name`}>
          <span className="extra-damage-picker__label">What it's called (optional)</span>
          <input
            id={`${id}-name`}
            className="extra-damage-picker__input"
            type="text"
            aria-label="Name for the extra damage (optional)"
            placeholder="Divine Smite"
            maxLength={30}
            list={`${id}-name-list`}
            value={label}
            onChange={(event) => onChange({ text, label: event.target.value })}
          />
          <datalist id={`${id}-name-list`}>
            {nameSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
      </div>

      <p className="extra-damage-picker__hint">
        <strong>2d8</strong> means roll two 8-sided dice and add them up. A <strong>+2</strong> adds a flat
        number. Your class feature or spell says how much it adds, so check it if you&apos;re not sure.
      </p>
    </div>
  );
}

export default ExtraDamagePicker;
