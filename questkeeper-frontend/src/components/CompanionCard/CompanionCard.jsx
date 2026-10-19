import { useState } from "react";
import RollButton from "../RollDock/RollButton";
import EditableItemList from "../EditableItemList/EditableItemList";
import PortraitUpload from "../PortraitUpload/PortraitUpload";
import Button from "../Button/Button";
import { parseDamage } from "../../utils/attacks";
import {
  ABILITY_ABBREVIATIONS,
  ABILITY_SCORES,
  createCompanionAbilityScores,
  formatModifier,
  getAbilityModifier,
  getCompanionSave,
  getSummonStats,
  SUMMON_TEMPLATES,
} from "../../utils/characterSheet";
import "./CompanionCard.css";

// The companion's whole card, on the Actions tab. Everything about the
// companion lives here (there's no separate Story tab section any more):
// - Picture beside its name; tap it to upload one. It's saved as its own
//   file next to the character's portrait.
// - HP (current HP can always be typed), AC and speed.
// - Its six ability scores. Tap a modifier to roll that check, or a "Save"
//   to roll that saving throw. Saves the stat block lists as better than the
//   modifier are typed while editing and shown filled in, like the
//   character's proficient saves.
// - Its attacks, which roll like the character's.
// - Bulleted notes (tricks it knows, barding, personality).
//
// Like the character's own stats, the name, AC, speed, max HP and scores are
// locked until the player taps "Edit stats", so a stray tap can't change them.
//
// A companion can also follow a summon spell's rules (Fable and Summon Fey,
// switched on under "Edit stats"). Then a Summon panel casts it (choosing
// the slot or a free cast, the mood, and concentration or 1 minute), the
// AC, HP, scores and attack come from the spell level, and while it isn't
// summoned no numbers are shown at all. Its saved numbers stay underneath.

