import { useEffect, useRef, useState } from "react";
import { useRoller } from "../RollDock/rollContext";
import DiscardPendingConfirm from "../RollDock/DiscardPendingConfirm";
import { focusPendingRoll } from "../../utils/focusInPane";
import { formatModifier } from "../../utils/characterSheet";
import { ROLL_MODES, checkFromDice, describeAttackRoll, rollCheck } from "../../utils/rolls";
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
import { attackRoll, cancelAttack, dealDamage } from "../../utils/tableStore";
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
//
// The to-hit roll uses the roll bar's "Next d20" (Normal, Advantage,
// Disadvantage), like every other d20 on the sheet: two dice with advantage
// or disadvantage, the higher or lower kept, the bonus added once, and a
// natural 1 or 20 read from the kept die. It's used up (back to Normal) only
// once the attack has been sent to the table, never by opening the panel,
// a bad number, switching how dice are rolled, or rolling damage.
//
// How each step is rolled follows the roll bar's "App rolls / I roll real
// dice" choice (the sheet's roller), so there's one setting, not two. The
// chosen way comes first; the other is one small link away ("Use physical
// dice instead" / "Let the app roll instead"), which changes the roll bar's
// setting too. Switching never rolls, deals damage or touches the attack
// at the table, and numbers already typed are kept.
//
// onHitFeatures: features that can add damage to this hit (Dreadful
// Strikes), each with its eligibility for this target this turn
// (onHitEligibility). They're offered after a hit, off unless ticked, and
// onOnHitDealt(features) is called only once their damage is dealt, so a
// miss or leaving it unticked uses nothing.
// The small link to the other way of rolling this step. It changes the roll
// bar's setting too, so the two always agree.
function MethodSwitch({ realDice, onSwitch, disabled, pendingLabel = "", confirming = false, onKeep, onDiscard }) {
  if (confirming) {
    return (
      <DiscardPendingConfirm
        id="attack-panel-discard"
        pendingLabel={pendingLabel}
        onKeep={onKeep}
        onDiscard={onDiscard}
      />
    );
  }
  return (
    <p className="attack-panel__method">
      <button type="button" className="attack-panel__method-link" disabled={disabled} onClick={onSwitch}>
        {realDice ? "Let the app roll instead" : "Use physical dice instead"}
      </button>
    </p>
  );
}

