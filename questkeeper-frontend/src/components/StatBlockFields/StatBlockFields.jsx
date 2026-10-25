import Button from "../Button/Button";
import { SAVE_ABILITIES } from "../../utils/statBlock";
import "./StatBlockFields.css";

// Edits a stat block: a list of attacks (name, to-hit bonus, damage dice) and
// free-form notes. Used when adding, editing, and saving monsters and NPCs.
function StatBlockFields({ value, onChange, idPrefix = "stat" }) {
  function updateAttack(index, field, fieldValue) {
    const attacks = value.attacks.map((attack, attackIndex) =>
      attackIndex === index ? { ...attack, [field]: fieldValue } : attack,
    );
    onChange({ ...value, attacks });
  }

  function addAttack() {
    onChange({ ...value, attacks: [...value.attacks, { name: "", toHit: "", damage: "" }] });
  }

  function removeAttack(index) {
    onChange({ ...value, attacks: value.attacks.filter((_, attackIndex) => attackIndex !== index) });
  }

  return (
    <div className="stat-block-fields">
      <label className="stat-block-fields__initiative">
        Initiative bonus
        <input
          className="stat-block-fields__number"
          type="number"
          aria-label="Initiative bonus"
          placeholder="+0"
          value={value.initiativeBonus ?? ""}
          onChange={(event) => onChange({ ...value, initiativeBonus: event.target.value })}
        />
        <span className="stat-block-fields__hint">
          Added to the d20 when you roll this monster's initiative (usually its Dex modifier).
        </span>
      </label>

      {/* Saving throws: optional, only the ones typed are kept. Only the
          DM ever sees them, like everything in a stat block. */}
      <fieldset className="stat-block-fields__saves">
        <legend className="stat-block-fields__caption">Saving throws (optional)</legend>
        {SAVE_ABILITIES.map(([key, short]) => (
          <label className="stat-block-fields__labeled" key={key}>
            <span className="stat-block-fields__caption">{short}</span>
            <input
              className="stat-block-fields__number"
              type="number"
              aria-label={`${short} save bonus`}
              placeholder="+0"
              value={value.saves?.[key] ?? ""}
              onChange={(event) =>
                onChange({ ...value, saves: { ...(value.saves ?? {}), [key]: event.target.value } })
              }
            />
          </label>
        ))}
        <span className="stat-block-fields__hint">Leave blank any you don&apos;t know. Only you can see these.</span>
      </fieldset>

      {value.attacks.length === 0 && (
        <p className="stat-block-fields__hint">
          No attacks yet. Add one so an attack is a single click during the fight.
        </p>
      )}

      {value.attacks.map((attack, index) => (
        <div className="stat-block-fields__row" key={`${idPrefix}-${index}`}>
          <label className="stat-block-fields__labeled stat-block-fields__labeled--grow">
            <span className="stat-block-fields__caption">Attack</span>
            <input
              className="stat-block-fields__field"
              aria-label={`Attack ${index + 1} name`}
              placeholder="Attack (e.g. Claw)"
              maxLength={60}
              value={attack.name}
              onChange={(event) => updateAttack(index, "name", event.target.value)}
            />
          </label>
          <label className="stat-block-fields__labeled">
            <span className="stat-block-fields__caption">To hit (+)</span>
            <input
              className="stat-block-fields__number"
              type="number"
              aria-label={`Attack ${index + 1} to hit`}
              placeholder="+ hit"
              value={attack.toHit}
              onChange={(event) => updateAttack(index, "toHit", event.target.value)}
            />
          </label>
          <label className="stat-block-fields__labeled">
            <span className="stat-block-fields__caption">Damage</span>
            <input
              className="stat-block-fields__field stat-block-fields__field--damage"
              aria-label={`Attack ${index + 1} damage`}
              placeholder="Damage (1d6+2)"
              maxLength={40}
              value={attack.damage}
              onChange={(event) => updateAttack(index, "damage", event.target.value)}
            />
          </label>
          <Button type="button" variant="secondary" onClick={() => removeAttack(index)}>
            Remove
          </Button>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addAttack}>
        + Add attack
      </Button>

      <textarea
        className="stat-block-fields__notes"
        aria-label="Notes"
        placeholder="Notes (abilities, resistances, tactics...). Only you can see these."
        rows={3}
        maxLength={1000}
        value={value.notes}
        onChange={(event) => onChange({ ...value, notes: event.target.value })}
        // A browser only scrolls to the typing cursor when a text box gets focus, which can leave
        // the lower part of the box cut off (most noticeable zoomed in). This brings the whole
        // box into view, moving the page only as far as needed.
        onFocus={(event) => event.currentTarget.scrollIntoView?.({ block: "nearest" })}
      />
    </div>
  );
}

export default StatBlockFields;
