import { rollButtonLabel } from "../../utils/rolls";
import { useRoller } from "./rollContext";
import "./RollDock.css";

// A number on the sheet that rolls when tapped ("+5" on Stealth rolls
// d20 + 5). Outside a sheet with a roller it's just the number.
//
// damage: roll this damage text ("1d8+3") instead of a d20.
// attack: { name, damage } for an attack roll, so a natural 20 can offer
// critical damage.
function RollButton({ label, bonus = 0, damage, attack, className = "", children }) {
  const roller = useRoller();
  if (!roller) return <span className={className}>{children}</span>;

  const isDamage = damage !== undefined;
  return (
    <button
      type="button"
      className={`roll-button ${className}`}
      aria-label={isDamage ? `Roll ${label}, ${damage}` : rollButtonLabel(label, bonus)}
      title={isDamage ? `Roll ${damage}` : "Tap to roll"}
      onClick={() => (isDamage ? roller.rollDamage(label, damage) : roller.roll(label, bonus, { attack }))}
    >
      {children}
    </button>
  );
}

export default RollButton;
