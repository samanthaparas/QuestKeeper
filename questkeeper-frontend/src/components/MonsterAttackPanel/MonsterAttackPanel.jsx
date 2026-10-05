import { useState } from "react";
import { rollDie, formatModifier } from "../../utils/characterSheet";
import { rollDamage, parseDamage } from "../../utils/attacks";
import { readStatBlock } from "../../utils/statBlock";
import {
  applyDamage,
  dmAttackRoll,
  dmLog,
  postPlayerDamage,
} from "../../utils/tableStore";
import Button from "../Button/Button";
import "./MonsterAttackPanel.css";

const KIND_NOTE = { player: " (player)", ally: " (ally)", monster: "" };

// Puts the opposite side first: enemies usually attack players and allies,
// allies usually attack enemies.
function orderTargets(attacker, targets) {
  const rank = (target) => {
    if (attacker.kind === "ally") return target.kind === "monster" ? 0 : target.kind === "player" ? 1 : 2;
    return target.kind === "player" ? 0 : target.kind === "ally" ? 1 : 2;
  };
  return [...targets].sort((a, b) => rank(a) - rank(b));
}

// Which side a target is on, relative to the attacker. Enemies usually attack
// players and allies; allies usually attack enemies.
function isOppositeSide(attacker, target) {
  return attacker.kind === "ally" ? target.kind === "monster" : target.kind !== "monster";
}

// The DM's attack panel: a monster or ally rolls to hit any other fighter, with
// the attack filled in from its stat block. Damage on a player goes to that
// player as an Apply button; damage on a monster or ally is applied directly.
function MonsterAttackPanel({ attacker, targets, statBlock, tableId, onChanged, onClose }) {
  const attacks = readStatBlock(statBlock).attacks;
  const choices = orderTargets(
    attacker,
    targets.filter((target) => !(target.kind !== "player" && target.status === "down")),
  );

  const opposite = choices.filter((choice) => isOppositeSide(attacker, choice));
  const sameSide = choices.filter((choice) => !isOppositeSide(attacker, choice));

  function renderTargetOption(choice) {
    return (
      <option key={choice.id} value={choice.id}>
        {choice.name}
        {KIND_NOTE[choice.kind]}
      </option>
    );
  }

  const [targetId, setTargetId] = useState(choices[0]?.id ?? "");
  const [pickedAttack, setPickedAttack] = useState(attacks.length > 0 ? "0" : "custom");
  const [attackName, setAttackName] = useState(attacks[0]?.name ?? "");
  const [bonusText, setBonusText] = useState(attacks[0]?.toHit ?? "");
  const [damageText, setDamageText] = useState(attacks[0]?.damage ?? "");
  const [physicalRoll, setPhysicalRoll] = useState("");
  const [outcome, setOutcome] = useState(null); // { result, summary }
  const [damageRolled, setDamageRolled] = useState(null);
  const [physicalDamage, setPhysicalDamage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const bonus = Number(bonusText) || 0;
  const target = choices.find((entry) => entry.id === targetId) ?? choices[0];
  const hasHit = outcome && (outcome.result === "hit" || outcome.result === "crit");
  const isCrit = outcome?.result === "crit";

  function pickAttack(value) {
    setPickedAttack(value);
    if (value === "custom") return;

    const attack = attacks[Number(value)];
    setAttackName(attack.name);
    setBonusText(attack.toHit);
    setDamageText(attack.damage);
  }

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
      const result = await dmAttackRoll({
        attackerId: attacker.id,
        targetId: target.id,
        attackName,
        natural,
        bonus,
      });
      const against = result.ac !== null && result.ac !== undefined ? ` against AC ${result.ac}` : "";
      setOutcome({
        result: result.result,
        summary: `Rolled ${natural} ${bonus >= 0 ? "+" : "-"} ${Math.abs(bonus)} = ${natural + bonus}${against}.`,
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

  // The target has no AC on file, so the DM decides.
  async function callIt(isHit) {
    await run(async () => {
      await dmLog(
        tableId,
        `${attacker.name} vs ${target.name}: ${isHit ? "That hits!" : "That misses!"}`,
      );
      setOutcome((previous) => ({
        result: isHit ? "hit" : "miss",
        summary: previous.summary,
      }));
      onChanged();
    });
  }

  async function sendDamage(amount) {
    if (!Number.isInteger(amount) || amount < 1) {
      setError("Damage must be a whole number of at least 1.");
      return;
    }
    await run(async () => {
      if (target.kind === "player") {
        await postPlayerDamage(tableId, target.user_id, amount, attacker.name);
      } else {
        await applyDamage(target.id, amount);
      }
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

      {choices.length === 0 && <p className="monster-attack__note">There is nobody to attack.</p>}

      {choices.length > 0 && !outcome && (
        <>
          <div className="monster-attack__row">
            <select
              className="monster-attack__field"
              aria-label="Who is being attacked"
              value={target?.id ?? ""}
              onChange={(event) => setTargetId(event.target.value)}
            >
              {opposite.length > 0 && sameSide.length > 0 ? (
                <>
                  <optgroup label="Opponents">{opposite.map(renderTargetOption)}</optgroup>
                  <optgroup label="Same side (charm, confusion, mistakes)">
                    {sameSide.map(renderTargetOption)}
                  </optgroup>
                </>
              ) : (
                choices.map(renderTargetOption)
              )}
            </select>

            {attacks.length > 0 && (
              <select
                className="monster-attack__field"
                aria-label="Which attack"
                value={pickedAttack}
                onChange={(event) => pickAttack(event.target.value)}
              >
                {attacks.map((attack, index) => (
                  <option key={`${attack.name}-${index}`} value={String(index)}>
                    {attack.name} ({formatModifier(Number(attack.toHit) || 0)}, {attack.damage || "no damage set"})
                  </option>
                ))}
                <option value="custom">Something else...</option>
              </select>
            )}
          </div>

          <div className="monster-attack__row">
            <input
              className="monster-attack__field"
              aria-label="Attack name"
              placeholder="Attack (e.g. Claw)"
              maxLength={60}
              value={attackName}
              onChange={(event) => {
                setAttackName(event.target.value);
                setPickedAttack("custom");
              }}
            />
            <input
              className="monster-attack__number"
              type="number"
              aria-label="Attack bonus"
              placeholder="+ hit"
              value={bonusText}
              onChange={(event) => {
                setBonusText(event.target.value);
                setPickedAttack("custom");
              }}
            />
          </div>

          <div className="monster-attack__row">
            <Button disabled={isBusy || !target} onClick={() => submitAttack(rollDie(20))}>
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
          {outcome.result === "crit" && "Critical hit!"}
          {outcome.result === "hit" && "That hits!"}
          {outcome.result === "miss" && "That misses!"}
          {outcome.result === "unknown" && `${target.name} has no AC saved. Does it hit?`}
        </p>
      )}

      {outcome?.result === "unknown" && (
        <div className="monster-attack__row">
          <Button disabled={isBusy} onClick={() => callIt(true)}>
            Hit
          </Button>
          <Button variant="secondary" disabled={isBusy} onClick={() => callIt(false)}>
            Miss
          </Button>
        </div>
      )}

      {outcome?.result === "miss" && (
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      )}

      {hasHit && (
        <>
          <p className="monster-attack__note">
            Now the damage. Roll the dice below
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
