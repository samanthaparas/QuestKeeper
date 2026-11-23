import { useState } from "react";
import { getBeginnerTips } from "../../utils/beginnerTips";
import "./FightHowTo.css";

// "How a fight works": a short, numbered guide on the Combat tab for anyone
// new to fights at a table, one version for players and one for the DM.
// It starts open the first time on this device; "Got it" folds it away for
// good (it stays one tap away as a closed line). Remembered on this device
// only, and the page works the same if the browser blocks storage.

const STEPS = {
  player: [
    "Roll initiative when the DM asks: let the app roll, or type the number on your real d20.",
    "Wait for your turn. A banner on your character sheet says when you're next and when you're up.",
    "On your turn, open your sheet's Actions tab, tap Attack next to a weapon, pick a target and roll.",
    "If an enemy hits you, the banner asks you to apply the damage. Tap Apply.",
    "Tap End my turn when you're done.",
    "Need a minute? Step away skips your turns until you tap Return to play.",
  ],
  dm: [
    "Tap Next turn to move the fight along. The Selected panel follows whoever's turn it is.",
    "On a monster's turn, open Attack and tap Roll attack + damage, then Send.",
    "Use the damage and healing boxes to change a creature's HP. Damage you send a player, they apply.",
    "🧠 Concentrating? keeps track of a monster's spell, and reminds you to roll its save when it's hurt.",
    "When the fight is over, tap End combat. You can post a fight summary to the journal, or skip it.",
  ],
};

const storageKey = (side) => `qk-fight-howto-${side}`;

function readSeen(side) {
  try {
    return localStorage.getItem(storageKey(side)) === "seen";
  } catch {
    return false;
  }
}

// side: "player" or "dm". Hidden when "Beginner tips" is off in Settings.
function FightHowTo({ side = "player" }) {
  const [show] = useState(getBeginnerTips);
  const [seen, setSeen] = useState(() => readSeen(side));
  const [open, setOpen] = useState(() => !readSeen(side));

  function gotIt() {
    setSeen(true);
    setOpen(false);
    try {
      localStorage.setItem(storageKey(side), "seen");
    } catch {
      // Storage blocked: it just opens again next time.
    }
  }

  if (!show) return null;
  return (
    <details
      className="fight-howto"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="fight-howto__summary">
        <span aria-hidden="true">⚔️</span> How a fight works
        {!seen && <span className="fight-howto__new">New here?</span>}
      </summary>
      <ol className="fight-howto__steps">
        {STEPS[side].map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {!seen && (
        <button type="button" className="fight-howto__done" onClick={gotIt}>
          Got it
        </button>
      )}
    </details>
  );
}

export default FightHowTo;