// The Summon panel: cast it, or see what's up and dismiss it.
function SummonPanel({ name, summon, onSummon }) {
  const { template } = summon;
  const levels = summon.slots.map((slot) => slot.level);
  const [slotLevel, setSlotLevel] = useState(levels[0] ?? template.baseLevel);
  const [payWith, setPayWith] = useState(summon.freeCast?.current > 0 ? "free" : "slot");
  const [mood, setMood] = useState(template.moods[0].key);
  const [concentration, setConcentration] = useState(true);

  if (summon.present) {
    return (
      <div className="companion-card__summon" role="group" aria-label={`${name}'s summon`}>
        <p className="companion-card__summon-line">
          <strong>Summoned</strong> with {template.spell} at level {summon.slotLevel}
          {" · "}
          {summon.concentration
            ? "Concentration, up to 1 hour"
            : `No concentration: ${summon.roundsLeft ?? template.shortRounds} of ${template.shortRounds} rounds left`}
        </p>
        {summon.mood && (
          <p className="companion-card__summon-note">
            <strong>{summon.mood.name}:</strong> {summon.mood.note}
          </p>
        )}
        <ul className="companion-card__summon-notes">
          {template.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <Button variant="secondary" onClick={() => onSummon("dismiss")}>
          Dismiss {name}
        </Button>
      </div>
    );
  }

  const freeLeft = summon.freeCast?.current ?? 0;
  const slot = summon.slots.find((item) => item.level === Number(slotLevel));
  const castLevel = payWith === "free" ? template.baseLevel : Number(slotLevel);
  const preview = getSummonStats(template, castLevel, summon.stats.toHit);
  const canCast = payWith === "free" ? freeLeft > 0 : (slot?.current ?? 0) > 0;
  const usesConcentration = concentration || !summon.canSkipConcentration;

  return (
    <div className="companion-card__summon" role="group" aria-label={`Summon ${name}`}>
      <p className="companion-card__summon-line">
        <strong>Not summoned.</strong> Cast {template.spell} to bring {name} here.
      </p>
      <div className="companion-card__summon-form">
        {summon.freeCast && (
          <label className="companion-card__summon-choice">
            <input
              type="radio"
              name="summon-pay"
              checked={payWith === "free"}
              disabled={freeLeft <= 0}
              onChange={() => setPayWith("free")}
            />
            Free cast, level {template.baseLevel} ({freeLeft}/1 left)
          </label>
        )}
        <label className="companion-card__summon-choice">
          <input
            type="radio"
            name="summon-pay"
            checked={payWith === "slot"}
            disabled={levels.length === 0}
            onChange={() => setPayWith("slot")}
          />
          Spell slot
          <select
            aria-label="Spell slot level"
            value={slotLevel}
            disabled={payWith !== "slot" || levels.length === 0}
            onChange={(event) => setSlotLevel(Number(event.target.value))}
          >
            {summon.slots.map((item) => (
              <option key={item.level} value={item.level}>
                Level {item.level} ({item.current}/{item.max} left)
              </option>
            ))}
          </select>
        </label>
        <label className="companion-card__summon-choice">
          Mood
          <select aria-label="Mood" value={mood} onChange={(event) => setMood(event.target.value)}>
            {template.moods.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {summon.canSkipConcentration && (
          <label className="companion-card__summon-choice">
            <input
              type="checkbox"
              checked={!concentration}
              onChange={(event) => setConcentration(!event.target.checked)}
            />
            No concentration, lasts 1 minute ({template.noConcentrationFeature})
          </label>
        )}
      </div>
      <p className="companion-card__summon-note">
        At level {preview.level}: AC {preview.armorClass}, {preview.maxHp} HP, {preview.attackCount}{" "}
        {preview.attackCount === 1 ? "attack" : "attacks"} a turn.{" "}
        {usesConcentration
          ? summon.otherConcentration
            ? `Casting ends your concentration on ${summon.otherConcentration}.`
            : "Needs concentration, up to 1 hour."
          : "No concentration needed; lasts 10 rounds."}
      </p>
      <Button
        disabled={!canCast}
        onClick={() =>
          onSummon("cast", { slotLevel: castLevel, payWith, mood, concentration: usesConcentration })
        }
      >
        Cast {template.spell}
      </Button>
    </div>
  );
}

// The summon's one attack, rolled with the spell's numbers. Piercing and
// force are separate rolls, so each type can be resisted on its own.
function SummonAttack({ name, summon }) {
  const { stats, attackName } = summon;
  return (
    <div className="companion-card__summon-attack" aria-label={`${name}'s attacks`}>
      <span className="companion-card__summon-attack-name">
        {attackName}
        <span className="companion-card__summon-attack-count">
          {" "}
          ({stats.attackCount} {stats.attackCount === 1 ? "attack" : "attacks"} a turn)
        </span>
      </span>
      <RollButton
        label={`${name}: ${attackName} attack`}
        bonus={stats.toHit}
        attack={{ name: `${name}: ${attackName}`, damage: stats.damage }}
      >
        {formatModifier(stats.toHit)} to hit
      </RollButton>
      <RollButton label={`${name}: ${attackName} damage (${stats.damageType.toLowerCase()})`} damage={stats.damage}>
        {stats.damage} {stats.damageType.toLowerCase()}
      </RollButton>
      <span aria-hidden="true">+</span>
      <RollButton
        label={`${name}: ${attackName} damage (${stats.extraDamageType.toLowerCase()})`}
        damage={stats.extraDamage}
      >
        {stats.extraDamage} {stats.extraDamageType.toLowerCase()}
      </RollButton>
    </div>
  );
}

// Under "Edit stats": switch the summon spell's rules on or off, and name
// the attack (Fable's "Bite" keeps the spell's numbers).
function SummonLink({ name, companion, summon, onSummon }) {
  if (!summon) {
    return (
      <div className="companion-card__summon-link">
        {Object.values(SUMMON_TEMPLATES).map((template) => (
          <Button key={template.key} variant="secondary" onClick={() => onSummon("link", { template: template.key })}>
            Use {template.spell} rules
          </Button>
        ))}
        <span className="companion-card__summon-hint">
          For a companion you summon with a spell. Its saved numbers are kept.
        </span>
      </div>
    );
  }
  return (
    <div className="companion-card__summon-link">
      <label className="companion-card__summon-choice">
        Attack name
        <input
          type="text"
          className="companion-card__name-input"
          aria-label={`${name}'s attack name`}
          placeholder={summon.template.attackName}
          value={companion.summon?.attackName ?? ""}
          onChange={(event) => onSummon("attackName", { name: event.target.value })}
        />
      </label>
      <Button variant="secondary" onClick={() => onSummon("unlink")}>
        Stop using {summon.template.spell} rules
      </Button>
    </div>
  );
}

const TRASH_ICON_PATH = "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6";

// A number box while editing, or just the number while locked.
function StatValue({ isEditing, label, value, onChange, min = 0, max }) {
  if (!isEditing) return value;
  return (
    <input
      type="number"
      className="companion-card__input"
      aria-label={label}
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

// The bulleted notes, with a box underneath to add another. A note's trash
// button only shows while the card's "Edit stats" is open, like the other
// lists' Edit buttons; adding a note works any time.
function CompanionNotes({ name, notes, onChange, isEditing = false }) {
  const [draft, setDraft] = useState("");

  function addNote(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onChange([...notes, { id: crypto.randomUUID(), text }]);
    setDraft("");
  }

  return (
    <div className="companion-card__notes">
      <h3 className="companion-card__notes-title">Notes</h3>

      {notes.length > 0 && (
        <ul className="companion-card__notes-list">
          {notes.map((note) => (
            <li className="companion-card__note" key={note.id}>
              <span>{note.text}</span>
              {isEditing && (
                <button
                  type="button"
                  className="companion-card__note-remove"
                  aria-label={`Remove note: ${note.text}`}
                  title="Remove note"
                  onClick={() => onChange(notes.filter((other) => other.id !== note.id))}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                    <path
                      d={TRASH_ICON_PATH}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="companion-card__note-form" onSubmit={addNote}>
        <input
          type="text"
          className="companion-card__note-input"
          aria-label={`New note about ${name}`}
          placeholder="Add a note (e.g. Knows the Help action, wears barding)"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={!draft.trim()}>
          Add note
        </Button>
      </form>
    </div>
  );
}

function CompanionCard({
  companion,
  notes = [],
  userId,
  characterId,
  onPortraitUpload,
  onFieldChange,
  onHpChange,
  onAbilityChange,
  onSaveChange,
  onNotesChange,
  onAttackAdd,
  onAttackUpdate,
  onAttackRemove,
  // From getSummonInfo: null for an ordinary companion.
  summon = null,
  onSummon = () => {},
}) {
  const [isEditing, setIsEditing] = useState(false);
  const name = companion.name || "Companion";
  // A summon away (not cast) has no numbers to show; one that's here uses
  // the spell's, which can't be typed over.
  const isSummon = Boolean(summon);
  const showNumbers = !isSummon || summon.present;
  const editNumbers = isEditing && !isSummon;
  const hp = isSummon ? (summon.hp ?? { current: 0, max: 0 }) : (companion.hitPoints ?? { current: 0, max: 0 });
  const scores = createCompanionAbilityScores(isSummon ? summon.stats.abilityScores : companion.abilityScores);
  const shown = isSummon
    ? { ...companion, armorClass: summon.stats.armorClass, speed: summon.stats.speed, savingThrows: {}, abilityScores: scores }
    : companion;

  return (
    <section className="companion-card" aria-label={`${name}, your companion`}>
      <div className="companion-card__head">
        <div className="companion-card__who">
          {onPortraitUpload && (
            <PortraitUpload
              userId={userId}
              characterId={`${characterId}-companion`}
              name={name}
              portraitUrl={companion.portraitUrl}
              onUpload={onPortraitUpload}
              size="tiny"
              uploadLabel={companion.portraitUrl ? `Change ${name}'s picture` : `Upload a picture of ${name}`}
            />
          )}
          {isEditing ? (
            <input
              type="text"
              className="companion-card__name-input"
              aria-label="Companion's name"
              placeholder="e.g. Victory"
              value={companion.name ?? ""}
              onChange={(event) => onFieldChange("name", event.target.value)}
            />
          ) : (
            // The paw stands in for a picture until there is one.
            <h2 className="companion-card__name">
              {companion.portraitUrl ? name : `🐾 ${name}`}
            </h2>
          )}
        </div>

        {showNumbers && (
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
                  onChange={(event) =>
                    isSummon
                      ? onSummon("hp", { value: event.target.value })
                      : onHpChange("current", event.target.value)
                  }
                />
                <span aria-hidden="true">/</span>
                <StatValue
                  isEditing={editNumbers}
                  label={`${name}'s max HP`}
                  value={hp.max}
                  onChange={(value) => onHpChange("max", value)}
                />
              </span>
            </label>
            <span className="companion-card__stat">
              <span className="companion-card__label">AC</span>
              <span className="companion-card__value">
                <StatValue
                  isEditing={editNumbers}
                  label={`${name}'s AC`}
                  value={shown.armorClass ?? 10}
                  onChange={(value) => onFieldChange("armorClass", value)}
                />
              </span>
            </span>
            <span className="companion-card__stat">
              <span className="companion-card__label">Speed</span>
              <span className="companion-card__value">
                <StatValue
                  isEditing={editNumbers}
                  label={`${name}'s speed`}
                  value={shown.speed ?? 30}
                  onChange={(value) => onFieldChange("speed", value)}
                />{" "}
                ft
              </span>
            </span>
          </div>
        )}

        {/* Same lock as the character's own "Edit stats" button. */}
        <button
          type="button"
          className={`character-sheet__stats-lock${isEditing ? " character-sheet__stats-lock--open" : ""}`}
          aria-pressed={isEditing}
          title={
            isEditing
              ? `Lock ${name}'s stats again so a stray tap can't change them`
              : isSummon
                ? `Unlock to change ${name}'s name or attack name, or stop using the spell's rules`
                : `Unlock to change ${name}'s name, max HP, AC, speed, ability scores and saves`
          }
          onClick={() => setIsEditing((editing) => !editing)}
        >
          {isEditing ? "🔓 Done editing" : "🔒 Edit stats"}
        </button>
      </div>

      {isEditing && <SummonLink name={name} companion={companion} summon={summon} onSummon={onSummon} />}

      {/* Keyed on the cast, so a new cast starts the panel's choices fresh. */}
      {isSummon && <SummonPanel key={String(summon.present)} name={name} summon={summon} onSummon={onSummon} />}

      {showNumbers && (
        <ul className="companion-card__abilities" aria-label={`${name}'s ability scores`}>
          {ABILITY_SCORES.map((ability) => {
            const abbreviation = ABILITY_ABBREVIATIONS[ability];
            const modifier = getAbilityModifier(scores[ability]);
            const save = getCompanionSave(shown, ability);
            const hasSaveBonus = typeof shown.savingThrows?.[ability] === "number";
            return (
              <li className="companion-card__ability" key={ability}>
                <span className="companion-card__ability-top">
                  <span className="companion-card__label">{abbreviation}</span>
                  <span className="companion-card__ability-score">
                    <StatValue
                      isEditing={editNumbers}
                      label={`${name}'s ${abbreviation} score`}
                      value={scores[ability]}
                      onChange={(value) => onAbilityChange(ability, value)}
                      min={1}
                      max={30}
                    />
                  </span>
                  <RollButton
                    className="companion-card__ability-mod"
                    label={`${name}: ${abbreviation} check`}
                    bonus={modifier}
                  >
                    {formatModifier(modifier)}
                  </RollButton>
                </span>

                {editNumbers ? (
                  // Left empty, the save is just the modifier.
                  <label className="companion-card__save companion-card__save--editing">
                    Save
                    <input
                      type="number"
                      className="companion-card__input"
                      aria-label={`${name}'s ${abbreviation} save bonus`}
                      placeholder={formatModifier(modifier)}
                      value={hasSaveBonus ? companion.savingThrows[ability] : ""}
                      onChange={(event) => onSaveChange(ability, event.target.value)}
                    />
                  </label>
                ) : (
                  <RollButton
                    className={`companion-card__save${hasSaveBonus ? " companion-card__save--bonus" : ""}`}
                    label={`${name}: ${abbreviation} save`}
                    bonus={save}
                  >
                    Save {formatModifier(save)}
                  </RollButton>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isSummon ? (
        showNumbers && <SummonAttack name={name} summon={summon} />
      ) : (
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
          // The pencil and trash wait behind "Edit attacks", so rows stay calm in play.
          hasEditToggle
          editToggleLabel="Edit attacks"
        />
      )}

      <CompanionNotes name={name} notes={notes} onChange={onNotesChange} isEditing={isEditing} />

    </section>
  );
}

export default CompanionCard;
