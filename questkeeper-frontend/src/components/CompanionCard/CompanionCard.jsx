import { useEffect, useRef, useState } from "react";
import RollButton from "../RollDock/RollButton";
import { useRoller } from "../RollDock/rollContext";
import EditableItemList from "../EditableItemList/EditableItemList";
import PortraitUpload from "../PortraitUpload/PortraitUpload";
import Button from "../Button/Button";
import CompanionIcon from "../CompanionIcon/CompanionIcon";
import { DamageChip, ToHitButton } from "../RollDock/AttackRollButtons";
import WeaponIcon from "../WeaponIcon/WeaponIcon";
import { weaponIconForCompanionAttack } from "../../utils/weaponIcons";
import { focusInPane } from "../../utils/focusInPane";
import {
  ABILITY_ABBREVIATIONS,
  ABILITY_SCORES,
  createCompanionAbilityScores,
  formatModifier,
  getAbilityModifier,
  getCompanionSave,
  getSummonStats,
  companionHeadingId,
  ordinalLevel,
  SUMMON_TEMPLATES,
} from "../../utils/characterSheet";
import "./CompanionCard.css";

// The companion's card, in the Companions part of the Actions tab. One card
// per companion (a mount, a familiar, a summon), each in the same order:
// - Who it is: picture (tap to upload one), name, what it is, and for a
//   summon whether it's here ("Summoned" or "Not summoned").
// - In play: HP (current HP can always be typed) with a slim bar, AC and
//   speed, then its attacks in the same layout as the character's weapons.
// - Folded until opened: "Stats & saves" (ability checks and saves, which
//   roll when tapped) and "Notes" (the player's own bullet points).
//
// The name, AC, speed, max HP and scores are locked until "Edit stats", so a
// stray tap can't change them; editing opens the folds. A companion that's
// just been added opens unlocked with its name box ready.
//
// A companion can also follow a summon spell's rules (Fable and Summon Fey,
// switched on under "Edit stats"). While it isn't summoned the card shows
// no numbers, only "Prepare summon", which opens the setup inside the card:
// how to pay (free cast or a spell slot), the mood and the duration, with a
// preview. Only its final "Summon" button casts and spends anything. Once
// summoned, the card shows the spell's numbers, its attack, Fey Step with
// the mood's effect, how long it lasts, and Dismiss. Its own saved numbers
// stay underneath, untouched.

// How a resource's reset reads in a sentence ("resets on a long rest").
const RESET_WORDS = {
  long: "a long rest",
  short: "a short or long rest",
  dawn: "dawn",
  manual: "when you reset it",
};

// A mood's effect without the "After Fey Step:" lead-in, for lines that
// already say it follows Fey Step.
const effectOnly = (note = "") => {
  const effect = note.replace(/^After [^:]+:\s*/, "");
  return effect.charAt(0).toUpperCase() + effect.slice(1);
};

