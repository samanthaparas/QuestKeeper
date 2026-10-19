import { useState } from "react";
import { rollDie, formatModifier } from "../../utils/characterSheet";
import {
  parseDamage,
  parseDiceNumbers,
  describeDiceNeeded,
  checkExtraDamage,
  rollDamageParts,
  damageFromDiceParts,
  readExtra,
  rememberExtra,
} from "../../utils/attacks";
import { describeDamageParts } from "../../utils/combatEffects";
import { SharpshooterToggle } from "../CharacterSheetActionsTab/CharacterSheetActionsTab";
import { attackRoll, dealDamage } from "../../utils/tableStore";
import Button from "../Button/Button";
import ExtraDamagePicker from "../ExtraDamagePicker/ExtraDamagePicker";
import "./AttackPanel.css";

const RESULT_TEXT = {
  hit: "That hits!",
  crit: "Critical hit!",
  miss: "That misses!",
  awaiting: "Waiting for the DM to call it...",
};

// Shown on your own turn after tapping Attack on a weapon. Step 1: choose a
// target and roll to hit. Step 2 (only after a hit): roll damage. The server
// compares your roll to the enemy's secret AC, so you never see it.
//
// `attack` is the attack as it is right now (getEffectiveAttack): its to-hit
// includes active effects like Elemental Weapon, and its damage comes in
// typed parts (1d4+5 piercing, 1d4 fire). Each part is rolled and sent
// separately, so damage types are never merged. An attack without parts
// (older callers) is one part: its own damage and type.
//
// sharpshooter: { on, onChange(on) } when this attack can use Sharpshooter. It's
// chosen before rolling to hit and can't change after, so the -5 and the +10
// always go together. Extra damage with a condition ("vs undead") gets a
// tick box at the damage step.
function AttackPanel({ attack, combat, onClose, sharpshooter = null }) {
  const me = combat.myCombatant;
  const targets = combat.combatants.filter(
    (combatant) => combatant.kind === "monster" && combatant.status !== "down",
  );

  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [physicalRoll, setPhysicalRoll] = useState("");
  const [lastRoll, setLastRoll] = useState(null);
  const [damageRolled, setDamageRolled] = useState(null);
  const [physicalDamage, setPhysicalDamage] = useState("");
  // The numbers on real damage dice ("6, 2, 3"), typed one per die.
  const [physicalDice, setPhysicalDice] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  // Extra damage on top of the weapon (Divine Smite, Sneak Attack...). Its text
  // is remembered, but it only applies when switched on for this attack.
  const [extraOn, setExtraOn] = useState(false);
  const [extraText, setExtraText] = useState(() => readExtra().text);
  const [extraLabel, setExtraLabel] = useState(() => readExtra().label);

  // Extra damage with a condition, switched on for this hit.
  const [optionalOn, setOptionalOn] = useState(() => new Set());
  const bonus = Number(attack.toHit) || 0;
  const optionalParts = attack.optionalParts ?? [];
  const chosenOptional = optionalParts.filter((part) => optionalOn.has(part.key));
  const savedParts = attack.damageParts ?? [
    { dice: attack.damage ?? "", type: String(attack.damageType ?? "").toLowerCase(), source: attack.name },
  ];
  const attackParts = [...savedParts, ...chosenOptional];
  const weaponParts = parseDamage(attackParts[0]?.dice);
  const canRollDamage = weaponParts !== null;
  const hasFlatBonus = (weaponParts ?? []).some((part) => part.type === "flat");
  const extra = extraOn && extraText.trim() ? { text: extraText.trim(), label: extraLabel.trim() || "Extra" } : null;
  // Everything rolled for this hit: the attack's parts, then the extra
  // damage typed in the box (no type: the player didn't say one).
  const allParts = extra ? [...attackParts, { dice: extra.text, type: "", source: extra.label }] : attackParts;
  const diceCount = allParts.reduce(
    (sum, part) => sum + (parseDamage(part.dice) ?? []).reduce((total, piece) => total + (piece.type === "dice" ? piece.count : 0), 0),
    0,
  );
  const extraDice = extra ? (checkExtraDamage(extra.text).dice ?? 0) : 0;
  const diceOrder = allParts
    .map((part) => describeDiceNeeded(part.dice))
    .filter(Boolean)
    .join(", then ");
  const hasHit = me.attack_state === "hit";
  const isAwaitingDm = me.attack_state === "awaiting_dm";
  // The outcome follows the live state, so "Waiting for the DM" turns into
  // "That hits!" the moment the DM calls it.
  const liveOutcome = hasHit
    ? me.attack_crit
      ? RESULT_TEXT.crit
      : RESULT_TEXT.hit
    : isAwaitingDm
      ? RESULT_TEXT.awaiting
      : lastRoll?.outcome === "miss"
        ? RESULT_TEXT.miss
        : "";
  const effectiveTargetId = targets.some((target) => target.id === targetId)
    ? targetId
    : (targets[0]?.id ?? "");

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
      const outcome = await attackRoll({
        tableId: combat.table.id,
        targetId: effectiveTargetId,
        attackName: attack.name,
        natural,
        bonus,
      });
      setLastRoll({
        summary: `Rolled ${natural} ${bonus >= 0 ? "+" : "-"} ${Math.abs(bonus)} = ${natural + bonus}${
          sharpshooter?.on ? " (with Sharpshooter)" : ""
        }.`,
        outcome,
      });
      // Each attack chooses Sharpshooter afresh: after a miss the next
      // attack (Extra Attack) starts with it off.
      if (outcome === "miss" && sharpshooter?.on) sharpshooter.onChange(false);
      setPhysicalRoll("");
      combat.refresh();
    });
  }

  function rollToHit() {
    submitAttack(rollDie(20));
  }

  function submitPhysicalRoll(event) {
    event.preventDefault();
    const natural = Number(physicalRoll);
    if (!Number.isInteger(natural) || natural < 1 || natural > 20) {
      setError("Enter the number on your d20, from 1 to 20.");
      return;
    }
    submitAttack(natural);
  }

  // parts: what each damage type dealt, when the app worked it out (not for
  // a total typed by hand, which has no breakdown).
  async function submitDamage(amount, parts = null) {
    await run(async () => {
      await dealDamage(combat.table.id, amount, parts);
      combat.refresh();
      onClose();
    });
  }

  // Changing the extra damage makes any damage already shown out of date.
  function changeExtra(change) {
    setDamageRolled(null);
    setError("");
    change();
  }

  // The manual extra's share of a roll, for the "✓ Smite added" line.
  function withExtraNote(result) {
    if (!extra) return result;
    const added = result.parts.at(-1);
    return { ...result, extra: { label: extra.label, total: added.amount } };
  }

  function rollDamageDice() {
    if (extra && checkExtraDamage(extra.text).error) {
      setError(checkExtraDamage(extra.text).error);
      return;
    }
    const result = rollDamageParts(allParts, { crit: me.attack_crit });
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    if (extra) rememberExtra(extraText, extraLabel);
    setDamageRolled(withExtraNote(result));
  }

  // Real damage dice: the player types the number on each die and the app adds
  // them up (doubling them on a critical hit) and adds the bonus, then shows
  // the same "Deal N damage" step as an app roll.
  function submitPhysicalDice(event) {
    event.preventDefault();
    const numbers = parseDiceNumbers(physicalDice);
    if (!numbers) {
      setError("Type the numbers on your dice, separated by commas.");
      return;
    }
    if (extra && checkExtraDamage(extra.text).error) {
      setError(checkExtraDamage(extra.text).error);
      return;
    }
    const result = damageFromDiceParts(allParts, numbers, { crit: me.attack_crit });
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    if (extra) rememberExtra(extraText, extraLabel);
    setDamageRolled(withExtraNote(result));
    setPhysicalDice("");
  }

  function submitPhysicalDamage(event) {
    event.preventDefault();
    const amount = Number(physicalDamage);
    if (!Number.isInteger(amount) || amount < 0) {
      setError("Enter your total damage as a whole number.");
      return;
    }
    submitDamage(amount);
  }

  return (
    <section className="attack-panel" aria-label={`Attack with ${attack.name}`}>
      <header className="attack-panel__header">
        <h3 className="attack-panel__title">
          {attack.name}{" "}
          <span className="attack-panel__bonus">{formatModifier(bonus)} to hit</span>
        </h3>
        <span className="attack-panel__count">
          Attack {(me.attacks_this_turn ?? 0) + (hasHit || isAwaitingDm ? 0 : 1)} this turn
        </span>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </header>

      {/* An enchanted weapon says so, and what it adds. */}
      {attack.isEnchanted && (
        <p className="attack-panel__effects">
          ✨ {attack.modifiers.map((modifier) => `${modifier.text} (${modifier.source})`).join(", ")}
        </p>
      )}

      {/* Sharpshooter: chosen before the roll, then shown as it was. */}
      {sharpshooter &&
        (!hasHit && !isAwaitingDm ? (
          <SharpshooterToggle
            on={sharpshooter.on}
            onToggle={() => sharpshooter.onChange(!sharpshooter.on)}
            disabled={isBusy}
          />
        ) : sharpshooter.on ? (
          <p className="attack-panel__effects">🎯 Sharpshooter on this attack: -5 to hit, +10 damage.</p>
        ) : null)}

      {error && (
        <p className="attack-panel__error" role="alert">
          {error}
        </p>
      )}

      {!hasHit && !isAwaitingDm && (
        <>
          {targets.length === 0 ? (
            <p className="attack-panel__note">There are no enemies to attack.</p>
          ) : (
            <>
              <label className="attack-panel__label" htmlFor="attack-target">
                Target
              </label>
              <select
                id="attack-target"
                className="attack-panel__select"
                value={effectiveTargetId}
                onChange={(event) => setTargetId(event.target.value)}
              >
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                    {target.status === "bloodied" ? " (bloodied)" : ""}
                  </option>
                ))}
              </select>

              <div className="attack-panel__row">
                <Button disabled={isBusy} onClick={rollToHit}>
                  Roll d20 ({formatModifier(bonus)})
                </Button>
                <span className="attack-panel__or">or</span>
                <form className="attack-panel__row" onSubmit={submitPhysicalRoll}>
                  <input
                    className="attack-panel__number"
                    type="number"
                    aria-label="Your physical d20 roll"
                    placeholder="d20"
                    value={physicalRoll}
                    onChange={(event) => setPhysicalRoll(event.target.value)}
                  />
                  <Button type="submit" variant="secondary" disabled={isBusy || !physicalRoll}>
                    Use my roll
                  </Button>
                </form>
              </div>
              <p className="attack-panel__note">
                For a physical roll, enter just the d20. We add your {formatModifier(bonus)}.
              </p>
            </>
          )}
        </>
      )}

      {lastRoll && (
        <p className="attack-panel__result">
          {lastRoll.summary} {liveOutcome}
        </p>
      )}

      {isAwaitingDm && (
        <p className="attack-panel__note">
          The DM is deciding whether that hits. This updates on its own.
        </p>
      )}

      {hasHit && (
        <div className="attack-panel__damage">
          <p className="attack-panel__note">
            Now roll damage
            {attackParts[0]?.dice
              ? ` (${describeDamageParts(attackParts)}${me.attack_crit ? ", every die doubled" : ""})`
              : ""}
            .
          </p>

          {/* The weapon's extra damage that only applies sometimes. */}
          {canRollDamage && optionalParts.length > 0 && (
            <div className="attack-panel__extra">
              {optionalParts.map((part) => (
                <label className="attack-panel__extra-toggle" key={part.key}>
                  <input
                    type="checkbox"
                    checked={optionalOn.has(part.key)}
                    onChange={(event) =>
                      changeExtra(() =>
                        setOptionalOn((previous) => {
                          const next = new Set(previous);
                          if (event.target.checked) next.add(part.key);
                          else next.delete(part.key);
                          return next;
                        }),
                      )
                    }
                  />
                  Add {part.dice} {part.type} ({part.condition})
                </label>
              ))}
            </div>
          )}

          {canRollDamage && (
            <div className="attack-panel__extra">
              <label className="attack-panel__extra-toggle">
                <input
                  type="checkbox"
                  checked={extraOn}
                  onChange={(event) => changeExtra(() => setExtraOn(event.target.checked))}
                />
                Add extra damage (Divine Smite, Sneak Attack, Hunter&apos;s Mark...)
              </label>
              {extraOn && (
                <>
                  <ExtraDamagePicker
                    text={extraText}
                    label={extraLabel}
                    onChange={({ text, label }) =>
                      changeExtra(() => {
                        setExtraText(text);
                        setExtraLabel(label);
                      })
                    }
                  />
                  <p className="attack-panel__note">
                    Added to this attack&apos;s damage, and its dice are doubled on a critical hit too. With real
                    dice, type the weapon&apos;s dice first, then the extra dice.
                  </p>
                </>
              )}
            </div>
          )}

          <div className="attack-panel__row">
            {canRollDamage && (
              <Button disabled={isBusy} onClick={rollDamageDice}>
                Roll damage
              </Button>
            )}
            {damageRolled && (
              <>
                <span className="attack-panel__rolled">{damageRolled.text}</span>
                {damageRolled.extra && (
                  <span className="attack-panel__added" role="status">
                    ✓ {damageRolled.extra.label} added: +{damageRolled.extra.total}. Total damage:{" "}
                    {damageRolled.total}.
                  </span>
                )}
                <Button disabled={isBusy} onClick={() => submitDamage(damageRolled.total, damageRolled.parts)}>
                  Deal {damageRolled.total} damage
                </Button>
              </>
            )}
          </div>

          {canRollDamage ? (
            // Rolled real dice: type each die's number; the app adds them and
            // your bonus.
            <form className="attack-panel__dice" onSubmit={submitPhysicalDice}>
              <label className="attack-panel__dice-label" htmlFor="attack-panel-dice">
                Rolled real dice? Type the number on each die ({diceCount}{" "}
                {diceCount === 1 ? "number" : "numbers"}: {diceOrder}
                {extra && extraDice > 0 ? ` (the last ${extraDice} for ${extra.label})` : ""}), separated by commas.
                We add them up{hasFlatBonus ? " and your bonus" : ""}
                {me.attack_crit ? ", doubling the dice for the critical hit" : ""}.
              </label>
              <div className="attack-panel__row">
                <input
                  id="attack-panel-dice"
                  className="attack-panel__dice-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="6, 2, 3, ..."
                  value={physicalDice}
                  onChange={(event) => setPhysicalDice(event.target.value)}
                />
                <Button type="submit" variant="secondary" disabled={isBusy || physicalDice.trim() === ""}>
                  Use my dice
                </Button>
              </div>
            </form>
          ) : (
            <form className="attack-panel__row" onSubmit={submitPhysicalDamage}>
              <input
                className="attack-panel__number"
                type="number"
                min="0"
                aria-label="Your physical damage total"
                placeholder="Total"
                value={physicalDamage}
                onChange={(event) => setPhysicalDamage(event.target.value)}
              />
              <Button type="submit" variant="secondary" disabled={isBusy || physicalDamage === ""}>
                Deal my damage
              </Button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

export default AttackPanel;
