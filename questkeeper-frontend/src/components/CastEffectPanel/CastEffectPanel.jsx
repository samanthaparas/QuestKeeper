import { useState } from "react";
import Button from "../Button/Button";
import { formatModifier } from "../../utils/characterSheet";
import { describeDamageParts, EFFECT_TEMPLATES } from "../../utils/combatEffects";
import "./CastEffectPanel.css";

// Casting a spell the sheet can run for you (Elemental Weapon), opened from
// its Cast button on the Spells tab, right under the spell. It asks only what
// the spell needs (which weapon, which damage type, which slot), shows what
// the weapon will become before anything is spent, and warns when casting
// ends another concentration spell.
//
// options (from the sheet page):
//   template         the spell's rules (see combatEffects.js)
//   weapons          [{ index, name }]: the weapons it can go on
//   slotLevels       [{ level, current, max }]
//   otherConcentration   the spell this would end, or ""
//   preview(choices) the weapon's numbers if cast: { baseToHit, toHit, damageParts }
// onCast(choices) casts it and returns an error to show, or "" when done.
function CastEffectPanel({ options, onCast, onClose }) {
  const { template, weapons, slotLevels, otherConcentration } = options;
  const firstUsable = slotLevels.find((slot) => slot.current > 0) ?? slotLevels[0];
  const [attackIndex, setAttackIndex] = useState(weapons[0]?.index ?? "");
  const [damageType, setDamageType] = useState(template.damageTypes?.[0] ?? "");
  const [slotLevel, setSlotLevel] = useState(firstUsable?.level ?? template.baseLevel);
  const [error, setError] = useState("");

  const slot = slotLevels.find((item) => item.level === Number(slotLevel));
  const choices = { attackIndex, damageType, slotLevel: Number(slotLevel) };
  const preview = attackIndex ? options.preview(choices) : null;
  const canCast = weapons.length > 0 && (slot?.current ?? 0) > 0;

  function cast() {
    const problem = onCast(choices);
    if (problem) setError(problem);
    else onClose();
  }

  return (
    <section className="cast-effect" aria-label={`Cast ${template.spell}`}>
      <p className="cast-effect__summary">
        <strong>{template.spell}</strong> · {template.durationText}. {template.summary}
      </p>

      {weapons.length === 0 ? (
        <p className="cast-effect__note" role="status">
          No nonmagical weapons on the Actions tab yet. Add one there first.
        </p>
      ) : (
        <div className="cast-effect__choices">
          <label className="cast-effect__choice">
            Weapon
            <select value={attackIndex} onChange={(event) => setAttackIndex(event.target.value)}>
              {weapons.map((weapon) => (
                <option key={weapon.index} value={weapon.index}>
                  {weapon.name}
                </option>
              ))}
            </select>
          </label>
          {template.damageTypes && (
            <label className="cast-effect__choice">
              Damage type
              <select value={damageType} onChange={(event) => setDamageType(event.target.value)}>
                {template.damageTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="cast-effect__choice">
            Spell slot
            <select value={slotLevel} onChange={(event) => setSlotLevel(Number(event.target.value))}>
              {slotLevels.map((item) => (
                <option key={item.level} value={item.level}>
                  Level {item.level} ({item.current}/{item.max} left)
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {preview && (
        <p className="cast-effect__preview">
          {preview.name}: {formatModifier(preview.baseToHit)} → <strong>{formatModifier(preview.toHit)} to hit</strong>
          {" · "}
          {describeDamageParts(preview.damageParts)}
        </p>
      )}
      {weapons.length > 0 && (
        <p className="cast-effect__note">
          Only weapons that aren&apos;t magic can take it. If one of these is magic, don&apos;t pick it.
        </p>
      )}
      {otherConcentration && (
        <p className="cast-effect__warning" role="status">
          Casting this ends your concentration on {otherConcentration}.
        </p>
      )}
      {slot && slot.current <= 0 && (
        <p className="cast-effect__warning" role="status">
          No level {slot.level} slots left.
        </p>
      )}
      {error && (
        <p className="cast-effect__warning" role="alert">
          {error}
        </p>
      )}

      <div className="cast-effect__actions">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!canCast} onClick={cast}>
          Cast {template.spell}
          {slot ? ` (level ${slot.level} slot)` : ""}
        </Button>
      </div>
    </section>
  );
}

export default CastEffectPanel;

// Under an enchanted weapon on the Actions tab (and its spell on the Spells
// tab): which effect is on it, what it adds, and an End button. End removes
// the effect (and the concentration held for it); the weapon's own saved
// numbers were never changed, so it's exactly as before.
export function EffectStrip({ effects, describe, onEnd }) {
  if (!effects?.length) return null;
  return effects.map((effect) => (
    <p className="effect-strip" key={effect.id} role="status">
      <span>
        ✨ <strong>{effect.spell}</strong>
        {effect.damageType ? ` (${effect.damageType.toLowerCase()})` : ""}
        {effect.attackName ? ` on ${effect.attackName}` : ""}, level {effect.slotLevel} slot
        {describe ? `: ${describe(effect)}` : ""}
        {/* How long it lasts, and what ends it, so nobody has to remember. */}
        <span className="effect-strip__duration">
          {" "}
          · {EFFECT_TEMPLATES[effect.key]?.durationText ?? ""}. Ends if you rest, lose concentration or tap End.
        </span>
      </span>
      <button
        type="button"
        className="effect-strip__end"
        aria-label={`End ${effect.spell}`}
        onClick={() => onEnd(effect.id)}
      >
        End
      </button>
    </p>
  ));
}
