import { Fragment, useEffect, useState } from "react";
import { parseDamage } from "../../utils/attacks";
import RollButton from "../RollDock/RollButton";
import EditableItemList from "../EditableItemList/EditableItemList";
import SrdDetailDialog from "../SrdDetailDialog/SrdDetailDialog";
import { EffectStrip } from "../CastEffectPanel/CastEffectPanel";
import { useSrdDetailView } from "../../hooks/useSrdDetailView";
import { useSrdEquipmentLookup } from "../../hooks/useSrdEquipmentLookup";
import Button from "../Button/Button";
import { getWeapons, getWeaponDetails } from "../../utils/api";
import {
  buildStartingAttacks,
  describeToHitBasics,
  describeToHitMath,
  findInventoryWeapons,
  formatModifier,
  getWeaponAttackMath,
  MAGIC_OPTIONS,
  magicChoiceFor,
  splitMagicWeaponName,
} from "../../utils/characterSheet";
import { SHARPSHOOTER, describeDamageParts } from "../../utils/combatEffects";

// The damage types offered for a weapon's extra damage (any other can be typed).
const DAMAGE_TYPES = [
  "acid",
  "bludgeoning",
  "cold",
  "fire",
  "force",
  "lightning",
  "necrotic",
  "piercing",
  "poison",
  "psychic",
  "radiant",
  "slashing",
  "thunder",
];