// One choice drawn as a card: the whole card is the radio's label, so a tap
// anywhere picks it, the arrow keys move between them, and a filled dot
// (not just a colour) shows which is picked.
function ChoiceCard({ name, value, checked, disabled = false, onChange, title, detail }) {
  return (
    <label
      className={`summon-setup__option${checked ? " summon-setup__option--checked" : ""}${
        disabled ? " summon-setup__option--disabled" : ""
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} />
      <span className="summon-setup__option-text">
        <span className="summon-setup__option-title">{title}</span>
        {detail && <span className="summon-setup__option-detail">{detail}</span>}
      </span>
    </label>
  );
}

// Setting up a summon before casting: three choices (how to pay, the mood,
// and how long it lasts), a preview of its numbers and exactly what it
// costs. Picking things here changes nothing on the sheet; only the final
// "Summon <name>" button casts, spends and brings it in. Cancel closes it
// without casting.
function SummonSetup({ id, name, summon, onSummon, onClose }) {
  const { template } = summon;
  const freeLeft = summon.freeCast?.current ?? 0;
  const usableSlots = summon.slots.filter((slot) => slot.current > 0);
  const [slotLevel, setSlotLevel] = useState((usableSlots[0] ?? summon.slots[0])?.level ?? template.baseLevel);
  // A usable free cast first, then a slot that has some left.
  const [payWith, setPayWith] = useState(
    freeLeft > 0 ? "free" : usableSlots.length > 0 || !summon.freeCast ? "slot" : "free",
  );
  const [mood, setMood] = useState(summon.mood?.key ?? template.moods[0].key);
  const [duration, setDuration] = useState("concentration");

  const slot = summon.slots.find((item) => item.level === Number(slotLevel));
  const castLevel = payWith === "free" ? template.baseLevel : Number(slotLevel);
  const preview = getSummonStats(template, castLevel, summon.stats.toHit);
  const canCast = payWith === "free" ? freeLeft > 0 : (slot?.current ?? 0) > 0;
  const usesConcentration = duration === "concentration" || !summon.canSkipConcentration;
  const chosenMood = template.moods.find((item) => item.key === mood) ?? template.moods[0];
  const freeReset = RESET_WORDS[summon.freeCast?.resetOn] ?? RESET_WORDS.long;

  const cost =
    payWith === "free"
      ? `Uses your free cast (cast at ${ordinalLevel(template.baseLevel)} level).`
      : `Uses one ${ordinalLevel(castLevel)}-level spell slot.`;
  const blocked =
    freeLeft <= 0 && usableSlots.length === 0
      ? `Nothing can pay for it: ${summon.freeCast ? "your free cast is used and " : ""}you have no spell slots of ${ordinalLevel(
          template.baseLevel,
        )} level or higher left. They come back on a long rest.`
      : payWith === "slot" && !canCast
        ? `No ${ordinalLevel(castLevel)}-level slots left. Pick another level.`
        : "";

  return (
    <div className="summon-setup" id={id} role="group" aria-labelledby={`${id}-title`}>
      <div className="summon-setup__head">
        <h4 className="summon-setup__title" id={`${id}-title`} tabIndex={-1}>
          <CompanionIcon name="summon-spark" size={22} /> Summon {name}
        </h4>
        <p className="summon-setup__lead">
          Nothing is spent until you tap <strong>Summon {name}</strong>.
        </p>
      </div>

      <fieldset className="summon-setup__group">
        <legend>
          <span className="summon-setup__step" aria-hidden="true">
            1
          </span>{" "}
          Casting cost
        </legend>
        <div className="summon-setup__options">
          {summon.freeCast && (
            <ChoiceCard
              name={`${id}-pay`}
              value="free"
              checked={payWith === "free"}
              disabled={freeLeft <= 0}
              onChange={() => setPayWith("free")}
              title="Free cast"
              detail={
                freeLeft > 0
                  ? `${freeLeft} of ${summon.freeCast.max} left · ${ordinalLevel(template.baseLevel)} level`
                  : `Used · resets on ${freeReset}`
              }
            />
          )}
          {summon.slots.length > 0 && (
            <ChoiceCard
              name={`${id}-pay`}
              value="slot"
              checked={payWith === "slot"}
              disabled={usableSlots.length === 0}
              onChange={() => setPayWith("slot")}
              title={
                summon.slots.length === 1 ? `${ordinalLevel(summon.slots[0].level)}-level spell slot` : "Spell slot"
              }
              detail={
                summon.slots.length === 1
                  ? `${summon.slots[0].current} of ${summon.slots[0].max} available`
                  : `${usableSlots.length > 0 ? "Choose the level below" : "None left"}`
              }
            />
          )}
        </div>
        {summon.slots.length > 1 && payWith === "slot" && (
          <label className="summon-setup__slot-level">
            Slot level
            <select
              aria-label="Spell slot level"
              value={slotLevel}
              onChange={(event) => setSlotLevel(Number(event.target.value))}
            >
              {summon.slots.map((item) => (
                <option key={item.level} value={item.level} disabled={item.current <= 0}>
                  {ordinalLevel(item.level)} level ({item.current} of {item.max} left)
                </option>
              ))}
            </select>
          </label>
        )}
        {summon.slots.length === 0 && (
          <p className="summon-setup__hint">
            No spell slots of {ordinalLevel(template.baseLevel)} level or higher on this sheet.
          </p>
        )}
      </fieldset>

      <fieldset className="summon-setup__group">
        <legend>
          <span className="summon-setup__step" aria-hidden="true">
            2
          </span>{" "}
          {template.moodLabel ?? "Mood"}
          <span className="summon-setup__legend-hint">
            Changes what happens after {template.step?.name ?? "it teleports"}.
          </span>
        </legend>
        <div className="summon-setup__options summon-setup__options--moods summon-setup__options--two-line">
          {template.moods.map((item) => (
            <ChoiceCard
              key={item.key}
              name={`${id}-mood`}
              value={item.key}
              checked={mood === item.key}
              onChange={() => setMood(item.key)}
              title={item.name}
              detail={item.short}
            />
          ))}
        </div>
        {/* The picked mood in full, with its conditions. */}
        <p className="summon-setup__effect" aria-live="polite">
          <strong>{chosenMood.name}:</strong> {chosenMood.note}
        </p>
      </fieldset>

      <fieldset className="summon-setup__group">
        <legend>
          <span className="summon-setup__step" aria-hidden="true">
            3
          </span>{" "}
          Duration
        </legend>
        {summon.canSkipConcentration ? (
          <div className="summon-setup__options summon-setup__options--duration">
            <ChoiceCard
              name={`${id}-duration`}
              value="concentration"
              checked={duration === "concentration"}
              onChange={() => setDuration("concentration")}
              title="Up to 1 hour · Concentration"
            />
            <ChoiceCard
              name={`${id}-duration`}
              value="short"
              checked={duration === "short"}
              onChange={() => setDuration("short")}
              title="1 minute · No concentration"
              detail={template.noConcentrationFeature}
            />
          </div>
        ) : (
          <p className="summon-setup__hint">Up to 1 hour, with concentration.</p>
        )}
      </fieldset>

      {/* What you get, what it costs, and the button, kept together. */}
      <div className="summon-setup__finish">
        <p className="summon-setup__preview">
          <CompanionIcon name="summon-spark" size={18} />
          <span>
            {ordinalLevel(preview.level)} level · {preview.maxHp} HP · AC {preview.armorClass} · Speed {preview.speed}{" "}
            ft · {preview.attackCount} {preview.attackCount === 1 ? "attack" : "attacks"} / turn ·{" "}
            {usesConcentration ? "up to 1 hour" : `1 minute (${template.shortRounds} rounds)`}
          </span>
        </p>

        {usesConcentration && summon.otherConcentration && (
          <p className="summon-setup__warning" role="note">
            Casting this ends your concentration on <strong>{summon.otherConcentration}</strong>.
          </p>
        )}

        <div className="summon-setup__actions">
          {canCast ? (
            <p className="summon-setup__cost">{cost}</p>
          ) : (
            <p className="summon-setup__blocked" id={`${id}-blocked`}>
              {blocked}
            </p>
          )}
          <Button
            disabled={!canCast}
            aria-describedby={canCast ? undefined : `${id}-blocked`}
            onClick={() =>
              onSummon("cast", {
                slotLevel: castLevel,
                payWith,
                mood,
                concentration: usesConcentration,
              })
            }
          >
            Summon {name}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// A summon that isn't here: one line on what it is, and "Prepare summon",
// which opens the setup right here in the card.
function SummonAway({ name, summon, onSummon, idBase }) {
  const [isOpen, setIsOpen] = useState(false);
  const setupId = `${idBase}-setup`;
  const openerId = `${idBase}-prepare`;

  function open() {
    setIsOpen(true);
    window.requestAnimationFrame(() => focusInPane(document.getElementById(`${setupId}-title`)));
  }
  function close() {
    setIsOpen(false);
    // Back to the button that opened it.
    window.requestAnimationFrame(() => focusInPane(document.getElementById(openerId)));
  }

  if (isOpen) return <SummonSetup id={setupId} name={name} summon={summon} onSummon={onSummon} onClose={close} />;
  return (
    <div className="companion-card__away">
      <p className="companion-card__away-text">
        {name} comes when you cast {summon.template.spell}. You choose how to pay, a mood and how long it lasts.
      </p>
      <Button id={openerId} aria-expanded={false} aria-controls={setupId} onClick={open}>
        <CompanionIcon name="summon-spark" size={18} /> Prepare summon
      </Button>
    </div>
  );
}

// At a table, one quiet line above a companion's attacks saying what its
// roll buttons do, since they aren't part of the table's Attack step yet:
// they roll (and share the result when sharing is on), but never pick a
// target, call a hit or deal damage. Away from a table there's nothing to
// explain, so it isn't shown.
function TableRollNote({ name }) {
  const roller = useRoller();
  const [open, setOpen] = useState(false);
  if (!roller?.tableId) return null;
  const id = `table-roll-note-${String(name).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div className="companion-card__table-note">
      <p>
        {roller.sharing
          ? "Rolls are shared with your table. Your DM resolves the hit and applies damage."
          : "Rolls stay on your screen. Tell your DM the result so they can resolve the hit and damage."}{" "}
        <button
          type="button"
          className="companion-card__rules-toggle companion-card__note-toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          How companion rolls work
        </button>
      </p>
      <p id={id} className="companion-card__note-more" hidden={!open}>
        {name}&apos;s buttons roll the dice (or ask for your real dice) and, when sharing is on, post the result to{" "}
        {roller.tableName || "your table"}&apos;s roll log. They don&apos;t pick a target, start an attack at the table
        or deal damage.
      </p>
    </div>
  );
}

// While a summon is here: its attack in the same layout as the weapons
// (the to-hit roll, then each damage type as its own roll, never merged).
function SummonAttack({ name, summon }) {
  const { stats, attackName } = summon;
  return (
    <div className="companion-card__attack-row" role="group" aria-label={`${name}'s attacks`}>
      <span className="companion-card__attack-name">
        {/* The same weapon pictures as the character's attacks: a
            Shortsword, or a renamed "Bite"; anything else, the plain one. */}
        <WeaponIcon iconId={weaponIconForCompanionAttack({ name: attackName })} size={24} />
        <strong>{attackName}</strong>
        <span className="companion-card__muted">
          {stats.attackCount} {stats.attackCount === 1 ? "attack" : "attacks"} / turn
        </span>
      </span>
      <ToHitButton
        label={`${name}: ${attackName} attack`}
        bonus={stats.toHit}
        attack={{ name: `${name}: ${attackName}`, damage: stats.damage }}
      />
      <span className="character-sheet__damage-parts">
        <DamageChip
          label={`${name}: ${attackName} damage, ${stats.damageType.toLowerCase()}`}
          dice={stats.damage}
          type={stats.damageType.toLowerCase()}
        />{" "}
        <DamageChip
          label={`${name}: ${attackName} damage, ${stats.extraDamageType.toLowerCase()}`}
          dice={stats.extraDamage}
          type={stats.extraDamageType.toLowerCase()}
          plus
        />
      </span>
    </div>
  );
}

// Its bonus-action teleport and what the chosen mood adds after it, in two
// short lines, with the full wording (where it can land, the mood's
// conditions) one tap away under "Rules". Guidance only: nothing here
// changes advantage, targets or conditions.
function SummonStep({ summon, idBase }) {
  const [showRules, setShowRules] = useState(false);
  const step = summon.template.step;
  if (!step) return null;
  const rulesId = `${idBase}-step-rules`;
  return (
    <div className="companion-card__step-row">
      <span className="companion-card__attack-name">
        <CompanionIcon name="fey-step" size={18} />
        <strong>{step.name}</strong>
        <span className="companion-card__muted">· {step.action}</span>
      </span>
      <span className="companion-card__step-text">
        Teleport up to {step.distance} ft
        {summon.mood ? (
          <>
            {" · "}
            <strong>{summon.mood.name}:</strong> {summon.mood.effect ?? effectOnly(summon.mood.note)}
          </>
        ) : null}
      </span>
      <button
        type="button"
        className="companion-card__rules-toggle"
        aria-expanded={showRules}
        aria-controls={rulesId}
        onClick={() => setShowRules((open) => !open)}
      >
        {showRules ? "Hide rules" : "Rules"}
      </button>
      <p className="companion-card__step-rules" id={rulesId} hidden={!showRules}>
        It teleports up to {step.distance} ft to {step.destination ?? "a space it can see"}.{" "}
        {summon.mood ? summon.mood.note : "Then its mood's effect happens."}
      </p>
    </div>
  );
}

// How long it lasts, always in view (never folded away), with Dismiss.
function SummonDuration({ name, summon, onSummon }) {
  const { template } = summon;
  return (
    <div className="companion-card__duration-row">
      <span className="companion-card__duration">
        {summon.concentration ? (
          <>
            <CompanionIcon name="concentration" size={18} />
            <strong>Concentrating</strong> · up to 1 hour
          </>
        ) : (
          <>
            <CompanionIcon name="duration-clock" size={18} />
            <strong>No concentration</strong> · {summon.roundsLeft ?? template.shortRounds} of {template.shortRounds}{" "}
            rounds left
          </>
        )}
        <span className="companion-card__muted"> · cast at {ordinalLevel(summon.slotLevel)} level</span>
      </span>
      <Button variant="secondary" onClick={() => onSummon("dismiss")}>
        Dismiss {name}
      </Button>
    </div>
  );
}

// A section of the card that opens and closes (Stats & saves, Notes). The
// button says whether it's open, and the part it opens stays in the page
// (just hidden), so its open state survives live updates.
function Fold({ id, title, icon, summary = "", isOpen, onToggle, children }) {
  return (
    <div className="companion-card__fold">
      <button
        type="button"
        className="companion-card__fold-toggle"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={onToggle}
      >
        <span className="companion-card__fold-chevron" aria-hidden="true">
          {isOpen ? "▾" : "▸"}
        </span>
        {icon && <CompanionIcon name={icon} size={18} />}
        {title}
        {summary && <span className="companion-card__muted"> {summary}</span>}
      </button>
      <div id={id} className="companion-card__fold-body" hidden={!isOpen}>
        {children}
      </div>
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
          Only for a companion you bring in with the <strong>Summon Fey</strong> spell (rangers, druids, warlocks
          and wizards can learn it): its numbers then come from the spell&apos;s level. A pet, mount, familiar or
          beast companion doesn&apos;t need this, and other summon spells aren&apos;t built in yet: just type their
          stats. Its saved numbers are kept either way.
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
  // The character's name, for "Acts right after Pippa".
  ownerName = "",
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
  // Removes this companion (a character can have several). Only offered
  // while its stats are unlocked, and it asks once first.
  onRemove = null,
  // Just added: the card opens unlocked with its name box ready to type in,
  // so setting it up doesn't mean hunting for "Edit stats".
  isNew = false,
}) {
  const [isEditing, setIsEditing] = useState(isNew);
  const nameInput = useRef(null);
  useEffect(() => {
    if (isNew) nameInput.current?.focus();
  }, [isNew]);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  // Stats & saves and Notes start folded in play; editing opens them.
  const [statsOpen, setStatsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const name = companion.name || "Companion";
  const idBase = companionHeadingId(companion.id).replace(/-name$/, "");
  // A summon away (not cast) has no numbers to show; one that's here uses
  // the spell's, which can't be typed over.
  const isSummon = Boolean(summon);
  const present = isSummon && summon.present;
  const showNumbers = !isSummon || present;
  const editNumbers = isEditing && !isSummon;
  const hp = isSummon ? (summon.hp ?? { current: 0, max: 0 }) : (companion.hitPoints ?? { current: 0, max: 0 });
  const hpShare = hp.max > 0 ? Math.max(0, Math.min(1, (Number(hp.current) || 0) / hp.max)) : 0;
  const scores = createCompanionAbilityScores(isSummon ? summon.stats.abilityScores : companion.abilityScores);
  // Nothing filled in yet (no name, no HP, not a summon): it asks to be set up.
  const isBlank = !isSummon && !companion.name?.trim() && !(Number(companion.hitPoints?.max) > 0);
  const shown = isSummon
    ? { ...companion, armorClass: summon.stats.armorClass, speed: summon.stats.speed, savingThrows: {}, abilityScores: scores }
    : companion;
  // What it is, under its name: "Fey Spirit · Summon Fey · Fuming".
  const kind = isSummon
    ? [summon.template.creature, summon.template.spell, present && summon.mood ? summon.mood.name : ""]
        .filter(Boolean)
        .join(" · ")
    : "Companion";
  // The spell's rules for the folded part (Fey Step and its turn have their
  // own lines above, so they aren't repeated).
  const ruleNotes = isSummon ? summon.template.notes.filter((note) => !/^Fey Step|^Takes its turn/.test(note)) : [];

  return (
    <section
      className={`companion-card companion-card--${isSummon ? (present ? "summoned" : "away") : "manual"}`}
      aria-label={`${name}, your companion`}
    >
      <div className="companion-card__head">
        <div className="companion-card__who">
          {onPortraitUpload && (
            <PortraitUpload
              userId={userId}
              // Each companion's picture is its own file. The first (and any
              // companion from before there could be several) keeps the
              // original "-companion" name, so its picture stays put.
              characterId={
                companion.id && companion.id !== "companion-1"
                  ? `${characterId}-companion-${companion.id}`
                  : `${characterId}-companion`
              }
              name={name}
              portraitUrl={companion.portraitUrl}
              onUpload={onPortraitUpload}
              size="tiny"
              uploadLabel={companion.portraitUrl ? `Change ${name}'s picture` : `Upload a picture of ${name}`}
            />
          )}
          <div className="companion-card__identity">
            <div className="companion-card__title-row">
              {isEditing ? (
                <input
                  ref={nameInput}
                  type="text"
                  className="companion-card__name-input"
                  aria-label="Companion's name"
                  placeholder="e.g. Victory"
                  value={companion.name ?? ""}
                  onChange={(event) => onFieldChange("name", event.target.value)}
                />
              ) : (
                <h3 className="companion-card__name" id={`${idBase}-name`} tabIndex={-1}>
                  {/* The paw stands in for a picture until there is one. */}
                  {!companion.portraitUrl && !onPortraitUpload && (
                    <CompanionIcon name="companion-paw" size={20} className="companion-card__name-icon" />
                  )}
                  {name}
                </h3>
              )}
              {isSummon && (
                <span className={`companion-card__status companion-card__status--${present ? "here" : "away"}`}>
                  {present ? "Summoned" : "Not summoned"}
                </span>
              )}
            </div>
            <span className="companion-card__kind">{kind}</span>
          </div>
        </div>

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

      {/* Setting up a new one: what to fill in, in plain words. */}
      {isEditing && isBlank && (
        <p className="companion-card__setup">
          <strong>Set up your companion:</strong> type its name, then its HP, AC, speed and ability scores from its
          stat block (a wolf, a riding horse, an owl familiar). Add its attacks and notes below. Tap{" "}
          <strong>Done editing</strong> when you&apos;re finished, so a stray tap can&apos;t change them.
        </p>
      )}

      {/* Left blank: a clear way back in, instead of a small lock button. */}
      {!isEditing && isBlank && (
        <p className="companion-card__setup">
          <span>This companion isn&apos;t set up yet.</span>
          <Button onClick={() => setIsEditing(true)}>Set up {name}</Button>
        </p>
      )}

      {isEditing && <SummonLink name={name} companion={companion} summon={summon} onSummon={onSummon} />}

      {/* Remove: behind Edit stats, with one "are you sure". */}
      {isEditing && onRemove && (
        <div className="companion-card__remove">
          {confirmingRemove ? (
            <span className="companion-card__remove-confirm" role="group" aria-label={`Remove ${name}?`}>
              <span>
                Remove {name}? Its stats, attacks and notes go with it
                {present ? ", and the summon ends" : ""}.
              </span>
              <Button variant="secondary" onClick={onRemove}>
                Remove {name}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmingRemove(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <button type="button" className="companion-card__remove-link" onClick={() => setConfirmingRemove(true)}>
              Remove companion
            </button>
          )}
        </div>
      )}

      {/* Not here: what it is and Prepare summon. Keyed on the cast, so a
          new cast starts the setup's choices fresh. */}
      {isSummon && !present && (
        <SummonAway key="away" name={name} summon={summon} onSummon={onSummon} idBase={idBase} />
      )}

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
                  isSummon ? onSummon("hp", { value: event.target.value }) : onHpChange("current", event.target.value)
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
            {/* A slim bar under the numbers (the numbers say it in words). */}
            {hp.max > 0 && (
              <span className="companion-card__hp-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(hpShare * 100)}%` }} />
              </span>
            )}
          </label>
          <span className="companion-card__stat">
            <span className="companion-card__label">
              <CompanionIcon name="armor-shield" size={14} /> AC
            </span>
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
          {present && (
            <p className="companion-card__turn-note">
              Acts right after {ownerName || "you"}. With no command, it takes the Dodge action.
            </p>
          )}
        </div>
      )}

      {isSummon ? (
        present && (
          <>
            <TableRollNote name={name} />
            <SummonAttack name={name} summon={summon} />
            <SummonStep summon={summon} idBase={idBase} />
            <SummonDuration name={name} summon={summon} onSummon={onSummon} />
          </>
        )
      ) : (
        <>
          {(companion.attacks ?? []).length > 0 && <TableRollNote name={name} />}
          <EditableItemList
            // Just "Attacks": the card's name is right above it.
            title="Attacks"
            headingLevel={4}
            items={companion.attacks ?? []}
            getItemId={(item) => item.id}
            fields={[
              {
                key: "name",
                type: "text",
                label: "Attack",
                placeholder: "Attack (e.g. Bite)",
              },
              {
                key: "toHit",
                type: "number",
                caption: "To hit",
                placeholder: "+4",
              },
              { key: "damage", type: "text", placeholder: "Damage (e.g. 2d4+2)" },
              {
                key: "damageType",
                type: "text",
                placeholder: "Type (e.g. Piercing)",
              },
              {
                key: "notes",
                type: "textarea",
                placeholder: "Notes (e.g. knocks prone on a hit)",
              },
            ]}
            // The same layout and roll buttons as the character's weapons.
            primaryWidth="minmax(0, 38fr)"
            actionsWidth="auto"
            sectionClassName="character-sheet__section--attacks companion-card__attacks"
            // A picture only from the attack's exact name (Bite, Claws,
            // Shortsword), never guessed from the creature; else the plain one.
            primaryIcon={(item) => <WeaponIcon iconId={weaponIconForCompanionAttack(item)} />}
            columns={[
              {
                key: "toHit",
                label: "To hit",
                width: "minmax(100px, 18fr)",
                format: (item) => (
                  <ToHitButton
                    label={`${name}: ${item.name} attack`}
                    bonus={Number(item.toHit) || 0}
                    attack={{
                      name: `${name}: ${item.name}`,
                      damage: item.damage,
                    }}
                  />
                ),
              },
              {
                key: "damage",
                label: "Damage",
                width: "minmax(0, 44fr)",
                format: (item) =>
                  item.damage ? (
                    <DamageChip
                      label={`${name}: ${item.name} damage`}
                      dice={item.damage}
                      type={String(item.damageType ?? "").toLowerCase()}
                    />
                  ) : null,
              },
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
        </>
      )}

      {/* Ability scores, saves and the spell's rules: folded in play, open
          while editing (that's where the scores are typed). */}
      {showNumbers && (
        <Fold
          id={`${idBase}-stats`}
          title="Stats & saves"
          isOpen={statsOpen || editNumbers}
          onToggle={() => setStatsOpen((open) => !open)}
        >
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
          {ruleNotes.length > 0 && (
            <ul className="companion-card__summon-notes" aria-label={`${summon.template.spell} rules`}>
              {ruleNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
        </Fold>
      )}

      {/* The player's own notes, kept apart from the rules above. */}
      <Fold
        id={`${idBase}-notes`}
        title="Notes"
        icon="notes-book"
        summary={notes.length > 0 ? `(${notes.length})` : ""}
        isOpen={notesOpen || isEditing}
        onToggle={() => setNotesOpen((open) => !open)}
      >
        <CompanionNotes name={name} notes={notes} onChange={onNotesChange} isEditing={isEditing} />
      </Fold>

      {/* A plain way to finish at the bottom too, after filling in the stats. */}
      {isEditing && (
        <p className="companion-card__done">
          <Button onClick={() => setIsEditing(false)}>✓ Done editing</Button>
        </p>
      )}

    </section>
  );
}

export default CompanionCard;
