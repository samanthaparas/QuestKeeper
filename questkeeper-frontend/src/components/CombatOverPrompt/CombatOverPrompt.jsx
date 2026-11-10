import { useEffect, useRef, useState } from "react";
import Button from "../Button/Button";
import "./CombatOverPrompt.css";

// How long the DM has before a fight with every enemy down ends by itself.
export const AUTO_END_SECONDS = 60;

function formatClock(seconds) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

// "Every enemy is down": shown on the DM's Combat panel once the last enemy
// falls. A countdown ends the fight by itself, unless the DM ends it now,
// adds a surprise monster, or holds off. Only shown while every enemy is down
// (TablePage mounts it then), so a new monster or a healed one makes it go
// away, and the next time it starts fresh.
//
// onEnd(): ends combat. onAddMonster(): opens the add-monster form.
function CombatOverPrompt({ onEnd, onAddMonster }) {
  const [secondsLeft, setSecondsLeft] = useState(AUTO_END_SECONDS);
  const [isHeld, setIsHeld] = useState(false);
  const ended = useRef(false);

  // Count down once a second while not held.
  useEffect(() => {
    if (isHeld) return undefined;
    const timer = setInterval(() => setSecondsLeft((left) => left - 1), 1000);
    return () => clearInterval(timer);
  }, [isHeld]);

  // Time's up: end the fight (once).
  useEffect(() => {
    if (!isHeld && secondsLeft <= 0 && !ended.current) {
      ended.current = true;
      onEnd();
    }
  }, [isHeld, secondsLeft, onEnd]);

  function endNow() {
    if (ended.current) return;
    ended.current = true;
    onEnd();
  }

  return (
    <section className="combat-over" aria-labelledby="combat-over-title">
      <p className="combat-over__title" id="combat-over-title" role="status">
        <span aria-hidden="true">🎉</span> Every enemy is down.
      </p>
      <p className="combat-over__text">
        {isHeld ? (
          "The timer is stopped. End combat when you're ready."
        ) : (
          <>
            Combat ends by itself in <strong className="combat-over__clock">{formatClock(secondsLeft)}</strong>, unless
            a surprise is coming.
          </>
        )}
      </p>
      <div className="combat-over__buttons">
        <Button onClick={endNow}>End combat now</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setIsHeld(true);
            onAddMonster();
          }}
        >
          Add a surprise monster
        </Button>
        {!isHeld && (
          <Button variant="secondary" onClick={() => setIsHeld(true)}>
            Hold off
          </Button>
        )}
      </div>
    </section>
  );
}

export default CombatOverPrompt;
