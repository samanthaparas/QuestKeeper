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

// The bulleted notes, with a box underneath to add another.
function CompanionNotes({ name, notes, onChange }) {
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
  onRemove,
  onAttackAdd,
  onAttackUpdate,
  onAttackRemove,
}) {
  const [isEditing, setIsEditing] = useState(false);
  // Remove asks first ("Remove Victory? ... Remove / Keep").
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const name = companion.name || "Companion";
  const hp = companion.hitPoints ?? { current: 0, max: 0 };
  const scores = createCompanionAbilityScores(companion.abilityScores);

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
              <StatValue
                isEditing={isEditing}
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
                isEditing={isEditing}
                label={`${name}'s AC`}
                value={companion.armorClass ?? 10}
                onChange={(value) => onFieldChange("armorClass", value)}
              />
            </span>
          </span>
          <span className="companion-card__stat">
            <span className="companion-card__label">Speed</span>
            <span className="companion-card__value">
              <StatValue
                isEditing={isEditing}
                label={`${name}'s speed`}
                value={companion.speed ?? 30}
                onChange={(value) => onFieldChange("speed", value)}
              />{" "}
              ft
            </span>
          </span>
        </div>

        {/* Same lock as the character's own "Edit stats" button. */}
        <button
          type="button"
          className={`character-sheet__stats-lock${isEditing ? " character-sheet__stats-lock--open" : ""}`}
          aria-pressed={isEditing}
          title={
            isEditing
              ? `Lock ${name}'s stats again so a stray tap can't change them`
              : `Unlock to change ${name}'s name, max HP, AC, speed, ability scores and saves`
          }
          onClick={() => setIsEditing((editing) => !editing)}
        >
          {isEditing ? "🔓 Done editing" : "🔒 Edit stats"}
        </button>
      </div>

      <ul className="companion-card__abilities" aria-label={`${name}'s ability scores`}>
        {ABILITY_SCORES.map((ability) => {
          const abbreviation = ABILITY_ABBREVIATIONS[ability];
          const modifier = getAbilityModifier(scores[ability]);
          const save = getCompanionSave(companion, ability);
          const hasSaveBonus = typeof companion.savingThrows?.[ability] === "number";
          return (
            <li className="companion-card__ability" key={ability}>
              <span className="companion-card__ability-top">
                <span className="companion-card__label">{abbreviation}</span>
                <span className="companion-card__ability-score">
                  <StatValue
                    isEditing={isEditing}
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

              {isEditing ? (
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

      <CompanionNotes name={name} notes={notes} onChange={onNotesChange} />

      {/* Only while editing, so it can't be hit by accident. The companion's
          details are kept, so adding a companion again brings them back. */}
      {isEditing &&
        onRemove &&
        (isConfirmingRemove ? (
          <div className="companion-card__confirm" role="group" aria-label={`Remove ${name}?`}>
            <span>
              Remove {name}? Their details are kept, so &ldquo;+ Add a companion&rdquo; brings
              them back.
            </span>
            <Button
              variant="danger"
              onClick={() => {
                setIsConfirmingRemove(false);
                onRemove();
              }}
            >
              Remove
            </Button>
            <Button variant="secondary" onClick={() => setIsConfirmingRemove(false)}>
              Keep {name}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="companion-card__remove"
            onClick={() => setIsConfirmingRemove(true)}
          >
            Remove {name} from this sheet
          </button>
        ))}
    </section>
  );
}

export default CompanionCard;
