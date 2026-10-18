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

  // A player gets the damage as a request they tap to take; a monster or ally
  // loses the hit points straight away. The buttons say which.
  const giveVerb = target.kind === "player" ? "Send" : "Deal";
  const giveNote =
    target.kind === "player"
      ? `${target.name} will see it and tap to take it.`
      : `It comes off ${target.name}'s hit points right away.`;

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
          {/* The three steps, for DMs new to running a monster's attack. */}
          <p className="monster-attack__note">
            Pick a target, roll to hit, then roll damage.
          </p>
          <div className="monster-attack__row">
            {/* Visible labels so each box says what it's for before it's
                tapped. */}
            <label className="monster-attack__labeled">
              <span className="monster-attack__label">Target</span>
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
            </label>

            {attacks.length > 0 && (
              <label className="monster-attack__labeled">
                <span className="monster-attack__label">Attack</span>
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
                  <option value="custom">A different attack (type it below)</option>
                </select>
              </label>
            )}
          </div>

          {attacks.length === 0 && (
            <p className="monster-attack__note monster-attack__note--help">
              No attacks saved for {attacker.name}. Type one below, or tap <strong>Edit</strong> on
              its row afterwards so it&apos;s ready next time.
            </p>
          )}

          <div className="monster-attack__row">
            <label className="monster-attack__labeled">
              <span className="monster-attack__label">Attack name</span>
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
            </label>
            <label className="monster-attack__labeled monster-attack__labeled--narrow">
              <span className="monster-attack__label">+ to hit</span>
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
            </label>
          </div>

          {pickedAttack === "custom" && (
            <p className="monster-attack__note">
              <strong>Not sure of the + hit?</strong> It&apos;s in the monster&apos;s stat block,
              like &quot;Scimitar: +4 to hit&quot;. Most low-level monsters use +3 to +5. Left
              blank, it counts as +0.
            </p>
          )}

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
          {/* Two ways to get the damage: the app rolls the formula, or the DM
              rolls real dice and types the final number. */}
          <p className="monster-attack__note">
            Now the damage, either way:
          </p>
          <ul className="monster-attack__steps">
            <li>
              <strong>Let the app roll:</strong> type the attack&rsquo;s damage from the stat
              block (like 1d4+2) and tap Roll damage.
              {isCrit && " It's a critical hit, so what the dice show is doubled for you (1d4+2 rolling a 3 deals 3 × 2 + 2 = 8)."}
            </li>
            <li>
              <strong>Rolled real dice?</strong> Type the final number, dice plus the bonus
              (rolled 3 on 1d4+2 → 5), and tap the button to give it.
              {isCrit && " For the critical hit, double what the dice show, then add the bonus."}
            </li>
          </ul>
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
                  {giveVerb} {damageRolled.total} damage to {target.name}
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
              {giveVerb} this damage to {target.name}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              No damage
            </Button>
          </form>
          <p className="monster-attack__note">{giveNote}</p>
        </>
      )}
    </section>
  );
}

export default MonsterAttackPanel;
