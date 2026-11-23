import { useEffect, useRef } from "react";
import Button from "../Button/Button";
import { focusInPane } from "../../utils/focusInPane";
import "./RollDock.css";

// "Your Stealth roll is still waiting for your dice": asked before switching
// to app rolls would throw that roll away, from the roll bar or an attack
// panel (the roller's chooseAppRolls decides when). Keep entering roll
// changes nothing and goes back to the waiting roll's box; Discard and
// switch throws it away once and switches to app rolls.
//
// The question takes focus when it appears, so a keyboard user lands on it.
function DiscardPendingConfirm({ id, pendingLabel, onKeep, onDiscard, className = "" }) {
  const keepRef = useRef(null);
  useEffect(() => {
    focusInPane(keepRef.current);
  }, []);
  return (
    <div className={`discard-pending ${className}`.trim()} role="group" aria-labelledby={`${id}-text`}>
      <p id={`${id}-text`}>
        Your <strong>{pendingLabel || "other"}</strong> roll is still waiting for your dice in the roll bar. Switching
        to app rolls discards it.
      </p>
      <Button ref={keepRef} variant="secondary" onClick={onKeep}>
        Keep entering roll
      </Button>
      <Button variant="secondary" onClick={onDiscard}>
        Discard and switch
      </Button>
    </div>
  );
}

export default DiscardPendingConfirm;
