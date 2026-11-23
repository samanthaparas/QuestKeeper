import { parseDamage } from "../../utils/attacks";
import { formatModifier } from "../../utils/characterSheet";
import CompanionIcon from "../CompanionIcon/CompanionIcon";
import RollButton from "./RollButton";

// The roll buttons for an attack row, shared by the character's weapons and
// their companions' attacks so both read the same way:
// - ToHitButton: "+13 · Roll", outlined, the bonus big.
// - DamageChip: one damage roll with its type ("1d8+7 piercing").

// The to-hit roll: a clear outlined button, the bonus big and "Roll" small.
// Its screen-reader name is "Roll Wisteria's Kiss attack, +13".
export function ToHitButton({ label, bonus, attack, enchanted = false }) {
  return (
    <RollButton className="qk-roll-pill" label={label} bonus={bonus} attack={attack}>
      <CompanionIcon name="dice-d20" size={18} className="qk-roll-pill__icon" />
      <span className="qk-roll-pill__number">
        {enchanted ? "✨ " : ""}
        {formatModifier(bonus)}
      </span>{" "}
      <span className="qk-roll-pill__verb">Roll</span>
    </RollButton>
  );
}

// One damage roll as a chip: the dice, then its type ("1d8+7 piercing").
// Each type is its own chip and its own roll, so resistances apply apart.
// Dice that can't be rolled ("special") show as a plain chip.
export function DamageChip({ label, dice, type, plus = false, optional = false, note = "" }) {
  const className = `qk-damage-chip${optional ? " qk-damage-chip--optional" : ""}`;
  const content = (
    <>
      <span className="qk-damage-chip__dice">
        {plus ? "+" : ""}
        {dice}
      </span>
      {type && <span className="qk-damage-chip__type"> {type}</span>}
      {note && <span className="qk-damage-chip__note"> {note}</span>}
    </>
  );
  return parseDamage(dice) ? (
    <RollButton className={className} label={label} damage={dice}>
      {content}
    </RollButton>
  ) : (
    <span className={className}>{content}</span>
  );
}