// Rows for a weapon's own extra damage (1d4 psychic on every hit), each
// with its type, where it comes from, and an optional condition ("vs
// undead": then it's only added when switched on for a hit).
export function ExtraDamageEditor({ value, onChange, weaponName }) {
  const rows = Array.isArray(value) ? value : [];
  const change = (position, key, text) =>
    onChange(rows.map((row, i) => (i === position ? { ...row, [key]: text } : row)));
  return (
    <fieldset className="character-sheet__extra-damage-editor">
      <legend>Extra damage on every hit</legend>
      {rows.length === 0 && (
        <p className="character-sheet__extra-damage-empty">
          For a weapon that also deals another type, like 1d4 psychic or 2d6 fire. Spells like Elemental Weapon and
          Hunter&apos;s Mark aren&apos;t added here; they&apos;re added when cast or when you attack.
        </p>
      )}
      {rows.map((row, position) => (
        <div className="character-sheet__extra-damage-row" key={position}>
          {/* A short label over each box and a short example inside, so
              nothing is cut off in a narrow box. */}
          <label className="character-sheet__labeled-box character-sheet__labeled-box--dice">
            <span>Dice</span>
            <input
              className="character-sheet__resource-form-input"
              placeholder="1d4"
              value={row.dice ?? ""}
              onChange={(event) => change(position, "dice", event.target.value)}
            />
          </label>
          <label className="character-sheet__labeled-box">
            <span>Damage type</span>
            <input
              className="character-sheet__resource-form-input"
              placeholder="psychic"
              list="extra-damage-types"
              value={row.type ?? ""}
              onChange={(event) => change(position, "type", event.target.value)}
            />
          </label>
          <label className="character-sheet__labeled-box">
            <span>Comes from</span>
            <input
              className="character-sheet__resource-form-input"
              placeholder={weaponName || "the weapon"}
              value={row.source ?? ""}
              onChange={(event) => change(position, "source", event.target.value)}
            />
          </label>
          <label className="character-sheet__labeled-box">
            <span>Only when (optional)</span>
            <input
              className="character-sheet__resource-form-input"
              placeholder="vs undead"
              value={row.condition ?? ""}
              onChange={(event) => change(position, "condition", event.target.value)}
            />
          </label>
          <button
            type="button"
            className="character-sheet__resource-remove"
            onClick={() => onChange(rows.filter((_, i) => i !== position))}
          >
            Remove
          </button>
        </div>
      ))}
      <datalist id="extra-damage-types">
        {DAMAGE_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <Button
        variant="secondary"
        onClick={() => onChange([...rows, { dice: "", type: "", source: "", condition: "" }])}
      >
        + Add extra damage
      </Button>
    </fieldset>
  );
}

// What the attack will look like once saved: "+13 to hit, 1d8+7 piercing +
// 1d4 psychic", so the numbers can be checked before Save.
function AttackPreview({ values }) {
  const toHit = Number(values.toHit) || 0;
  const always = (values.extraDamage ?? []).filter((row) => String(row.dice ?? "").trim() && !String(row.condition ?? "").trim());
  const optional = (values.extraDamage ?? []).filter((row) => String(row.dice ?? "").trim() && String(row.condition ?? "").trim());
  const parts = [
    { dice: String(values.damage ?? "").trim(), type: String(values.damageType ?? "").trim().toLowerCase() },
    ...always.map((row) => ({ dice: String(row.dice).trim(), type: String(row.type ?? "").trim().toLowerCase() })),
  ];
  if (!String(values.name ?? "").trim()) return null;
  return (
    <p className="character-sheet__attack-preview" role="status">
      <strong>Preview:</strong> {String(values.name).trim()}
      {values.magic !== "" && values.magic !== undefined ? " ✨" : ""} · {formatModifier(toHit)} to hit
      {parts[0].dice ? ` · ${describeDamageParts(parts)}` : ""}
      {optional.map((row, i) => (
        <span key={i}>
          {" "}
          (+{row.dice} {String(row.type ?? "").toLowerCase()} {row.condition})
        </span>
      ))}
    </p>
  );
}

// Shorter names for the breakdown's lines, so each fits on one line.
const SHORT_LABELS = {
  "Archery Fighting Style": "Archery",
  "Magic weapon": "Magic",
  "Typed in by you": "Typed by you",
};
const shortLabel = (label) => SHORT_LABELS[label] ?? String(label).replace(/ dice$/, "");

// "How it adds up" for one attack: a small card under the weapon with two
// short columns, Attack and Damage, each ending in its total. It opens from
// the row's button, closes with ✕ or Escape, and hands focus back to that
// button, so the player is right where they were.
function AttackBreakdown({ attack, live, breakdown, item, onClose, onUnlink }) {
  const headingId = `breakdown-${attack.index}`;
  // The weapon's own damage lines ("1d8", "+5"), then its extra parts.
  const ownDamage = breakdown.damage.filter((line) => !/\s/.test(line.text));
  const extras = live.damageParts.slice(1);
  return (
    <section
      className="character-sheet__breakdown"
      aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="character-sheet__breakdown-header">
        <h4 id={headingId} tabIndex={-1} className="character-sheet__breakdown-title">
          {attack.name}: how it adds up
        </h4>
        <button
          type="button"
          className="character-sheet__breakdown-close"
          aria-label={`Close how ${attack.name} adds up`}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="character-sheet__breakdown-columns">
        <div className="character-sheet__breakdown-column">
          <p className="character-sheet__breakdown-heading">Attack</p>
          <dl className="character-sheet__breakdown-list">
            {breakdown.toHit.map((line, i) => (
              <Fragment key={`hit-${i}`}>
                <dt>{formatModifier(line.value)}</dt>
                <dd>{shortLabel(line.label)}</dd>
              </Fragment>
            ))}
          </dl>
          <p className="character-sheet__breakdown-total">{formatModifier(breakdown.toHitTotal)} to hit</p>
        </div>
        <div className="character-sheet__breakdown-column">
          <p className="character-sheet__breakdown-heading">Damage</p>
          <dl className="character-sheet__breakdown-list">
            {ownDamage.map((line, i) => (
              <Fragment key={`damage-${i}`}>
                <dt>{line.text}</dt>
                <dd>{shortLabel(line.label)}</dd>
              </Fragment>
            ))}
            {extras.map((part, i) => (
              <Fragment key={`extra-${i}`}>
                <dt>+{part.dice}</dt>
                <dd>
                  {part.type}
                  {part.source && part.source !== attack.name ? ` (${part.source})` : ""}
                </dd>
              </Fragment>
            ))}
          </dl>
          <p className="character-sheet__breakdown-total">{describeDamageParts(live.damageParts)}</p>
        </div>
      </div>
      {item && (
        <p className="character-sheet__breakdown-note">
          🎒 Set up from {item.name} in your Inventory, so its magic and extra damage stay in step.{" "}
          <button
            type="button"
            className="character-sheet__lookup-retry"
            aria-label={`Unlink ${attack.name} from ${item.name}`}
            onClick={() => onUnlink(attack)}
          >
            Unlink
          </button>
        </p>
      )}
    </section>
  );
}

// Sharpshooter in the weapon's row: a small button that's outlined when off
// and filled when on. It changes only this attack's numbers.
function SharpshooterChip({ attack, on, onToggle }) {
  return (
    <button
      type="button"
      className={`character-sheet__chip${on ? " character-sheet__chip--on" : ""}`}
      aria-pressed={on}
      aria-label={`Sharpshooter for ${attack.name}: ${on ? "on, -5 to hit and +10 damage" : "off"}`}
      title={SHARPSHOOTER.summary}
      onClick={onToggle}
    >
      {on ? "● Sharpshooter −5 / +10" : "○ Sharpshooter"}
    </button>
  );
}

// Sharpshooter for one attack: off unless switched on, and never saved on
// the weapon. Its other benefits are said in its tooltip.
export function SharpshooterToggle({ on, onToggle, disabled = false }) {
  return (
    <label className="character-sheet__sharpshooter" title={SHARPSHOOTER.summary}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={onToggle} />
      Sharpshooter ({SHARPSHOOTER.toHit} to hit, +{SHARPSHOOTER.damage} damage)
    </label>
  );
}

// attackPanelFor(attack): the attack panel for the attack being made, shown
// right under that attack's row; null for the others.
// Ways to order the attacks: as added (the default), A to Z, best to-hit
// first, or grouped by damage type.
const damageTypeOf = (attack) => String(attack.damageType ?? "").trim() || "No type";
const ATTACK_SORTS = [
  { key: "added", label: "Order added" },
  { key: "name", label: "Name (A–Z)", compare: () => 0 },
  { key: "toHit", label: "To hit (best first)", compare: (a, b) => (Number(b.toHit) || 0) - (Number(a.toHit) || 0) },
  {
    key: "type",
    label: "Damage type",
    compare: (a, b) => damageTypeOf(a).localeCompare(damageTypeOf(b)),
    groupOf: damageTypeOf,
  },
];

// Show just one damage type (only the types on the list are offered).
function damageTypeFilters(attacks) {
  const types = [...new Set((attacks ?? []).map(damageTypeOf))].sort();
  return types.map((type) => ({
    key: `type:${type.toLowerCase()}`,
    label: type,
    match: (attack) => damageTypeOf(attack) === type,
  }));
}

function CharacterSheetActionsTab({
  onAttack,
  attackPanelFor = null,
  // An attack as it is right now, with effects like Elemental Weapon counted
  // (getEffectiveAttack). The saved attack is what's edited; this is what's
  // shown and rolled.
  effectiveAttackFor = null,
  // Sharpshooter, per attack: sharpshooterFor(attack) is { on } when the
  // character can use it on that attack, else null.
  sharpshooterFor = () => null,
  onSharpshooterToggle = () => {},
  // "How is +13 worked out?" for an attack (getAttackBreakdown), or null.
  breakdownFor = () => null,
  // Inventory links: linkedItemFor(attack) is the inventory weapon an
  // attack is made with (or null); putAway lists [{ item, attacks }] for
  // weapons that aren't equipped, whose attacks are hidden until equipped.
  linkedItemFor = () => null,
  onUnlink = () => {},
  putAway = [],
  onEquipWeapon = () => {},
  // A tap on "From your inventory": the sheet equips the weapon and makes
  // its linked attack. Without it, a standalone attack is made as before.
  onInventoryWeaponAdd = null,
  onEndEffect = () => {},
  // Features that add damage on a hit (Dreadful Strikes). Here, away from a
  // table's attack panel, they're a roll the player adds themselves.
  onHitFeatures = [],
  attacks,
  onAttackAdd,
  onAttackUpdate,
  onAttackRemove,
  equipment = [],
  abilityScores,
  proficiencyNames = [],
  proficiencyBonus = 2,
  fightingStyles = [],
}) {
  // Without effects (or an older caller), an attack is just as saved.
  const liveAttack = (attack) =>
    effectiveAttackFor
      ? effectiveAttackFor(attack)
      : {
          ...attack,
          toHit: Number(attack.toHit) || 0,
          damageParts: [{ dice: attack.damage ?? "", type: attack.damageType ?? "", source: attack.name }],
          optionalParts: [],
          modifiers: [],
          effects: [],
          isEnchanted: false,
        };
  // One damage text for the roll dock's critical-hit damage ("1d4+5+1d4").
  const rollableDamage = (live) =>
    live.damageParts
      .map((part) => part.dice)
      .filter(Boolean)
      .join("+");
  const [allWeapons, setAllWeapons] = useState([]);
  // The attack whose "How it adds up" card is open (one at a time).
  const [openBreakdown, setOpenBreakdown] = useState(null);
  function closeBreakdown(attackIndex) {
    setOpenBreakdown(null);
    // Back to the button that opened it, so the player keeps their place.
    window.requestAnimationFrame(() => document.getElementById(`breakdown-button-${attackIndex}`)?.focus());
  }
  function toggleBreakdown(attackIndex) {
    if (openBreakdown === attackIndex) {
      closeBreakdown(attackIndex);
      return;
    }
    setOpenBreakdown(attackIndex);
    window.requestAnimationFrame(() => document.getElementById(`breakdown-${attackIndex}`)?.focus());
  }
  // A breakdown of one line (a homebrew weapon's typed number) says nothing
  // new, so it isn't offered.
  const usefulBreakdown = (attack) => {
    const found = breakdownFor(attack);
    return found && found.toHit.length > 1 ? found : null;
  };
  const [addingWeapon, setAddingWeapon] = useState(null);
  const [inventoryError, setInventoryError] = useState("");
  const equipmentLookup = useSrdEquipmentLookup();
  const detailView = useSrdDetailView();

  useEffect(() => {
    getWeapons()
      .then(setAllWeapons)
      .catch(() => {
        // Autocomplete is a nice-to-have - freeform entry still works if this fails.
      });
  }, []);

  // When the name is a known weapon (or a magic one like "+1 Longsword"),
  // fill in to hit and damage from the character's own scores and say how
  // the to-hit number was worked out.
  // values: the rest of the form, so the Magic choice is counted (a "+1"
  // in the name sets the Magic choice too).
  function getWeaponAutofill(name, values = {}) {
    const { baseName, magicBonus: nameBonus } = splitMagicWeaponName(name);
    const choice = nameBonus > 0 ? String(nameBonus) : (values.magic ?? "");
    const magicBonus = Number(choice) || 0;
    const match = allWeapons.find(
      (weapon) => weapon.name.toLowerCase() === baseName.toLowerCase(),
    );
    if (!match) return nameBonus > 0 ? { toHitHint: "", magic: choice } : { toHitHint: "" };

    return getWeaponDetails(match.index)
      .then((details) => {
        const math = getWeaponAttackMath({
          weapon: details,
          scores: abilityScores,
          proficiencyNames,
          proficiencyBonus,
          magicBonus,
          fightingStyles,
        });

        return {
          ...(nameBonus > 0 ? { magic: choice } : {}),
          toHit: String(math.toHit),
          damage: math.damage,
          damageType: details.damage?.damage_type?.name ?? "",
          toHitHint: describeToHitMath(math),
        };
      })
      .catch(() => null);
  }

  const genericToHitHint = describeToHitBasics({
    scores: abilityScores,
    proficiencyBonus,
  });

  // One tap turns an inventory weapon into an attack, with to-hit and damage
  // worked out the same way character creation does it.
  function addFromInventory({ item, weapon }) {
    if (onInventoryWeaponAdd) {
      onInventoryWeaponAdd(item);
      return;
    }
    setAddingWeapon(weapon.index);
    setInventoryError("");

    getWeaponDetails(weapon.index)
      .then((details) => {
        const [attack] = buildStartingAttacks({
          gear: [{ ...details, quantity: item.quantity ?? 1 }],
          scores: abilityScores,
          proficiencyNames: item.proficient
            ? [...proficiencyNames, details.name]
            : proficiencyNames,
          proficiencyBonus,
          fightingStyles,
        });
        if (attack) onAttackAdd(attack);
      })
      .catch(() => {
        setInventoryError(
          `Couldn't look up ${weapon.name} right now. Tap Add Weapon to type it in instead.`,
        );
      })
      .finally(() => setAddingWeapon(null));
  }

  const inventoryWeapons = findInventoryWeapons(equipment, allWeapons, [
    ...attacks,
    ...putAway.flatMap((entry) => entry.attacks),
  ]);

  // On-hit features as one small line under the attacks: at a table the
  // attack panel offers them after a hit and keeps track; here the player
  // rolls and keeps track themselves.
  const onHitLine =
    onHitFeatures.length > 0 && (attacks?.length ?? 0) > 0 ? (
        <p className="character-sheet__on-hit-line">
          {onHitFeatures.map((feature) => (
            <span key={feature.key}>
              {feature.name}{" "}
              <RollButton label={`${feature.name} (${feature.type})`} damage={feature.dice}>
                +{feature.dice}
              </RollButton>{" "}
              {feature.type} on a hit <span className="character-sheet__damage-type">({feature.note.replace(/\.$/, "").toLowerCase()})</span>
            </span>
          ))}
        </p>
    ) : null;

  // Weapons put away: their attacks are kept, just hidden until equipped.
  const putAwayLine =
    putAway.length > 0 ? (
      <div className="character-sheet__inventory-weapons">
        <span className="character-sheet__inventory-weapons-label">Put away (not equipped):</span>
        {putAway.map(({ item, attacks: hidden }) => (
          <Button
            key={item.index}
            variant="secondary"
            aria-label={`Equip ${item.name} (${hidden.length} ${hidden.length === 1 ? "attack" : "attacks"})`}
            onClick={() => onEquipWeapon(item)}
          >
            Equip {item.name}
          </Button>
        ))}
      </div>
    ) : null;

  const inventoryFooter =
    inventoryWeapons.length > 0 ? (
      <div className="character-sheet__inventory-weapons">
        <span className="character-sheet__inventory-weapons-label">
          From your inventory:
        </span>
        {inventoryWeapons.map((entry) => (
          <Button
            key={entry.weapon.index}
            variant="secondary"
            aria-label={`Add ${entry.weapon.name} as an attack`}
            disabled={addingWeapon !== null}
            onClick={() => addFromInventory(entry)}
          >
            {addingWeapon === entry.weapon.index
              ? "Adding..."
              : `+ ${entry.weapon.name}`}
          </Button>
        ))}
        {inventoryError && (
          <p className="character-sheet__inventory-weapons-error" role="alert">
            {inventoryError}
          </p>
        )}
      </div>
    ) : null;

  function openAttackDetails(attack) {
    const matches = equipmentLookup.findMatches(attack.name);
    detailView.open(matches[0].name, () =>
      Promise.all(matches.map(equipmentLookup.loadDetails)),
    );
  }

  return (
    <>
      <EditableItemList
        title="Attacks"
        items={attacks}
        getItemId={(item) => item.index}
        fields={[
          {
            key: "name",
            type: "text",
            label: "Weapon",
            caption: "Weapon name",
            placeholder: "Longsword",
            datalistId: "weapon-name-suggestions",
            datalistOptions: allWeapons.map((weapon) => weapon.name),
            getAutofill: getWeaponAutofill,
          },
          // A renamed weapon ("Wisteria's Kiss") keeps working like the
          // weapon it is, so its numbers fill in and stay current.
          {
            key: "baseWeapon",
            type: "text",
            label: "Weapon type",
            caption: "Weapon type",
            placeholder: "Longbow",
            datalistId: "weapon-type-suggestions",
            datalistOptions: allWeapons.map((weapon) => weapon.name),
            getAutofill: (value, values) => getWeaponAutofill(value || values.name, values),
          },
          // Magic +1/+2/+3 counts in to hit and damage, and stays counted.
          {
            key: "magic",
            type: "select",
            label: "Magic",
            caption: "Magic",
            options: MAGIC_OPTIONS,
            fromItem: magicChoiceFor,
            getAutofill: (value, values) => getWeaponAutofill(values.baseWeapon || values.name, { ...values, magic: value }),
          },
          {
            key: "toHit",
            type: "number",
            caption: "To hit",
            placeholder: "+5",
            getHint: (values) => values.toHitHint || genericToHitHint,
          },
          {
            key: "damage",
            type: "text",
            caption: "Damage",
            placeholder: "1d8+3",
          },
          {
            key: "damageType",
            type: "text",
            caption: "Damage type",
            placeholder: "piercing",
          },
          {
            key: "extraDamage",
            type: "custom",
            defaultValue: [],
            fromItem: (item) => (item.extraDamage ?? []).map((row) => ({ ...row })),
            render: ({ value, onChange, values }) => (
              <ExtraDamageEditor value={value} onChange={onChange} weaponName={values.name} />
            ),
          },
          {
            key: "preview",
            type: "custom",
            render: ({ values }) => <AttackPreview values={values} />,
          },
          {
            key: "notes",
            type: "textarea",
            placeholder: "Notes (optional) - one line per bullet point",
          },
        ]}
        columns={[
          // Tap the to-hit to roll the attack, or the damage to roll it.
          {
            key: "toHit",
            label: "To Hit",
            width: "70px",
            format: (item) => {
              const live = liveAttack(item);
              // A new attack whose weapon details are still loading.
              if (item.numbersPending) return <span className="character-sheet__extra-damage--optional">…</span>;
              return (
                <RollButton
                  label={`${item.name} attack`}
                  bonus={live.toHit}
                  attack={{ name: item.name, damage: rollableDamage(live) }}
                >
                  {live.isEnchanted ? "✨ " : ""}
                  {formatModifier(live.toHit)}
                </RollButton>
              );
            },
          },
          {
            key: "damage",
            label: "Damage",
            width: "minmax(170px, 1.3fr)",
            // Each damage part with its own type ("1d8+7 piercing · 1d4
            // psychic"), each its own roll, so types never merge. Extra
            // damage that only applies sometimes is shown lighter, with when.
            format: (item) => {
              if (item.numbersPending) return <span className="character-sheet__extra-damage--optional">Working out…</span>;
              const live = liveAttack(item);
              return (
                <span className="character-sheet__damage-parts">
                  {live.damageParts
                    .filter((part) => part.dice)
                    .map((part, i, shown) => (
                      // The space after each part is outside it, so the
                      // line can break there and nowhere inside a part.
                      <Fragment key={`${part.source}-${i}`}>
                      <span className="character-sheet__damage-part">
                        {parseDamage(part.dice) ? (
                          <RollButton
                            label={`${item.name}: ${i === 0 ? "damage" : part.source} (${part.type || "no type"})`}
                            damage={part.dice}
                          >
                            {part.dice}
                          </RollButton>
                        ) : (
                          part.dice
                        )}
                        {part.type && <span className="character-sheet__damage-type"> {part.type}</span>}
                        {/* The dot ends a line rather than starting the next. */}
                        {i < shown.length - 1 && <span className="character-sheet__damage-sep">{" ·"}</span>}
                      </span>{" "}
                      </Fragment>
                    ))}
                  {live.optionalParts.map((part) => (
                    <span className="character-sheet__damage-part character-sheet__extra-damage--optional" key={part.key}>
                      <RollButton label={`${item.name}: ${part.source} (${part.type}, ${part.condition})`} damage={part.dice}>
                        +{part.dice}
                      </RollButton>{" "}
                      {part.type} {part.condition}
                    </span>
                  ))}
                </span>
              );
            },
          },
        ]}
        emptyText="Weapons and other attacks go here. Tap Add Weapon and start typing a weapon's name: its damage fills in for you. Attack spells like Fire Bolt live on the Spells tab."
        footer={
          onHitLine || putAwayLine || inventoryFooter ? (
            <>
              {onHitLine}
              {putAwayLine}
              {inventoryFooter}
            </>
          ) : null
        }
        addButtonLabel="Add Weapon"
        rowAction={onAttack ? { label: "Attack", onClick: onAttack } : null}
        // Under each enchanted weapon: what's on it and End. The attack
        // panel (on your turn at a table) opens under it too.
        // Under the row: what's enchanting it, the "How it adds up" card when
        // open, and the attack panel (on your turn at a table).
        rowPanel={(attack) => {
          const live = liveAttack(attack);
          const panel = attackPanelFor ? attackPanelFor(attack) : null;
          const breakdown = openBreakdown === attack.index ? usefulBreakdown(attack) : null;
          if (!live.isEnchanted && !panel && !breakdown) return null;
          return (
            <>
              <EffectStrip
                effects={live.effects}
                describe={(effect) =>
                  live.modifiers
                    .filter((modifier) => modifier.source === effect.spell)
                    .map((modifier) => modifier.text)
                    .join(", ")
                }
                onEnd={onEndEffect}
              />
              {breakdown && (
                <AttackBreakdown
                  attack={attack}
                  live={live}
                  breakdown={breakdown}
                  item={linkedItemFor(attack)}
                  onClose={() => closeBreakdown(attack.index)}
                  onUnlink={(linked) => {
                    closeBreakdown(attack.index);
                    onUnlink(linked);
                  }}
                />
              )}
              {panel}
            </>
          );
        }}
        // Under the weapon's name: Sharpshooter (when the character has it;
        // the attack panel has its own while it's open) and "How it adds up".
        primaryExtra={(attack) => {
          const sharpshooter = sharpshooterFor(attack);
          const panelOpen = Boolean(attackPanelFor && attackPanelFor(attack));
          const hasBreakdown = Boolean(usefulBreakdown(attack));
          if (!(sharpshooter && !panelOpen) && !hasBreakdown) return null;
          return (
            <span className="character-sheet__attack-controls">
              {sharpshooter && !panelOpen && (
                <SharpshooterChip attack={attack} on={sharpshooter.on} onToggle={() => onSharpshooterToggle(attack)} />
              )}
              {hasBreakdown && (
                <button
                  type="button"
                  id={`breakdown-button-${attack.index}`}
                  className="character-sheet__details-toggle character-sheet__breakdown-toggle"
                  aria-expanded={openBreakdown === attack.index}
                  onClick={() => toggleBreakdown(attack.index)}
                >
                  How it adds up
                </button>
              )}
            </span>
          );
        }}
        onAdd={onAttackAdd}
        onUpdate={onAttackUpdate}
        onRemove={onAttackRemove}
        // The pencil and trash wait behind "Edit attacks", so rows stay calm in play.
        hasEditToggle
        editToggleLabel="Edit attacks"
        // A magic weapon says so beside its name.
        // A magic weapon says so beside its name; 🎒 marks one set up from
        // the Inventory (its card says more and offers Unlink).
        formatPrimaryLabel={(attack) =>
          `${attack.name}${liveAttack(attack).isMagicWeapon ? " ✨" : ""}${linkedItemFor(attack) ? " 🎒" : ""}`
        }
        isNameClickable={(attack) =>
          equipmentLookup.findMatches(attack.name).length > 0
        }
        onNameClick={openAttackDetails}
        // Sort and Show above the list; the choice is remembered here.
        viewKey="attacks"
        sortOptions={ATTACK_SORTS}
        filterOptions={damageTypeFilters(attacks)}
      />
      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </>
  );
}

export default CharacterSheetActionsTab;
