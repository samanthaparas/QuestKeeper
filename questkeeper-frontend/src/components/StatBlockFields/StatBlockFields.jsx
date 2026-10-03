import Button from "../Button/Button";
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
      {value.attacks.length === 0 && (
        <p className="stat-block-fields__hint">
          No attacks yet. Add one so an attack is a single click during the fight.
        </p>
      )}

      {value.attacks.map((attack, index) => (
        <div className="stat-block-fields__row" key={`${idPrefix}-${index}`}>
          <input
            className="stat-block-fields__field"
            aria-label={`Attack ${index + 1} name`}
            placeholder="Attack (e.g. Claw)"
            maxLength={60}
            value={attack.name}
            onChange={(event) => updateAttack(index, "name", event.target.value)}
          />
          <input
            className="stat-block-fields__number"
            type="number"
            aria-label={`Attack ${index + 1} to hit`}
            placeholder="+ hit"
            value={attack.toHit}
            onChange={(event) => updateAttack(index, "toHit", event.target.value)}
          />
          <input
            className="stat-block-fields__field stat-block-fields__field--damage"
            aria-label={`Attack ${index + 1} damage`}
            placeholder="Damage (1d6+2)"
            maxLength={40}
            value={attack.damage}
            onChange={(event) => updateAttack(index, "damage", event.target.value)}
          />
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
      />
    </div>
  );
}

export default StatBlockFields;