function AttackPanel({ attack, combat, onClose, sharpshooter = null, onHitFeatures = [], onOnHitDealt = () => {} }) {
  const me = combat.myCombatant;
  const targets = combat.combatants.filter(
    (combatant) => combatant.kind === "monster" && combatant.status !== "down",
  );

  // The roll bar's choice. Outside a sheet (no roll bar) the panel keeps
  // its own, starting with app rolls.
  const roller = useRoller();
  const [ownRealDice, setOwnRealDice] = useState(false);
  const realDice = roller ? Boolean(roller.realDice) : ownRealDice;
  const d20Mode = ROLL_MODES.includes(roller?.mode) ? roller.mode : "normal";
  const twoDice = d20Mode !== "normal";
  // After "...instead", focus moves to the step's main control in the other
  // way (the link the player pressed is gone).
  const focusAfterSwitch = useRef(false);
  const primaryRef = useRef(null);
  // Switching to app rolls goes through the roller's chooseAppRolls, the
  // same as the roll bar's own button: if a roll is waiting for real dice
  // (a Stealth check), it asks first, here.
  function switchMethod() {
    focusAfterSwitch.current = true;
    if (!roller?.setRealDice) {
      setOwnRealDice(!realDice);
      return;
    }
    if (realDice && roller.chooseAppRolls) {
      if (!roller.chooseAppRolls("panel")) focusAfterSwitch.current = false;
      return;
    }
    roller.setRealDice(!realDice);
  }
  const confirmingDiscard = roller?.discardAsk === "panel";
  function discardAndSwitch() {
    focusAfterSwitch.current = true;
    roller.discardAndSwitch();
  }
  // "Keep entering roll": nothing changes; back to the roll bar's box.
  function keepPending() {
    roller.keepPendingRoll();
    focusPendingRoll();
  }
  useEffect(() => {
    if (!focusAfterSwitch.current) return;
    focusAfterSwitch.current = false;
    primaryRef.current?.focus();
  }, [realDice]);

  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [physicalRoll, setPhysicalRoll] = useState("");
  // The second real d20, with advantage or disadvantage.
  const [physicalRoll2, setPhysicalRoll2] = useState("");
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
  // "Cancel attack" asks once before it lets the attack go.
  const [confirmCancel, setConfirmCancel] = useState(false);
  // On-hit features ticked for this hit (by key).
  const [onHitOn, setOnHitOn] = useState(() => new Set());
  const chosenOnHit = onHitFeatures.filter(
    (feature) => onHitOn.has(feature.key) && feature.eligibility?.status !== "used",
  );
  const bonus = Number(attack.toHit) || 0;
  const optionalParts = attack.optionalParts ?? [];
  const chosenOptional = optionalParts.filter((part) => optionalOn.has(part.key));
  const savedParts = attack.damageParts ?? [
    { dice: attack.damage ?? "", type: String(attack.damageType ?? "").toLowerCase(), source: attack.name },
  ];
  // Each on-hit feature is its own part, in its own damage type.
  const attackParts = [
    ...savedParts,
    ...chosenOptional,
    ...chosenOnHit.map((feature) => ({ dice: feature.dice, type: feature.type, source: feature.name })),
  ];
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
  // The creature this hit landed on (the server keeps it until damage is
  // dealt). Only its name is shown, which players already see.
  const targetName = combat.combatants.find((combatant) => combatant.id === me.attack_target)?.name ?? "this creature";
  const isAwaitingDm = me.attack_state === "awaiting_dm";
  // A rolled attack that isn't finished: its target is locked, and it can
  // only be finished (damage) or cancelled, never pointed somewhere else.
  const unfinished = hasHit || isAwaitingDm;
  // That unfinished attack was made with another weapon: finish it with
  // that one (its own dice), or cancel it, before this weapon can attack.
  const otherWeapon = unfinished && me.attack_name && me.attack_name !== attack.name ? me.attack_name : null;
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

  // roll: the finished d20 check (rollCheck or checkFromDice), with both
  // dice when there were two. Its mode and dice stay with the result shown
  // here, even after the roll bar goes back to Normal.
  async function submitAttack(roll) {
    await run(async () => {
      const outcome = await attackRoll({
        tableId: combat.table.id,
        targetId: effectiveTargetId,
        attackName: attack.name,
        natural: roll.natural,
        bonus,
      });
      setLastRoll({ summary: describeAttackRoll(roll, bonus, sharpshooter?.on), outcome });
      // The table has it: Advantage or Disadvantage is used up, as for any
      // other d20 on the sheet.
      if (roll.mode !== "normal") roller?.setMode?.("normal");
      // Each attack chooses Sharpshooter afresh: after a miss the next
      // attack (Extra Attack) starts with it off.
      if (outcome === "miss" && sharpshooter?.on) sharpshooter.onChange(false);
      setPhysicalRoll("");
      setPhysicalRoll2("");
      combat.refresh();
    });
  }

  function rollToHit() {
    submitAttack(rollCheck({ label: attack.name, bonus, mode: d20Mode }));
  }

  function submitPhysicalRoll(event) {
    event.preventDefault();
    const typed = twoDice ? [physicalRoll, physicalRoll2] : [physicalRoll];
    const dice = typed.map((value) => Number(value));
    if (dice.some((die) => !Number.isInteger(die) || die < 1 || die > 20)) {
      setError(twoDice ? "Enter both d20 numbers, each from 1 to 20." : "Enter the number on your d20, from 1 to 20.");
      return;
    }
    const roll = checkFromDice({ label: attack.name, bonus, mode: d20Mode, dice });
    if (roll.error) {
      setError(roll.error);
      return;
    }
    submitAttack(roll);
  }

  // parts: what each damage type dealt, when the app worked it out (not for
  // a total typed by hand, which has no breakdown).
  // Lets go of the unfinished attack: it still counts as an attack this
  // turn, no damage is dealt, and earlier damage stays. Back to the weapons.
  async function confirmCancelAttack() {
    await run(async () => {
      await cancelAttack(combat.table.id);
      setConfirmCancel(false);
      combat.refresh();
      onClose();
    });
  }

  async function submitDamage(amount, parts = null) {
    await run(async () => {
      await dealDamage(combat.table.id, amount, parts);
      // Only now does an on-hit feature count as used (its dice were in
      // this damage).
      if (parts && chosenOnHit.length > 0) onOnHitDealt(chosenOnHit);
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
        <p className="attack-panel__error" id="attack-panel-error" role="alert">
          {error}
        </p>
      )}

      {!hasHit && !isAwaitingDm && (
        <>
          {targets.length === 0 ? (
            <p className="attack-panel__note">There are no enemies to attack.</p>
          ) : (
            <>
              {/* Target, then the roll, on one line when there's room, so the
                  whole first step fits inside the weapon's box. */}
              <div className="attack-panel__row">
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
                {realDice ? (
                  <form className="attack-panel__row" onSubmit={submitPhysicalRoll}>
                    <input
                      ref={primaryRef}
                      className="attack-panel__number"
                      type="number"
                      aria-label={twoDice ? "Your first d20 roll" : "Your physical d20 roll"}
                      // The note, and any problem with the number typed.
                      aria-describedby={error ? "attack-panel-d20-note attack-panel-error" : "attack-panel-d20-note"}
                      aria-invalid={error ? true : undefined}
                      placeholder={twoDice ? "1st d20" : "d20"}
                      value={physicalRoll}
                      onChange={(event) => setPhysicalRoll(event.target.value)}
                    />
                    {twoDice && (
                      <input
                        className="attack-panel__number"
                        type="number"
                        aria-label="Your second d20 roll"
                        aria-describedby={error ? "attack-panel-d20-note attack-panel-error" : "attack-panel-d20-note"}
                        aria-invalid={error ? true : undefined}
                        placeholder="2nd d20"
                        value={physicalRoll2}
                        onChange={(event) => setPhysicalRoll2(event.target.value)}
                      />
                    )}
                    <Button type="submit" disabled={isBusy || !physicalRoll || (twoDice && !physicalRoll2)}>
                      {twoDice ? "Use my rolls" : "Use my roll"}
                    </Button>
                  </form>
                ) : (
                  <Button ref={primaryRef} disabled={isBusy} onClick={rollToHit}>
                    {twoDice ? `Roll with ${d20Mode}` : "Roll d20"} ({formatModifier(bonus)})
                  </Button>
                )}
              </div>
              {realDice ? (
                <p className="attack-panel__note" id="attack-panel-d20-note">
                  {twoDice
                    ? `With ${d20Mode}, roll two d20s and enter both. We keep the ${
                        d20Mode === "advantage" ? "higher" : "lower"
                      } one and add your ${formatModifier(bonus)}.`
                    : `Enter just the number on your d20. We add your ${formatModifier(bonus)}.`}
                </p>
              ) : (
                twoDice && (
                  <p className="attack-panel__note">
                    Rolls two d20s and keeps the {d20Mode === "advantage" ? "higher" : "lower"} (the roll bar&apos;s Next
                    d20).
                  </p>
                )
              )}
              <MethodSwitch
                realDice={realDice}
                onSwitch={switchMethod}
                disabled={isBusy}
                confirming={confirmingDiscard}
                pendingLabel={roller?.pending?.label}
                onKeep={keepPending}
                onDiscard={discardAndSwitch}
              />
            </>
          )}
        </>
      )}

      {lastRoll && (
        <p className="attack-panel__result">
          {lastRoll.summary} {liveOutcome}
        </p>
      )}

      {/* The target is locked once rolled; say which, and that cancelling
          is the way out. */}
      {unfinished && (
        <p className="attack-panel__note">
          {otherWeapon
            ? `Your attack with ${otherWeapon} on ${targetName} isn't finished. Finish it with ${otherWeapon}, or cancel it first.`
            : `Target: ${targetName} (locked for this attack).`}
        </p>
      )}

      {isAwaitingDm && !otherWeapon && (
        <p className="attack-panel__note">
          The DM is deciding whether that hits. This updates on its own.
        </p>
      )}

      {hasHit && !otherWeapon && (
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

          {/* Features that add damage on a hit (Dreadful Strikes). */}
          {canRollDamage && onHitFeatures.length > 0 && (
            <div className="attack-panel__extra">
              {onHitFeatures.map((feature) => {
                const used = feature.eligibility?.status === "used";
                const manual = feature.eligibility?.status === "manual";
                const noteId = `on-hit-note-${feature.key}`;
                return (
                  <div key={feature.key} className="attack-panel__on-hit">
                    <label className="attack-panel__extra-toggle">
                      <input
                        type="checkbox"
                        checked={!used && onHitOn.has(feature.key)}
                        disabled={used}
                        aria-describedby={noteId}
                        onChange={(event) =>
                          changeExtra(() =>
                            setOnHitOn((previous) => {
                              const next = new Set(previous);
                              if (event.target.checked) next.add(feature.key);
                              else next.delete(feature.key);
                              return next;
                            }),
                          )
                        }
                      />
                      {feature.name}: +{feature.dice} {feature.type}
                    </label>
                    <span id={noteId} className="attack-panel__on-hit-note">
                      {used
                        ? `Already used on ${targetName} this turn.`
                        : manual
                          ? `${feature.note} QuestKeeper can't tell whose turn it is, so check this yourself.`
                          : feature.note}
                    </span>
                  </div>
                );
              })}
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

          {/* The chosen way to get the damage: the app's roll, or the
              numbers on real dice (the app adds them up). Special damage the
              app can't read is always typed as a total. */}
          {canRollDamage && !realDice && (
            <div className="attack-panel__row">
              <Button ref={primaryRef} disabled={isBusy} onClick={rollDamageDice}>
                Roll damage
              </Button>
            </div>
          )}

          {canRollDamage && realDice && (
            // Real dice: type each die's number; the app adds them and your
            // bonus.
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
                  ref={primaryRef}
                  id="attack-panel-dice"
                  aria-describedby={error ? "attack-panel-error" : undefined}
                  aria-invalid={error ? true : undefined}
                  className="attack-panel__dice-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="6, 2, 3, ..."
                  value={physicalDice}
                  onChange={(event) => setPhysicalDice(event.target.value)}
                />
                <Button type="submit" disabled={isBusy || physicalDice.trim() === ""}>
                  Use my dice
                </Button>
              </div>
            </form>
          )}

          {/* The damage worked out (either way), and the one button that deals it. */}
          {damageRolled && (
            <div className="attack-panel__row">
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
            </div>
          )}

          {canRollDamage ? (
            <MethodSwitch
              realDice={realDice}
              onSwitch={switchMethod}
              disabled={isBusy}
              confirming={confirmingDiscard}
              pendingLabel={roller?.pending?.label}
              onKeep={keepPending}
              onDiscard={discardAndSwitch}
            />
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
      {/* Cancel an unfinished attack, after one explicit "yes". */}
      {unfinished &&
        (confirmCancel ? (
          <div className="attack-panel__cancel" role="group" aria-label="Cancel this attack?">
            <span>
              Cancel the attack on {targetName}? No damage is dealt, and it still counts as an attack this turn.
            </span>
            <Button variant="secondary" disabled={isBusy} onClick={confirmCancelAttack}>
              Yes, cancel it
            </Button>
            <Button variant="secondary" disabled={isBusy} onClick={() => setConfirmCancel(false)}>
              Keep it
            </Button>
          </div>
        ) : (
          <div className="attack-panel__cancel">
            <button type="button" className="attack-panel__cancel-link" onClick={() => setConfirmCancel(true)}>
              Cancel attack
            </button>
          </div>
        ))}
    </section>
  );
}

export default AttackPanel;
