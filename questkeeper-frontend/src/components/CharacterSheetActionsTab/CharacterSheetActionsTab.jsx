import { useEffect, useState } from "react";
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
  splitMagicWeaponName,
} from "../../utils/characterSheet";

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
  onEndEffect = () => {},
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
  function getWeaponAutofill(name) {
    const { baseName, magicBonus } = splitMagicWeaponName(name);
    const match = allWeapons.find(
      (weapon) => weapon.name.toLowerCase() === baseName.toLowerCase(),
    );
    if (!match) return { toHitHint: "" };

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

  const inventoryWeapons = findInventoryWeapons(equipment, allWeapons, attacks);

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
            placeholder: "Weapon name (e.g. Night Terror Longsword)",
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
            placeholder: "Weapon type, if you renamed it (e.g. Longbow)",
            datalistId: "weapon-type-suggestions",
            datalistOptions: allWeapons.map((weapon) => weapon.name),
            getAutofill: getWeaponAutofill,
          },
          {
            key: "toHit",
            type: "number",
            placeholder: "To Hit",
            getHint: (values) => values.toHitHint || genericToHitHint,
          },
          {
            key: "damage",
            type: "text",
            placeholder: "Damage (e.g. 2d8+10)",
          },
          {
            key: "damageType",
            type: "text",
            placeholder: "Type (e.g. Slashing)",
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
            width: "100px",
            // The weapon's damage, then each effect's extra dice as its own
            // roll with its type ("+1d4 fire"), so types never merge.
            format: (item) => {
              const [own, ...extras] = liveAttack(item).damageParts;
              return (
                <>
                  {parseDamage(own.dice) ? (
                    <RollButton label={`${item.name} damage`} damage={own.dice}>
                      {own.dice}
                    </RollButton>
                  ) : (
                    own.dice
                  )}
                  {extras.map((part) => (
                    <span className="character-sheet__extra-damage" key={part.source}>
                      {" + "}
                      <RollButton label={`${item.name}: ${part.source} (${part.type})`} damage={part.dice}>
                        {part.dice} {part.type}
                      </RollButton>
                    </span>
                  ))}
                </>
              );
            },
          },
          { key: "damageType", label: "Type", width: "110px" },
        ]}
        emptyText="Weapons and other attacks go here. Tap Add Weapon and start typing a weapon's name: its damage fills in for you. Attack spells like Fire Bolt live on the Spells tab."
        footer={inventoryFooter}
        addButtonLabel="Add Weapon"
        rowAction={onAttack ? { label: "Attack", onClick: onAttack } : null}
        // Under each enchanted weapon: what's on it and End. The attack
        // panel (on your turn at a table) opens under it too.
        rowPanel={(attack) => {
          const live = liveAttack(attack);
          const panel = attackPanelFor ? attackPanelFor(attack) : null;
          if (!live.isEnchanted && !panel) return null;
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
              {panel}
            </>
          );
        }}
        onAdd={onAttackAdd}
        onUpdate={onAttackUpdate}
        onRemove={onAttackRemove}
        // The pencil and trash wait behind "Edit attacks", so rows stay calm in play.
        hasEditToggle
        editToggleLabel="Edit attacks"
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
