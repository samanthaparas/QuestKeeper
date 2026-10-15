import RollButton from "../RollDock/RollButton";
import EditableItemList from "../EditableItemList/EditableItemList";
import { parseDamage } from "../../utils/attacks";
import { formatModifier } from "../../utils/characterSheet";
import "./CompanionCard.css";

// The companion in combat, on the Actions tab: HP to track, AC and speed at a
// glance, and its attacks, which roll like the character's (tap the to-hit to
// attack, the damage to roll damage). Its name, notes and other details stay
// on the Story tab.
function CompanionCard({ companion, onHpChange, onAttackAdd, onAttackUpdate, onAttackRemove }) {
  const name = companion.name || "Companion";
  const hp = companion.hitPoints ?? { current: 0, max: 0 };

  return (
    <section className="companion-card" aria-label={`${name}, your companion`}>
      <div className="companion-card__head">
        <h2 className="companion-card__name">🐾 {name}</h2>
        <div className="companion-card__stats">
          <label className="companion-card__stat companion-card__stat--hp">
            <span className="companion-card__label">HP</span>
            <span className="companion-card__value">
              <input
                type="number"
                className="companion-card__input"
                aria-label={`${name}'s current HP`}
                value={hp.current}
                min={0}
                max={hp.max || undefined}
                onChange={(event) => onHpChange("current", event.target.value)}
              />
              <span aria-hidden="true">/</span>
              <span>{hp.max}</span>
            </span>
          </label>
          <span className="companion-card__stat">
            <span className="companion-card__label">AC</span>
            <span className="companion-card__value">{companion.armorClass ?? 10}</span>
          </span>
          <span className="companion-card__stat">
            <span className="companion-card__label">Speed</span>
            <span className="companion-card__value">{companion.speed ?? 30} ft</span>
          </span>
        </div>
      </div>

      <EditableItemList
        title={`${name}'s attacks`}
        items={companion.attacks ?? []}
        getItemId={(item) => item.id}
        fields={[
          { key: "name", type: "text", label: "Attack", placeholder: "Attack (e.g. Bite)" },
          { key: "toHit", type: "number", placeholder: "To Hit" },
          { key: "damage", type: "text", placeholder: "Damage (e.g. 2d4+2)" },
          { key: "damageType", type: "text", placeholder: "Type (e.g. Piercing)" },
          { key: "notes", type: "textarea", placeholder: "Notes (e.g. knocks prone on a hit)" },
        ]}
        columns={[
          {
            key: "toHit",
            label: "To Hit",
            width: "70px",
            format: (item) => (
              <RollButton
                label={`${name}: ${item.name} attack`}
                bonus={Number(item.toHit) || 0}
                attack={{ name: `${name}: ${item.name}`, damage: item.damage }}
              >
                {formatModifier(Number(item.toHit) || 0)}
              </RollButton>
            ),
          },
          {
            key: "damage",
            label: "Damage",
            width: "100px",
            format: (item) =>
              parseDamage(item.damage) ? (
                <RollButton label={`${name}: ${item.name} damage`} damage={item.damage}>
                  {item.damage}
                </RollButton>
              ) : (
                item.damage
              ),
          },
          { key: "damageType", label: "Type", width: "110px" },
        ]}
        emptyText={`Add ${name}'s attacks (a wolf's Bite, a hawk's Talons) so you can roll them here in a fight.`}
        addButtonLabel="Add Attack"
        onAdd={onAttackAdd}
        onUpdate={onAttackUpdate}
        onRemove={onAttackRemove}
      />
    </section>
  );
}

export default CompanionCard;
