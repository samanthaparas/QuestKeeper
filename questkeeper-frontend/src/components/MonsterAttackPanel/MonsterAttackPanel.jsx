import { useState } from "react";
import { rollDie, formatModifier } from "../../utils/characterSheet";
import { rollDamage, parseDamage } from "../../utils/attacks";
import { monsterAttackRoll, postPlayerDamage } from "../../utils/tableStore";
import Button from "../Button/Button";
import "./MonsterAttackPanel.css";

// The DM's version of the player attack panel: an enemy rolls to hit a player,
// either virtually or from a physical d20. The server compares the roll to the
// player's AC. After a hit the DM rolls damage, and the player taps Apply on
// their own sheet.
function MonsterAttackPanel({ attacker, players, tableId, onChanged, onClose }) {
  const [targetUserId, setTargetUserId] = useState(players[0]?.user_id ?? "");
  const [attackName, setAttackName] = useState("");
  const [bonusText, setBonusText] = useState("");
  const [physicalRoll, setPhysicalRoll] = useState("");
  const [outcome, setOutcome] = useState(null); // { result, ac, summary }
  const [damageText, setDamageText] = useState("");
  const [damageRolled, setDamageRolled] = useState(null);
  const [physicalDamage, setPhysicalDamage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const bonus = Number(bonusText) || 0;
  const target = players.find((player) => player.user_id === targetUserId) ?? players[0];
  const hasHit = outcome && outcome.result !== "miss";
  const isCrit = outcome?.result === "crit";

  async function run(action) {
    setError("");
    setIsBusy(true);
    try {
      await action();
    } catch (actionError) {
      setError(actionError.message ?? "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submitAttack(natural) {
    await run(async () => {
      const result = await monsterAttackRoll({
        attackerId: attacker.id,
        targetUserId: target.user_id,
        attackName,
        natural,
        bonus,
      });
      setOutcome({
        result: result.result,
        summary: `Rolled ${natural} ${bonus >= 0 ? "+" : "-"} ${Math.abs(bonus)} = ${natural + bonus} against AC ${result.ac}.`,
      });
      setPhysicalRoll("");
      onChanged();
    });
  }

  function submitPhysicalRoll(event) {
    event.preventDefault();
    const natural = Number(physicalRoll);
    if (!Number.isInteger(natural) || natural < 1 || natural > 20) {
      setError("Enter the number on the d20, from 1 to 20.");
      return;
    }
    submitAttack(natural);
  }

  async function sendDamage(amount) {
    if (!Number.isInteger(amount) || amount < 1) {
      setError("Damage must be a whole number of at least 1.");
      return;
    }
    await run(async () => {
      await postPlayerDamage(tableId, target.user_id, amount, attacker.name);
      onChanged();
      onClose();
    });
  }

  function submitPhysicalDamage(event) {
    event.preventDefault();
    sendDamage(Number(physicalDamage));
  }

  return (
    <section className="monster-attack" aria-label={`${attacker.name} attacks`}>
      {error && (
        <p className="monster-attack__error" role="alert">
          {error}
        </p>
      )}

      {!outcome && (
        <>
          <div className="monster-attack__row">
            <select
              className="monster-attack__field"
              aria-label="Who is being attacked"
              value={target?.user_id ?? ""}
              onChange={(event) => setTargetUserId(event.target.value)}
            >
              {players.map((player) => (
                <option key={player.id} value={player.user_id}>
                  {player.name}
                </option>
              ))}
            </select>
            <input
              className="monster-attack__field"
              aria-label="Attack name"
              placeholder="Attack (e.g. Claw)"
              maxLength={60}
              value={attackName}
              onChange={(event) => setAttackName(event.target.value)}
            />
            <input
              className="monster-attack__number"
              type="number"
              aria-label="Attack bonus"
              placeholder="+ hit"
              value={bonusText}
              onChange={(event) => setBonusText(event.target.value)}
            />
          </div>

          <div className="monster-attack__row">
            <Button
              disabled={isBusy || !target}
              onClick={() => submitAttack(rollDie(20))}
            >
              Roll d20 ({formatModifier(bonus)})
            </Button>
            <span className="monster-attack__or">or</span>
            <form className="monster-attack__row" onSubmit={submitPhysicalRoll}>
              <input
                className="monster-attack__number"
                type="number"
                aria-label="Physical d20 roll"
                placeholder="d20"
                value={physicalRoll}
                onChange={(event) => setPhysicalRoll(event.target.value)}
              />
              <Button type="submit" variant="secondary" disabled={isBusy || !physicalRoll}>
                Use my roll
              </Button>
            </form>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {outcome && (
        <p className="monster-attack__result">
          {outcome.summary}{" "}
          {isCrit ? "Critical hit!" : hasHit ? "That hits!" : "That misses!"}
        </p>
      )}

      {outcome && !hasHit && (
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      )}

      {hasHit && (
        <>
          <p className="monster-attack__note">
            Now the damage. Type the damage dice (like 1d6+2) to roll it
            {isCrit ? " (dice doubled for the critical hit)" : ""}, or enter a physical total.
          </p>
          <div className="monster-attack__row">
            <input
              className="monster-attack__field"
              aria-label="Damage dice"
              placeholder="Damage (e.g. 1d6+2)"
              value={damageText}
              onChange={(event) => {
                setDamageText(event.target.value);
                setDamageRolled(null);
              }}
            />
            <Button
              disabled={isBusy || parseDamage(damageText) === null}
              onClick={() => setDamageRolled(rollDamage(damageText, { crit: isCrit }))}
            >
              Roll damage
            </Button>
            {damageRolled && (
              <>
                <span className="monster-attack__rolled">{damageRolled.text}</span>
                <Button disabled={isBusy} onClick={() => sendDamage(damageRolled.total)}>
                  Send {damageRolled.total} damage
                </Button>
              </>
            )}
          </div>

          <form className="monster-attack__row" onSubmit={submitPhysicalDamage}>
            <input
              className="monster-attack__number"
              type="number"
              aria-label="Physical damage total"
              placeholder="Total"
              value={physicalDamage}
              onChange={(event) => setPhysicalDamage(event.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={isBusy || physicalDamage === ""}>
              Send my damage
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Skip damage
            </Button>
          </form>
        </>
      )}
    </section>
  );
}

export default MonsterAttackPanel;
