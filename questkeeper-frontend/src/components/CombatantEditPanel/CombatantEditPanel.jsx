import { useState } from "react";
import {
  PIECE_ICONS,
  cleanStatBlock,
  readStatBlock,
  splitIcon,
  withIcon,
} from "../../utils/statBlock";
import Button from "../Button/Button";
import StatBlockFields from "../StatBlockFields/StatBlockFields";
import "./CombatantEditPanel.css";

// The DM edits a monster or ally: name, HP (max and current), AC, and stat block.
// `secret` is the DM-only row from combatant_secrets.
function CombatantEditPanel({ combatant, secret, onSave, onCancel }) {
  const [icon, setIcon] = useState(() => splitIcon(combatant.name).icon);
  const [name, setName] = useState(() => splitIcon(combatant.name).text);
  const [maxHp, setMaxHp] = useState(String(secret?.max_hp ?? ""));
  const [currentHp, setCurrentHp] = useState(String(secret?.current_hp ?? ""));
  const [armorClass, setArmorClass] = useState(
    secret?.armor_class === null || secret?.armor_class === undefined
      ? ""
      : String(secret.armor_class),
  );
  const [statBlock, setStatBlock] = useState(readStatBlock(secret?.stat_block));
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const max = Number(maxHp);
    const current = Number(currentHp);

    if (!name.trim()) return setError("Give it a name.");
    if (!Number.isInteger(max) || max < 1) return setError("Max HP must be at least 1.");
    if (!Number.isInteger(current) || current < 0) return setError("Current HP can't be negative.");

    setError("");
    setIsBusy(true);
    try {
      await onSave({
        id: combatant.id,
        name: withIcon(name.trim(), icon),
        maxHp: max,
        currentHp: current,
        armorClass: armorClass === "" ? null : Number(armorClass),
        statBlock: cleanStatBlock(statBlock),
      });
    } catch (saveError) {
      setError(saveError.message ?? "Could not save.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <form className="combatant-edit" onSubmit={handleSubmit} aria-label={`Edit ${combatant.name}`}>
      {error && (
        <p className="combatant-edit__error" role="alert">
          {error}
        </p>
      )}

      <div className="combatant-edit__row">
        <select
          className="combatant-edit__field"
          aria-label="Edit icon"
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
        >
          <option value="">No icon</option>
          {PIECE_ICONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          className="combatant-edit__field"
          aria-label="Edit name"
          maxLength={70}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="combatant-edit__label">
          Max HP
          <input
            className="combatant-edit__number"
            type="number"
            aria-label="Edit max HP"
            value={maxHp}
            onChange={(event) => setMaxHp(event.target.value)}
          />
        </label>
        <label className="combatant-edit__label">
          Current HP
          <input
            className="combatant-edit__number"
            type="number"
            aria-label="Edit current HP"
            value={currentHp}
            onChange={(event) => setCurrentHp(event.target.value)}
          />
        </label>
        <label className="combatant-edit__label">
          AC
          <input
            className="combatant-edit__number"
            type="number"
            aria-label="Edit AC"
            value={armorClass}
            onChange={(event) => setArmorClass(event.target.value)}
          />
        </label>
      </div>

      <StatBlockFields value={statBlock} onChange={setStatBlock} idPrefix={`edit-${combatant.id}`} />

      <div className="combatant-edit__row">
        <Button type="submit" disabled={isBusy}>
          Save
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default CombatantEditPanel;
