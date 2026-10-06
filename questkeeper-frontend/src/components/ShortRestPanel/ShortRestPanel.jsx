import { useState } from "react";
import Button from "../Button/Button";
import {
  formatModifier,
  getAbilityModifier,
  getHitDiceRemaining,
  rollDie,
} from "../../utils/characterSheet";
import "./ShortRestPanel.css";

// Opens from the sheet's Short Rest button. A short rest (about an hour) lets
// you spend Hit Dice to heal: each die rolls + your CON modifier. Finishing
// the rest also refills anything that resets on a short rest.
function ShortRestPanel({ sheet, onRest, onClose }) {
  const hitDice = sheet.combat.hitDice ?? {};
  const die = Number(hitDice.die) || 0;
  const remaining = getHitDiceRemaining(hitDice);
  const { current, max } = sheet.combat.hitPoints;
  const con = getAbilityModifier(sheet.abilityScores?.constitution ?? 10);
  const isHurt = current < max;
  const canSpend = die > 0 && remaining > 0;

  const [count, setCount] = useState(canSpend && isHurt ? "1" : "0");
  const spend = Math.max(0, Math.min(remaining, Number(count) || 0));

  function handleSubmit(event) {
    event.preventDefault();
    const rolls = canSpend
      ? Array.from({ length: spend }, () => rollDie(die))
      : [];
    onRest(rolls);
  }

  return (
    <section className="short-rest" aria-labelledby="short-rest-title">
      <div className="short-rest__head">
        <h3 id="short-rest-title" className="short-rest__title">
          Short rest
        </h3>
        <span className="short-rest__hp">
          HP {current} / {max}
        </span>
      </div>

      <p className="short-rest__text">
        About an hour of rest. Spend Hit Dice to heal: each one rolls a{" "}
        {die > 0 ? `d${die}` : "Hit Die"} and adds your CON (
        {formatModifier(con)}). Anything that resets on a short rest refills
        when you finish.
      </p>

      <form className="short-rest__form" onSubmit={handleSubmit}>
        {die > 0 ? (
          <>
            <label className="short-rest__label" htmlFor="short-rest-count">
              Hit Dice to spend
              <span className="short-rest__left">
                {remaining} of {Number(hitDice.total) || 0} left
              </span>
            </label>
            <input
              id="short-rest-count"
              className="short-rest__count"
              type="number"
              min="0"
              max={remaining}
              value={count}
              disabled={remaining === 0}
              onChange={(event) => setCount(event.target.value)}
            />
          </>
        ) : (
          <p className="short-rest__warning">
            Set your Hit Die size first (the number after &quot;d&quot; in the
            Hit Dice box, e.g. 8 for d8). You can still finish the rest to
            refill your short-rest abilities.
          </p>
        )}

        {die > 0 && remaining === 0 && (
          <p className="short-rest__warning">
            No Hit Dice left. A long rest gives some back.
          </p>
        )}
        {die > 0 && remaining > 0 && !isHurt && (
          <p className="short-rest__note">
            You&apos;re at full HP, so there&apos;s no need to spend any.
          </p>
        )}

        <div className="short-rest__buttons">
          <Button type="submit">
            {spend > 0
              ? `Roll ${spend} ${spend === 1 ? "Hit Die" : "Hit Dice"} and rest`
              : "Rest without spending"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

export default ShortRestPanel;
