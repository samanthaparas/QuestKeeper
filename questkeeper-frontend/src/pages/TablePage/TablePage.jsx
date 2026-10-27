import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useTable } from "../../hooks/useTable";
import { getCharacter, getCharactersByIds } from "../../utils/characterStore";
import {
  STATUS_LABELS,
  getNowAndNext,
  describeUpcoming,
  rollInitiative,
  sortCombatants,
  rollMonsterInitiative,
} from "../../utils/initiative";
import {
  addCombatant,
  advanceTurn,
  applyDamage,
  createTemplate,
  deleteTable,
  dmDenyAttack,
  dmLog,
  dmResolveAttack,
  editCombatant,
  endCombat,
  endMyTurn,
  getPartyStrip,
  leaveTable,
  listTemplates,
  postPlayerDamage,
  removeCombatant,
  removeMember,
  setTableRules,
  setBannedContent,
  banMember,
  unbanMember,
  listBans,
  resetEncounter,
  setCombatantInitiative,
  setMyInitiative,
  setShareParty,
  setCombatantAway,
  startCombat,
} from "../../utils/tableStore";
import { creatureIdOf, isSameTemplate, pieceNames, readStatBlock, recentEventsFor, savesOf } from "../../utils/statBlock";
import { getActivityIcon, getCreaturePortrait } from "../../utils/icons";
import { conditionWord } from "../../utils/conditions";
import {
  NEW_ENCOUNTER_MESSAGE,
  getDmPrepSteps,
  getPlayerTableTip,
  findActiveNudge,
  hasActiveNudge,
  nudgeMessage,
} from "../../utils/tableGuidance";
import { formatModifier, getAbilityModifier, rollDie } from "../../utils/characterSheet";
import { toPartyRow } from "../../utils/partyStrip";
import { shouldReduceMotion } from "../../utils/motionPreference";
import Button from "../../components/Button/Button";
import MonsterAttackPanel from "../../components/MonsterAttackPanel/MonsterAttackPanel";
import AddCombatantForm from "../../components/AddCombatantForm/AddCombatantForm";
import CombatantEditPanel from "../../components/CombatantEditPanel/CombatantEditPanel";
import PlayerCharacterCard from "../../components/PlayerCharacterCard/PlayerCharacterCard";
import PartyStrip from "../../components/PartyStrip/PartyStrip";
import DmPlayersTab from "../../components/DmPlayersTab/DmPlayersTab";
import DmStoryTab from "../../components/DmStoryTab/DmStoryTab";
import CharacterAvatar from "../../components/CharacterAvatar/CharacterAvatar";
import TableJournal from "../../components/TableJournal/TableJournal";
import TableHandouts from "../../components/TableHandouts/TableHandouts";
import TableRules from "../../components/TableRules/TableRules";
import EncounterHelper from "../../components/EncounterHelper/EncounterHelper";
import LootHelper from "../../components/LootHelper/LootHelper";
import TurnHeadsUp from "../../components/TurnHeadsUp/TurnHeadsUp";
import ContentRules from "../../components/ContentRules/ContentRules";
import ContentNotice from "../../components/ContentNotice/ContentNotice";
import { bannedChoicesOf, cleanBanned } from "../../utils/contentRules";
import { addJournalEntry, getTablePortraits } from "../../utils/journalStore";
import { getBannerInfo } from "../../utils/redesignArt";
import lanternArt from "../../assets/hero/inn-lantern-crop.webp";
import StatusNote from "../../components/StatusNote/StatusNote";
import { useFocusAfterRetry } from "../../components/StatusNote/useFocusAfterRetry";
import "./TablePage.css";

const CHARACTER_POLL_MS = 10000;
// The DM screen's tabs. Story and Players are for between fights; Combat
// and Prep for running one.
const DM_TABS = [
  { key: "combat", label: "Combat" },
  { key: "story", label: "Story" },
  { key: "players", label: "Players" },
  { key: "prep", label: "Prep" },
];

// A player's game page: the fight, and the story (handouts and journal).
const PLAYER_TABS = [
  { key: "combat", label: "⚔️ Combat" },
  { key: "story", label: "📜 Story" },
];

// The open tab is remembered per table, separately for the DM and players.

// How full a monster's HP bar is (0-100), and its colour: green above half,
// red at half or below (bloodied), grey when down.
function hpBarPercent(hp) {
  return Math.max(0, Math.min(100, Math.round((hp.current_hp / hp.max_hp) * 100)));
}

function hpBarLevel(hp) {
  if (hp.current_hp <= 0) return "down";
  return hp.current_hp * 2 <= hp.max_hp ? "bloodied" : "healthy";
}

function tabStorageKey(tableId, isDm) {
  return `qk-${isDm ? "dm" : "game"}-tab-${tableId}`;
}

function readDmTab(tableId, isDm = true) {
  try {
    return window.localStorage.getItem(tabStorageKey(tableId, isDm));
  } catch {
    return null;
  }
}

function writeDmTab(tableId, tab, isDm = true) {
  try {
    window.localStorage.setItem(tabStorageKey(tableId, isDm), tab);
  } catch {
    // Remembering the tab is a convenience; it still works for this visit.
  }
}

// After a nudge, the DM's Nudge buttons rest briefly so one tap can't spam.
const NUDGE_COOLDOWN_MS = 4000;

// A quick side-to-side shake for the player's "Roll initiative" card.
const SHAKE_KEYFRAMES = [
  { transform: "translateX(0)" },
  { transform: "translateX(-8px) rotate(-1deg)" },
  { transform: "translateX(8px) rotate(1deg)" },
  { transform: "translateX(-6px) rotate(-0.5deg)" },
  { transform: "translateX(6px) rotate(0.5deg)" },
  { transform: "translateX(-3px)" },
  { transform: "translateX(0)" },
];

function formatRollNote(roll, modifier, total) {
  return `Rolled ${roll} ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)} = ${total}`;
}

// Shown at the top of Combat to a player who hasn't rolled initiative yet, so
// they don't have to find their own row under a long list of monsters. A
// physical roll works like attacks: type just the die, and Dexterity is added.
function InitiativePrompt({ combatant, dexterity, onSet, nudgeId = null }) {
  const [dieInput, setDieInput] = useState("");
  const [dieError, setDieError] = useState("");
  const cardRef = useRef(null);
  const nudged = nudgeId !== null;

  // Shake once for each new nudge (each has its own log id). Skipped for
  // people who ask their device for less motion; the glow still shows.
  useEffect(() => {
    if (!nudgeId || shouldReduceMotion()) return;
    cardRef.current?.animate?.(SHAKE_KEYFRAMES, { duration: 600, easing: "ease-in-out" });
  }, [nudgeId]);
  const modifier = getAbilityModifier(dexterity ?? 10);
  const bonus = `${modifier >= 0 ? "+" : "-"}${Math.abs(modifier)}`;

  function rollForMe() {
    const { roll, total } = rollInitiative(dexterity);
    onSet(total, formatRollNote(roll, modifier, total));
  }

  function useMyRoll(event) {
    event.preventDefault();
    const roll = Number(dieInput);
    if (dieInput === "") return;
    // A d20 only shows 1 to 20; say so instead of doing nothing.
    if (!Number.isInteger(roll) || roll < 1 || roll > 20) {
      setDieError("A d20 only shows 1 to 20. Type the number on your die.");
      return;
    }
    setDieError("");
    onSet(roll + modifier, formatRollNote(roll, modifier, roll + modifier));
    setDieInput("");
  }

  return (
    <section
      ref={cardRef}
      className={`table-page__init-prompt${nudged ? " table-page__init-prompt--nudged" : ""}`}
      aria-labelledby="init-prompt-title"
    >
      <h3 id="init-prompt-title" className="table-page__init-prompt-title">
        Roll initiative for {combatant.name}
      </h3>
      {nudged && (
        <p className="table-page__init-prompt-nudge" role="status">
          🔔 Your DM is waiting for your roll!
        </p>
      )}
      <p className="table-page__init-prompt-text">
        Initiative decides the turn order: the highest number goes first. Pick one:
      </p>
      <div className="table-page__init-prompt-options">
        <div className="table-page__init-prompt-option">
          <Button onClick={rollForMe}>Roll d20 for me</Button>
          <span className="table-page__init-prompt-note">
            The app rolls and adds your Dexterity ({bonus}).
          </span>
        </div>
        <span className="table-page__init-prompt-or">or</span>
        {/* noValidate: our own message below says why, instead of the browser's. */}
        <form className="table-page__init-prompt-option" onSubmit={useMyRoll} noValidate>
          <label className="table-page__init-prompt-label" htmlFor="init-prompt-die">
            Rolling real dice? Type just the number on your d20:
          </label>
          <div className="table-page__inline-form">
            <input
              id="init-prompt-die"
              className="table-page__number"
              type="number"
              min="1"
              max="20"
              placeholder="d20"
              value={dieInput}
              aria-describedby={dieError ? "init-prompt-die-error" : undefined}
              aria-invalid={dieError ? true : undefined}
              onChange={(event) => {
                setDieInput(event.target.value);
                setDieError("");
              }}
            />
            <Button type="submit" variant="secondary" disabled={dieInput === ""}>
              Use my roll
            </Button>
          </div>
          {dieError && (
            <span id="init-prompt-die-error" className="table-page__init-prompt-error" role="alert">
              {dieError}
            </span>
          )}
          <span className="table-page__init-prompt-note">We add your {bonus} for you.</span>
        </form>
      </div>
    </section>
  );
}

// Pencil and trash-can buttons, like the character sheet's. The full
// "Edit Kobold" is read out to screen readers and shown on hover.
const ICON_PATHS = {
  edit: "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4",
  remove: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6",
  // Chevrons for opening and closing a row's details.
  open: "M6 9l6 6 6-6",
  close: "M6 15l6-6 6 6",
};

// A neutral badge for a creature with no portrait of its own (anything not
// added from the SRD, or an SRD creature we don't have a picture for yet).
function CreatureBadge({ src }) {
  return (
    <span className="table-page__row-portrait table-page__row-portrait--creature" aria-hidden="true">
      {src ? (
        <img src={src} alt="" />
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
          <path
            d="M5 4l5 5M19 4l-5 5M4 20l8-9 8 9M9 4h6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

// The DM's save buttons for a monster or ally: one per save the DM typed
// ("DEX +2"). A tap rolls it and shows the result here only, on the DM's
// screen: it isn't sent to the table, so the bonus never reaches players.
function MonsterSaves({ name, statBlock }) {
  const saves = savesOf(statBlock);
  const [last, setLast] = useState(null);
  if (saves.length === 0) return null;
  function roll(save) {
    const d20 = rollDie(20);
    setLast({ short: save.short, d20, bonus: save.bonus, total: d20 + save.bonus });
  }
  return (
    <span className="table-page__saves">
      <span className="table-page__saves-label">Saves:</span>
      {saves.map((save) => (
        <button
          key={save.key}
          type="button"
          className="table-page__save-button"
          aria-label={`Roll ${name}'s ${save.short} save, ${formatModifier(save.bonus)}`}
          onClick={() => roll(save)}
        >
          {save.short} {formatModifier(save.bonus)}
        </button>
      ))}
      {last && (
        <span className="table-page__save-result" role="status">
          {last.short} save: <b>{last.total}</b> (d20 {last.d20} {formatModifier(last.bonus)})
          {last.d20 === 20 ? " · natural 20" : last.d20 === 1 ? " · natural 1" : ""}
        </span>
      )}
    </span>
  );
}

function IconButton({ id, icon, label, onClick, pressed }) {
  return (
    <button
      id={id}
      type="button"
      className={`table-page__icon-button table-page__icon-button--${icon}`}
      aria-label={label}
      aria-expanded={pressed}
      title={label}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path
          d={ICON_PATHS[icon]}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// One of the picked creature's HP boxes: "Take damage" or "Heal". It has its
// own blank amount with minus and plus buttons (which only change the number
// typed, never the HP) and its own apply button, named for the creature.
function AmountBox({ creature, kind, value, onChange, onApply }) {
  const isDamage = kind === "damage";
  const word = isDamage ? "damage" : "healing";
  function step(delta) {
    const next = Math.max(0, (Number(value) || 0) + delta);
    onChange(next === 0 ? "" : String(next));
  }
  return (
    <div
      className={`table-page__ctl-box table-page__ctl-box--${kind}`}
      role="group"
      aria-label={`${isDamage ? "Take damage" : "Heal"}: ${creature}`}
    >
      <span className="table-page__ctl-title">{isDamage ? "Take damage" : "Heal"}</span>
      <div className="table-page__stepper">
        <button type="button" aria-label={`Decrease ${word} amount`} onClick={() => step(-1)}>
          &minus;
        </button>
        <input
          type="number"
          min="0"
          aria-label={`${isDamage ? "Damage" : "Healing"} amount for ${creature}`}
          placeholder="0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" aria-label={`Increase ${word} amount`} onClick={() => step(1)}>
          +
        </button>
      </div>
      <Button
        type="button"
        variant={isDamage ? "danger" : "secondary"}
        aria-label={`Apply ${word} to ${creature}`}
        onClick={onApply}
      >
        Apply {word}
      </Button>
    </div>
  );
}

// What a character is under right now, read from their party row (so it is the
// same data the Party card uses, never a second copy): conditions, the spell
// they're concentrating on, and spell effects on their attacks.
function statusOf(row) {
  if (!row) return null;
  const conditions = (row.conditions ?? [])
    .map((condition) => {
      const word = conditionWord(condition.key);
      if (!word) return null;
      return {
        key: condition.key,
        label: `${word.name}${condition.key === "exhaustion" ? ` ${condition.level ?? 1}` : ""}`,
        rounds: typeof condition.rounds === "number" ? condition.rounds : null,
        meaning: word.meaning,
      };
    })
    .filter(Boolean);
  const concentration = row.concentration
    ? { spell: row.concentration, rounds: row.concentrationRounds ?? null }
    : null;
  const effects = row.effects ?? [];
  if (conditions.length === 0 && !concentration && effects.length === 0) return null;
  return { conditions, concentration, effects };
}

// "2 rounds left", for a timed condition or spell.
function roundsLeft(rounds) {
  return rounds === null ? "" : `${rounds} ${rounds === 1 ? "round" : "rounds"} left`;
}

// A second line under a character's name in the initiative list: short labels
// like "Poisoned" and "Concentrating: Bless". The full explanations and
// durations are in the controls panel when they're picked.
function StatusLine({ name, status }) {
  if (!status) return null;
  return (
    <ul className="table-page__summary-status" aria-label={`${name}'s conditions and concentration`}>
      {status.conditions.map((condition) => (
        <li key={condition.key} className="table-page__chip table-page__chip--condition">
          {condition.label}
        </li>
      ))}
      {status.concentration && (
        <li className="table-page__chip table-page__chip--spell">Concentrating: {status.concentration.spell}</li>
      )}
      {status.effects.map((effect) => (
        <li key={effect} className="table-page__chip table-page__chip--spell">
          {effect}
        </li>
      ))}
    </ul>
  );
}

// The same statuses in full, in the picked character's panel: what each one
// does and how long is left.
function StatusDetails({ status }) {
  if (!status) return null;
  return (
    <div className="table-page__status-block">
      <h4 className="table-page__status-title">Conditions and spells</h4>
      <ul className="table-page__status-list">
        {status.conditions.map((condition) => (
          <li key={condition.key}>
            <strong>{condition.label}</strong>
            {condition.rounds !== null && <> · {roundsLeft(condition.rounds)}</>}
            <span className="table-page__status-meaning"> {condition.meaning}</span>
          </li>
        ))}
        {status.concentration && (
          <li>
            <strong>Concentrating: {status.concentration.spell}</strong>
            {status.concentration.rounds !== null && <> · {roundsLeft(status.concentration.rounds)}</>}
            <span className="table-page__status-meaning">
              {" "}
              Taking damage means a Constitution save to keep it. Only one spell at a time.
            </span>
          </li>
        )}
        {status.effects.map((effect) => (
          <li key={effect}>
            <strong>{effect}</strong>
            <span className="table-page__status-meaning"> A spell changing their attacks.</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// One short line in the DM's initiative list: initiative, picture, name,
// status, and how it's doing (HP and AC, for the DM's eyes). Pressing it picks
// that creature, and its full controls show in the panel under the list. A
// pending player attack and the initiative boxes (before the fight) stay right
// here on the line, so nothing important is hidden behind a click.
function CombatantSummaryRow({
  combatant,
  isCurrent,
  selected,
  onSelect,
  hp,
  playerStats = null,
  statusRow = null,
  portraitUrl = "",
  avatarCharacter = null,
  combatActive = false,
  pendingCalls = [],
  onSetInitiative,
  onResolve,
  onDeny,
  onNudge = null,
  nudged = false,
  nudgeCooling = false,
}) {
  const [initiativeInput, setInitiativeInput] = useState("");
  const [rollNote, setRollNote] = useState("");
  const isNpc = combatant.kind !== "player";
  const isMonster = combatant.kind === "monster";
  const initiativeBonus = Number(readStatBlock(hp?.stat_block).initiativeBonus) || 0;
  // The DM can set anyone's initiative before the fight, or fill a gap in it.
  const canEditInitiative = !combatActive || combatant.initiative === null;
  const creatureArt = isNpc ? getCreaturePortrait(creatureIdOf(hp?.stat_block)) : undefined;
  // HP for the DM's eyes: a creature's secret HP, or a player's sheet.
  const stats = isNpc
    ? hp
      ? { current_hp: hp.current_hp, max_hp: hp.max_hp, armor_class: hp.armor_class }
      : null
    : playerStats;

  function submitInitiative(event) {
    event.preventDefault();
    const value = Number(initiativeInput);
    if (initiativeInput === "" || Number.isNaN(value)) return;
    onSetInitiative(combatant, value);
    setInitiativeInput("");
  }

  function rollForNpc() {
    const { roll, modifier, total } = rollMonsterInitiative(initiativeBonus);
    setRollNote(`Rolled ${roll} ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)} = ${total}`);
    onSetInitiative(combatant, total);
  }

  return (
    <li
      className={`table-page__row table-page__row--summary${isCurrent ? " table-page__row--current" : ""}${
        selected ? " table-page__row--selected" : ""
      }${combatant.status === "down" ? " table-page__row--down" : ""}${
        pendingCalls.length > 0 ? " table-page__row--awaiting" : ""
      }${
        combatant.initiative === null || combatant.initiative === undefined
          ? " table-page__row--needs-initiative"
          : ""
      }`}
    >
      <div className="table-page__summary-line">
        <button
          type="button"
          className="table-page__row-select"
          aria-pressed={selected}
          aria-controls="detail-panel"
          onClick={() => onSelect(combatant.id)}
        >
          <span className="table-page__initiative">{combatant.initiative ?? "—"}</span>
          {isNpc ? (
            <CreatureBadge src={creatureArt} />
          ) : (
            <span className="table-page__row-portrait table-page__row-portrait--small" aria-hidden="true">
              <CharacterAvatar character={avatarCharacter} name={combatant.name} portraitUrl={portraitUrl} />
            </span>
          )}
          <span className="table-page__compact-name">
            <span className="table-page__row-name">
              {combatant.name}
              {isMonster && <span className="table-page__tag table-page__tag--monster">Enemy</span>}
              {combatant.kind === "ally" && <span className="table-page__tag">Ally</span>}
              {isCurrent && <span className="table-page__tag table-page__tag--turn">Turn</span>}
              {selected && !isCurrent && <span className="table-page__tag table-page__tag--selected">Selected</span>}
              {combatant.away && <span className="table-page__tag table-page__tag--away">Away</span>}
              {pendingCalls.length > 0 && (
                <span className="table-page__tag table-page__tag--call">⚠ Needs your call</span>
              )}
            </span>
            {isNpc && (
              <span className={`table-page__status table-page__status--${combatant.status}`}>
                {STATUS_LABELS[combatant.status]}
                {combatant.damage_taken > 0 && ` · ${combatant.damage_taken} damage taken`}
              </span>
            )}
          </span>
          {stats && (
            <span className="table-page__compact-hp">
              <span className="table-page__visually-hidden">{isNpc ? "DM only: " : ""}</span>
              {stats.current_hp}/{stats.max_hp} HP{stats.armor_class ? ` · AC ${stats.armor_class}` : ""}
              {stats.max_hp > 0 && (
                <span className={`table-page__hp-bar table-page__hp-bar--${hpBarLevel(stats)}`} aria-hidden="true">
                  <span className="table-page__hp-bar-fill" style={{ width: `${hpBarPercent(stats)}%` }} />
                </span>
              )}
            </span>
          )}
        </button>

        {selected && (
          <button
            type="button"
            className="table-page__row-jump"
            aria-label={`Go to the controls for ${combatant.name}`}
            title="Go to the controls below"
            onClick={() => {
              const panel = document.getElementById("detail-panel");
              panel?.focus();
              panel?.scrollIntoView?.({ block: "nearest" });
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path d={ICON_PATHS.open} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {onNudge && (
          <Button type="button" variant="secondary" disabled={nudgeCooling} onClick={() => onNudge(combatant)}>
            {nudgeCooling ? "Nudged ✓" : nudged ? "🔔 Nudge again" : "🔔 Nudge"}
          </Button>
        )}

        {canEditInitiative && (
          <form className="table-page__inline-form table-page__summary-initiative" onSubmit={submitInitiative}>
            <input
              className="table-page__number"
              type="number"
              aria-label={`Initiative for ${combatant.name}`}
              placeholder="Init"
              value={initiativeInput}
              onChange={(event) => setInitiativeInput(event.target.value)}
            />
            <Button type="submit" variant="secondary">
              Set
            </Button>
            {isNpc && (
              <Button type="button" onClick={rollForNpc}>
                Roll d20
              </Button>
            )}
            {isNpc && rollNote && <span className="table-page__roll-note">{rollNote}</span>}
          </form>
        )}
      </div>

      {/* Conditions and concentration, right on the line (players only). */}
      <StatusLine name={combatant.name} status={statusOf(statusRow)} />

      {pendingCalls.length > 0 && (
        <div className="table-page__row-call" role="alert">
          {pendingCalls.map((attacker) => (
            <div className="table-page__call" key={attacker.id}>
              <span>
                <strong>{attacker.name}</strong> attacked {combatant.name} with{" "}
                {attacker.attack_name ?? "an attack"}
                {attacker.attack_natural != null && (
                  <>
                    {" "}and rolled{" "}
                    <strong>{attacker.attack_natural + (attacker.attack_bonus ?? 0)}</strong>{" "}
                    ({attacker.attack_natural} {(attacker.attack_bonus ?? 0) >= 0 ? "+" : "-"}{" "}
                    {Math.abs(attacker.attack_bonus ?? 0)})
                  </>
                )}
                . Does it hit?
              </span>
              <div className="table-page__inline-form">
                <Button type="button" onClick={() => onResolve(attacker, true)}>
                  Hit
                </Button>
                <Button type="button" variant="secondary" onClick={() => onResolve(attacker, false)}>
                  Miss
                </Button>
                <Button type="button" variant="secondary" onClick={() => onDeny(attacker)}>
                  Deny
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

function CombatantRow({
  combatant,
  isCurrent,
  isDm,
  isMe,
  hp,
  myDexterity,
  onSetInitiative,
  onDamage,
  onDeny,
  onAway = null,
  pendingCalls = [],
  combatActive = false,
  targets = [],
  recentEvents = [],
  portraitUrl = "",
  avatarCharacter = null,
  tableId,
  onChanged,
  onEdit,
  onRemove,
  onNudge = null,
  nudged = false,
  nudgeCooling = false,
  // "row": the whole row on a player's page. "detail": the DM's controls for
  // the one creature picked in the list (see CombatantSummaryRow).
  variant = "row",
  selected = false,
  statusRow = null,
}) {
  const [damageAmount, setDamageAmount] = useState("");
  const [healAmount, setHealAmount] = useState("");
  const [initiativeInput, setInitiativeInput] = useState("");
  const [rollNote, setRollNote] = useState("");
  const initiativeBonus = Number(readStatBlock(hp?.stat_block).initiativeBonus) || 0;
  const [showAttack, setShowAttack] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  // Remove asks first, on the row: a player (with the choice of letting them
  // come back) or a monster or ally.
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // Monsters and allies are run by the DM and have hidden HP; players run themselves.
  const isMonster = combatant.kind === "monster";
  const isNpc = combatant.kind !== "player";
  // Initiative is locked once combat starts. The one exception is someone who
  // joined mid-fight and has none yet, otherwise they would never get a turn.
  // A player who hasn't rolled uses the prompt at the top of Combat instead,
  // so their own row only offers a re-roll before the fight starts.
  const canEditInitiative = isDm
    ? !combatActive || combatant.initiative === null
    : isMe && !combatActive && combatant.initiative !== null;
  const canAttack =
    isDm && isNpc && combatActive && combatant.status !== "down" && targets.length > 0;

  function submitInitiative(event) {
    event.preventDefault();
    const value = Number(initiativeInput);
    if (initiativeInput === "" || Number.isNaN(value)) return;
    if (isMe && !isDm) {
      // Players type just the die, like attacks; their Dexterity is added.
      // A d20 only shows 1 to 20.
      if (!Number.isInteger(value) || value < 1 || value > 20) {
        setRollNote("Type the number on your d20, from 1 to 20.");
        return;
      }
      const modifier = getAbilityModifier(myDexterity ?? 10);
      setRollNote(formatRollNote(value, modifier, value + modifier));
      onSetInitiative(combatant, value + modifier);
    } else {
      onSetInitiative(combatant, value);
    }
    setInitiativeInput("");
  }

  function rollForMe() {
    const { roll, modifier, total } = rollInitiative(myDexterity);
    setRollNote(formatRollNote(roll, modifier, total));
    onSetInitiative(combatant, total);
  }

  // The DM rolls for a monster or ally with its stat block's initiative bonus.
  function rollForNpc() {
    const { roll, modifier, total } = rollMonsterInitiative(initiativeBonus);
    setRollNote(`Rolled ${roll} ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)} = ${total}`);
    onSetInitiative(combatant, total);
  }

  // Applies what was typed in one of the two boxes: damage takes HP away,
  // healing gives it back. Nothing changes until its apply button is pressed.
  function applyHp(kind) {
    const value = Math.abs(Number(kind === "damage" ? damageAmount : healAmount));
    if (!value) return;
    onDamage(combatant, kind === "damage" ? value : -value);
    if (kind === "damage") setDamageAmount("");
    else setHealAmount("");
  }

  // What the Attack box says before it opens: the first saved attack.
  const savedAttacks = readStatBlock(hp?.stat_block).attacks;
  const firstAttack = savedAttacks[0];
  const attackSummary = firstAttack
    ? `${firstAttack.name}${firstAttack.toHit !== "" ? ` · ${formatModifier(Number(firstAttack.toHit) || 0)} to hit` : ""}${
        firstAttack.damage ? ` · ${firstAttack.damage}` : ""
      }${savedAttacks.length > 1 ? ` · +${savedAttacks.length - 1} more` : ""}`
    : "No attack saved: type one in";

  // What this monster has done lately (the newest first).
  const history = recentEvents.map((entry) => (
    <span
      className={`table-page__last-action${entry.isEarlier ? " table-page__last-action--earlier" : ""}`}
      key={entry.id}
    >
      {entry.isEarlier && <span className="table-page__earlier-tag">Earlier: </span>}
      {entry.message}
    </span>
  ));

  // The DM's monster rows: on the left, who it is, its HP, its buttons and
  // then its history. When Attack or Edit is open, that panel sits on the
  // right on wide screens, so nothing needs scrolling to reach. Narrow
  // screens stack them.
  const isSplit = isDm && isNpc;
  const hasSide = isSplit && ((canAttack && showAttack) || showEdit);
  const creatureArt = isSplit ? getCreaturePortrait(creatureIdOf(hp?.stat_block)) : undefined;

  const turnBanner = (
    <span className="table-page__turn-banner">
      {!isNpc
        ? `${combatant.name}'s turn: they attack from their sheet. Tap Next turn when they're done.`
        : combatant.attacks_this_turn > 0
          ? `${combatant.name} has attacked. Attack again if it has more attacks, or tap Next turn.`
          : `${combatant.name}'s turn: tap Attack to have it attack, then tap Next turn.`}
    </span>
  );

  const mainAndActions = (
    <>
          <div className="table-page__row-main">
            <span className="table-page__initiative">
              {combatant.initiative ?? "—"}
            </span>
            <div className="table-page__row-info">
              <span className="table-page__row-name">
                {combatant.kind === "player" && (
                  // The character's portrait (or initials), so faces are easy to spot.
                  <span className="table-page__row-portrait" aria-hidden="true">
                    <CharacterAvatar character={avatarCharacter} name={combatant.name} portraitUrl={portraitUrl} />
                  </span>
                )}
                {isSplit && <CreatureBadge src={creatureArt} />}
                {combatant.name}
                {isMe && <span className="table-page__tag">You</span>}
                {isMonster && <span className="table-page__tag table-page__tag--monster">Enemy</span>}
                {combatant.kind === "ally" && <span className="table-page__tag">Ally</span>}
                {combatant.away && <span className="table-page__tag table-page__tag--away">Away</span>}
              </span>

              {combatant.attacks_this_turn > 0 && (
                <span className="table-page__attack-count">
                  {combatant.attacks_this_turn}{" "}
                  {combatant.attacks_this_turn === 1 ? "attack" : "attacks"} this turn
                </span>
              )}

              {isNpc && (
                <span className={`table-page__status table-page__status--${combatant.status}`}>
                  {STATUS_LABELS[combatant.status]}
                  {combatant.damage_taken > 0 && ` · ${combatant.damage_taken} damage taken`}
                </span>
              )}

              {/* The monster's real HP, as numbers and a bar the DM can read at
                  a glance. Only the DM gets `hp`, so players never see either;
                  they get the vaguer "Bloodied" above. */}
              {isNpc && isDm && hp && (
                <span className="table-page__secret-hp">
                  <span>
                    DM only: {hp.current_hp}/{hp.max_hp} HP
                    {hp.armor_class ? ` · AC ${hp.armor_class}` : " · no AC set"}
                  </span>
                  {hp.max_hp > 0 && (
                    <span
                      className={`table-page__hp-bar table-page__hp-bar--${hpBarLevel(hp)}`}
                      aria-hidden="true"
                    >
                      <span
                        className="table-page__hp-bar-fill"
                        style={{ width: `${hpBarPercent(hp)}%` }}
                      />
                    </span>
                  )}
                </span>
              )}

              {/* DM only: its saving throws, each a roll that stays on this screen. */}
              {isNpc && isDm && hp && <MonsterSaves name={combatant.name} statBlock={hp.stat_block} />}

              {/* DM only: what to do on this turn, so it's clear the monster
                  hasn't acted yet (its history below may be from earlier). */}
              {isDm && isCurrent && variant !== "detail" && turnBanner}

              {/* Monsters and allies ask before they go, since it can't be undone. */}
              {isNpc && isDm && confirmingRemove && (
                <span className="table-page__remove-confirm" role="group" aria-label={`Remove ${combatant.name}?`}>
                  <span>Remove {combatant.name} from the fight?</span>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setConfirmingRemove(false);
                      onRemove(combatant);
                    }}
                  >
                    Remove
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setConfirmingRemove(false)}>
                    Keep
                  </Button>
                </span>
              )}

              {isNpc && !isSplit && history}
            </div>

            {/* DM's monster rows: Edit and Remove as small pencil and trash
                icons in the top corner, out of the way of the turn's buttons. */}
            {isSplit && (
              <div className="table-page__row-icons">
                <IconButton
                  icon="edit"
                  label={`Edit ${combatant.name}`}
                  pressed={showEdit}
                  onClick={() => setShowEdit((open) => !open)}
                />
                <IconButton
                  icon="remove"
                  label={`Remove ${combatant.name}`}
                  onClick={() => setConfirmingRemove(true)}
                />
              </div>
            )}
          </div>

          {variant === "detail" && <StatusDetails status={statusOf(statusRow)} />}

          <div className="table-page__row-actions">
            {variant === "row" && onNudge && (
              <Button
                type="button"
                variant="secondary"
                disabled={nudgeCooling}
                onClick={() => onNudge(combatant)}
              >
                {nudgeCooling ? "Nudged ✓" : nudged ? "🔔 Nudge again" : "🔔 Nudge"}
              </Button>
            )}
            {variant === "row" && canEditInitiative && (
              <form className="table-page__inline-form" onSubmit={submitInitiative}>
                <input
                  className="table-page__number"
                  type="number"
                  aria-label={
                    isMe && !isDm ? "Your d20 roll for initiative" : `Initiative for ${combatant.name}`
                  }
                  placeholder={isMe && !isDm ? "d20" : "Init"}
                  value={initiativeInput}
                  onChange={(event) => setInitiativeInput(event.target.value)}
                />
                <Button type="submit" variant="secondary">
                  Set
                </Button>
                {isMe && (
                  <Button type="button" onClick={rollForMe}>
                    Roll d20
                  </Button>
                )}
                {isDm && isNpc && (
                  <Button type="button" onClick={rollForNpc}>
                    Roll d20
                  </Button>
                )}
              </form>
            )}

            {variant === "row" && (isMe || (isDm && isNpc)) && rollNote && (
              <span className="table-page__roll-note">{rollNote}</span>
            )}

            {/* Three separate boxes, in play order: the monster attacks, takes
                damage, or is healed. Each says which creature it affects. */}
            {isDm && isNpc && (
              <div className="table-page__ctl-boxes" role="group" aria-label={`Controls for ${combatant.name}`}>
                {canAttack && (
                  <div className="table-page__ctl-box table-page__ctl-box--attack">
                    <button
                      type="button"
                      className="table-page__ctl-attack"
                      aria-label="Attack"
                      aria-describedby={`attack-summary-${combatant.id}`}
                      aria-expanded={showAttack}
                      onClick={() => setShowAttack((open) => !open)}
                    >
                      <span className="table-page__ctl-title">Attack</span>
                      <span id={`attack-summary-${combatant.id}`} className="table-page__ctl-weapon">
                        {attackSummary}
                      </span>
                    </button>
                  </div>
                )}
                <AmountBox
                  creature={combatant.name}
                  kind="damage"
                  value={damageAmount}
                  onChange={setDamageAmount}
                  onApply={() => applyHp("damage")}
                />
                <AmountBox
                  creature={combatant.name}
                  kind="heal"
                  value={healAmount}
                  onChange={setHealAmount}
                  onApply={() => applyHp("heal")}
                />
              </div>
            )}

            {isDm && !isNpc && combatant.attacks_this_turn > 0 && combatant.last_attack_target && (
              <Button type="button" variant="secondary" onClick={() => onDeny(combatant)}>
                Deny last attack
              </Button>
            )}

            {isDm && !isSplit && (
              <div className="table-page__row-manage">
                {isNpc && (
                  <Button
                    type="button"
                    variant="secondary"
                    aria-expanded={showEdit}
                    onClick={() => setShowEdit((open) => !open)}
                  >
                    Edit
                  </Button>
                )}
                {!isNpc && confirmingRemove ? (
                  // Asks on the row, with the choice of letting them come back.
                  <span className="table-page__remove-confirm" role="group" aria-label={`Remove ${combatant.name}?`}>
                    <span>Remove {combatant.name} from the table?</span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setConfirmingRemove(false);
                        onRemove(combatant, { forGood: false });
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        setConfirmingRemove(false);
                        onRemove(combatant, { forGood: true });
                      }}
                    >
                      Remove for good
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setConfirmingRemove(false)}>
                      Keep
                    </Button>
                    <span className="table-page__remove-help">
                      &ldquo;Remove&rdquo; lets them rejoin with the code (or with a new character).
                      &ldquo;Remove for good&rdquo; stops them rejoining until you let them back on the Players tab.
                    </span>
                  </span>
                ) : (
                  <>
                    {!isNpc && onAway && (
                      <Button
                        type="button"
                        variant="secondary"
                        aria-pressed={Boolean(combatant.away)}
                        title={
                          combatant.away
                            ? "Put them back in the turn order"
                            : "Skip their turns until you bring them back"
                        }
                        onClick={() => onAway(combatant, !combatant.away)}
                      >
                        {combatant.away ? "Back" : "Mark away"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setConfirmingRemove(true)}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

    </>
  );

  const panels = (
    <>
          {canAttack && showAttack && (
            <MonsterAttackPanel
              attacker={combatant}
              targets={targets}
              statBlock={hp?.stat_block}
              tableId={tableId}
              onChanged={onChanged}
              onClose={() => setShowAttack(false)}
            />
          )}

          {isDm && isNpc && showEdit && hp && (
            <CombatantEditPanel
              combatant={combatant}
              secret={hp}
              onCancel={() => setShowEdit(false)}
              onSave={async (changes) => {
                await onEdit(changes);
                setShowEdit(false);
              }}
            />
          )}

    </>
  );

  const Container = variant === "detail" ? "div" : "li";
  return (
    <Container
      {...(variant === "detail" ? { hidden: !selected, "data-detail-for": combatant.id } : {})}
      className={`table-page__row${variant === "detail" ? " table-page__row--detail" : ""}${hasSide ? " table-page__row--split" : ""}${isCurrent ? " table-page__row--current" : ""}${
        combatant.status === "down" ? " table-page__row--down" : ""
      }${pendingCalls.length > 0 ? " table-page__row--awaiting" : ""}${
        combatant.initiative === null || combatant.initiative === undefined
          ? " table-page__row--needs-initiative"
          : ""
      }`}
    >
      {isSplit ? (
        <>
          <div className="table-page__row-left">
            {mainAndActions}
            {/* In the panel, the how-to line and the recent history fold into
                small disclosures, so the creature's controls and the list get
                the room. Each says what it holds in its own summary. */}
            {variant === "detail" ? (
              <div className="table-page__detail-notes">
                {isDm && isCurrent && (
                  <details className="table-page__note-fold">
                    <summary>What to do this turn</summary>
                    {turnBanner}
                  </details>
                )}
                {recentEvents.length > 0 && (
                  <details className="table-page__note-fold">
                    <summary>Earlier ({recentEvents.length})</summary>
                    <div className="table-page__row-history" aria-label={`What ${combatant.name} did lately`}>
                      {history}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              recentEvents.length > 0 && (
                <div className="table-page__row-history" aria-label={`What ${combatant.name} did lately`}>
                  {history}
                </div>
              )
            )}
          </div>
          {hasSide && <div className="table-page__row-side">{panels}</div>}
        </>
      ) : (
        <>
          {mainAndActions}
          {panels}
        </>
      )}
    </Container>
  );
}

function TablePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { table, members, combatants, enemyHp, events, isLoading, error, refresh, isDm } =
    useTable(id);

  const [actionError, setActionError] = useState("");
  // "Try again" on a table that couldn't load: the wait is shown, and focus
  // goes to the page heading once it's done (the button is gone by then).
  const [hasRetried, setHasRetried] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  useFocusAfterRetry(hasRetried, isLoading || isRetrying);
  async function retryLoadingTable() {
    setHasRetried(true);
    setIsRetrying(true);
    try {
      await refresh();
    } finally {
      setIsRetrying(false);
    }
  }
  const [characters, setCharacters] = useState([]);
  // Players: the party strip's mini sheets, when the DM shares them.
  const [partyMinis, setPartyMinis] = useState([]);
  // DM: players removed for good (they can't rejoin with the code).
  const [bans, setBans] = useState([]);
  const playersSectionRef = useRef(null);
  const location = useLocation();
  // DM screen tab: the DM's pick, remembered per table. Until they pick, it
  // follows the fight: Prep with no fight, Combat once one starts.
  const [tabPick, setTabPick] = useState(null);
  const [seenCombat, setSeenCombat] = useState(null);
  // When the turn last changed: the newest history line at that moment. Lines
  // after it happened this turn; the rest are faded as "Earlier". (The
  // database doesn't save when a turn started, so the page notes it as turns
  // change. After a reload, everything so far counts as earlier.)
  const [turnMarker, setTurnMarker] = useState({ turn: undefined, after: null });
  const [myDexterity, setMyDexterity] = useState(10);

  const [templates, setTemplates] = useState([]);
  // The readiness bar's longer explanations (who is still waiting, and so on).
  const [showPrepDetails, setShowPrepDetails] = useState(false);
  const [showMonsterForm, setShowMonsterForm] = useState(false);
  // On narrow screens the party folds into one "Party · 4 players" line.
  const [partyOpen, setPartyOpen] = useState(false);
  // The "Party visibility" setting folds into one line (open or closed here
  // never changes who can see the party; only the checkbox inside does).
  const [shareOpen, setShareOpen] = useState(false);
  // The Combat panel is sized to the room left under the banner and tabs
  // (TablePage.css reads --dm-combat-top). Measured, never guessed.
  const combatRef = useRef(null);
  const measureCombatTop = useRef(null);
  useEffect(() => {
    function measure() {
      const el = combatRef.current;
      if (!el) return;
      const top = Math.round(el.getBoundingClientRect().top + window.scrollY);
      el.style.setProperty("--dm-combat-top", `${top}px`);
    }
    measureCombatTop.current = measure;
    window.addEventListener("resize", measure);
    document.fonts?.ready?.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  useEffect(() => {
    measureCombatTop.current?.();
  });
  // Which creature's controls the DM has picked in the initiative list. Null
  // means "follow the turn" (the panel shows whoever is up). Picking someone
  // is separate from whose turn it is, and stays put as turns advance.
  const [pickedId, setPickedId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [myRollNote, setMyRollNote] = useState("");
  const [nudgeCooling, setNudgeCooling] = useState(false);
  const nudgeTimer = useRef(null);

  useEffect(() => () => clearTimeout(nudgeTimer.current), []);

  const [hitSource, setHitSource] = useState("");
  const [hitTargetUserId, setHitTargetUserId] = useState("");
  const [hitAmount, setHitAmount] = useState("");

  const characterIds = members
    .map((member) => member.character_id)
    .filter(Boolean)
    .join(",");

  // Everyone at the table: each player's portrait (a public picture), so the
  // turn order shows faces whether or not the DM is sharing the party's HP.
  const [tablePortraits, setTablePortraits] = useState(() => new Map());
  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    getTablePortraits(id).then((found) => {
      if (!cancelled) setTablePortraits(found);
    });
    return () => {
      cancelled = true;
    };
  }, [id, characterIds]);

  // DM: keep the players' (read-only) character sheets fresh.
  useEffect(() => {
    if (!isDm || !characterIds) return undefined;

    let cancelled = false;
    const ids = characterIds.split(",");

    function load() {
      getCharactersByIds(ids)
        .then((loaded) => {
          if (!cancelled) setCharacters(loaded);
        })
        .catch(() => {});
    }

    load();
    const timer = setInterval(load, CHARACTER_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isDm, characterIds]);

  // Player: load the party strip while the DM is sharing it.
  const partyShared = Boolean(table?.share_party);

  useEffect(() => {
    if (isDm || !partyShared) return undefined;

    let cancelled = false;

    function load() {
      getPartyStrip(id)
        .then((minis) => {
          if (!cancelled) setPartyMinis(minis);
        })
        .catch(() => {});
    }

    load();
    const timer = setInterval(load, CHARACTER_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isDm, partyShared, id, characterIds]);

  // DM: the saved monster library, for the "From my library" picker.
  useEffect(() => {
    if (!isDm) return;

    listTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, [isDm]);

  // Player: their own character, for the card at the top (HP, AC,
  // conditions) and so "Roll d20" adds the right Dexterity. Kept fresh, since
  // HP changes on the sheet during a fight.
  const myCharacterId = members.find((member) => member.user_id === user?.id)?.character_id;
  const [mySheet, setMySheet] = useState(null);

  useEffect(() => {
    if (!myCharacterId) return undefined;
    let cancelled = false;

    function load() {
      getCharacter(myCharacterId)
        .then((sheet) => {
          if (cancelled || !sheet) return;
          setMySheet(sheet);
          setMyDexterity(sheet.abilityScores?.dexterity ?? 10);
        })
        .catch(() => {});
    }

    load();
    const timer = setInterval(load, CHARACTER_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [myCharacterId]);

  async function loadBans() {
    try {
      setBans(await listBans(table.id));
    } catch {
      setBans([]); // the list is a convenience; removing still worked
    }
  }

  // DM: who's been removed for good, for the Players tab.
  const tableIdForBans = isDm ? table?.id : null;
  useEffect(() => {
    if (!tableIdForBans) return undefined;
    let ignore = false;
    listBans(tableIdForBans)
      .then((list) => !ignore && setBans(list))
      .catch(() => !ignore && setBans([]));
    return () => {
      ignore = true;
    };
  }, [tableIdForBans]);

  async function run(action) {
    setActionError("");
    try {
      await action();
      await refresh();
    } catch (runError) {
      setActionError(runError.message ?? "Something went wrong.");
    }
  }

  // When a fight starts while the page is open, everyone jumps to Combat.
  // When it ends, the DM goes back to Prep (players stay where they are).
  // (Adjusting state during render, React's pattern for this.)
  const combatOn = Boolean(table?.combat_active);
  const roleTabs = isDm ? DM_TABS : PLAYER_TABS;
  if (table && seenCombat !== combatOn) {
    if (seenCombat !== null && (combatOn || isDm)) {
      const next = combatOn ? "combat" : "prep";
      setTabPick(next);
      writeDmTab(id, next, isDm);
    }
    setSeenCombat(combatOn);
  }
  const turnKey = table?.combat_active ? `${table.round}:${table.current_combatant_id}` : null;
  if (table && turnMarker.turn !== turnKey) {
    setTurnMarker({ turn: turnKey, after: events[0]?.created_at ?? null });
  }
  const storedTab = readDmTab(id, isDm);
  const currentTab =
    (roleTabs.some((tab) => tab.key === tabPick) ? tabPick : null) ??
    (roleTabs.some((tab) => tab.key === storedTab) ? storedTab : null) ??
    (isDm && !combatOn ? "prep" : "combat");
  // Kept for the DM-only sections below.
  const dmTab = currentTab;
  // Each section shows on its own tab.
  const onTab = (key) => currentTab === key;

  function pickTab(key) {
    setTabPick(key);
    writeDmTab(id, key, isDm);
  }

  if (isLoading || isRetrying) {
    return (
      <main className="table-page">
        <div className="table-page__content">
          <StatusNote variant="loading" focusOnShow={hasRetried}>
            Loading table...
          </StatusNote>
        </div>
      </main>
    );
  }

  if (!table) {
    // A request that failed can be tried again. A table that comes back empty is
    // either gone or not yours to see, and the page says the same thing either way.
    return (
      <main className="table-page">
        <div className="table-page__content">
          <h1 className="table-page__status-heading">
            {error ? "Couldn't open this table" : "We couldn't find that table"}
          </h1>
          {error ? (
            <StatusNote variant="error" onRetry={retryLoadingTable}>
              Couldn&apos;t load this table. Check your connection and try again.
            </StatusNote>
          ) : (
            <StatusNote>This table was not found, or you are not part of it.</StatusNote>
          )}
          <Link className="table-page__status-link" to="/games">
            Back to My Games
          </Link>
        </div>
      </main>
    );
  }

  // DMs run a table from /dm/tables/..., players play at /games/... . Old
  // /tables/... links (and the wrong side) move to the right address.
  const home = isDm ? `/dm/tables/${id}` : `/games/${id}`;
  if (location.pathname !== home) {
    return <Navigate to={home} replace />;
  }

  const ordered = sortCombatants(combatants);
  const waiting = combatants.filter(
    (combatant) => combatant.initiative === null || combatant.initiative === undefined,
  );
  const { now, upcoming } = getNowAndNext(combatants, table.current_combatant_id);
  const canStart = ordered.length > 0;
  const prepSteps = getDmPrepSteps({ combatants, combatActive: table.combat_active, canStart });
  const unrolledNpcs = waiting.filter((combatant) => combatant.kind !== "player");
  const unrolledNpcCount = unrolledNpcs.length;
  // "2 monsters and 1 NPC", so friendly NPCs are not called monsters.
  const unrolledMonsterCount = unrolledNpcs.filter((combatant) => combatant.kind === "monster").length;
  const unrolledAllyCount = unrolledNpcCount - unrolledMonsterCount;
  const unrolledLabel = [
    unrolledMonsterCount > 0 &&
      `${unrolledMonsterCount} ${unrolledMonsterCount === 1 ? "monster" : "monsters"}`,
    unrolledAllyCount > 0 && `${unrolledAllyCount} ${unrolledAllyCount === 1 ? "NPC" : "NPCs"}`,
  ]
    .filter(Boolean)
    .join(" and ");
  const myMember = members.find((member) => member.user_id === user?.id);
  const players = combatants.filter((combatant) => combatant.kind === "player");
  const monsters = combatants.filter((combatant) => combatant.kind === "monster");
  const npcs = combatants.filter((combatant) => combatant.kind !== "player");
  const amUp = Boolean(now && now.kind === "player" && now.user_id === user?.id);
  const myCombatant = players.find((player) => player.user_id === user?.id);
  // (Someone marked away isn't waited on or nudged.)
  const waitingPlayers = waiting.filter((combatant) => combatant.kind === "player" && !combatant.away);
  // The player still has to roll initiative: shown as "!" on their Combat tab.
  const needsMyRoll = Boolean(
    myCombatant &&
      (myCombatant.initiative === null || myCombatant.initiative === undefined) &&
      (table.combat_active || hasActiveNudge(events, myCombatant.name)),
  );
  const playerTip = getPlayerTableTip({
    me: myCombatant,
    combatActive: table.combat_active,
    isMyTurn: amUp,
  });
  const awaitingCall = players.filter((player) => player.attack_state === "awaiting_dm");
  // Calls normally show inside the monster's own row; this catches any attack
  // whose target is missing so it can never get stuck.
  const orphanCalls = awaitingCall.filter(
    (player) => !monsters.some((monster) => monster.id === player.attack_target),
  );
  const visibleEvents = showAllEvents ? events : events.slice(0, 5);
  // The monster form lives on the Prep tab. Mid-fight the DM can also open it
  // on the Combat tab from the Combat header (showMonsterForm).
  const selectedSheet =
    characters.find((sheet) => sheet.id === selectedPlayerId) ?? characters[0];
  // Players' portraits for the turn order: everyone at the table gets them from
  // the table's portrait list; the DM's sheets, a player's own sheet and the
  // shared party view fill in anything it missed.
  const avatarByUser = new Map();
  for (const mini of partyMinis) if (mini.userId) avatarByUser.set(mini.userId, mini);
  for (const member of members) {
    const sheet = characters.find((entry) => entry.id === member.character_id);
    if (sheet) avatarByUser.set(member.user_id, sheet);
  }
  if (user?.id && mySheet) avatarByUser.set(user.id, mySheet);
  const portraitByUser = new Map(tablePortraits);
  for (const mini of partyMinis) if (mini.userId && mini.portraitUrl) portraitByUser.set(mini.userId, mini.portraitUrl);
  for (const member of members) {
    const sheet = characters.find((entry) => entry.id === member.character_id);
    if (sheet?.portraitUrl) portraitByUser.set(member.user_id, sheet.portraitUrl);
  }
  if (user?.id && mySheet?.portraitUrl) portraitByUser.set(user.id, mySheet.portraitUrl);

  const partyRows = isDm
    ? characters.map((sheet) => toPartyRow(sheet, { withPassives: true }))
    : partyShared
      // A picture the party view didn't send (an older database function) is
      // filled in from the sheets this page has already loaded.
      ? partyMinis.map((sheet) =>
          toPartyRow({ ...sheet, portraitUrl: sheet.portraitUrl || portraitByUser.get(sheet.userId) || "" }),
        )
      : [];

  // DM taps a name in the party strip: open that character's card.
  function showPlayerCard(sheetId) {
    setSelectedPlayerId(sheetId);
    pickTab("players");
    playersSectionRef.current?.scrollIntoView({
      behavior: shouldReduceMotion() ? "auto" : "smooth",
      block: "start",
    });
  }

  // Adds one or several monsters or allies ("Goblin" x3 becomes Goblin 1, 2, 3).
  // Returns true on success so the form knows it can clear itself.
  async function handleAddCombatants(entry) {
    setActionError("");
    try {
      for (const name of pieceNames(entry.name, entry.count, entry.pieces)) {
        await addCombatant({
          tableId: table.id,
          name,
          maxHp: entry.maxHp,
          kind: entry.kind,
          initiative: entry.initiative,
          armorClass: entry.armorClass,
          statBlock: entry.statBlock,
        });
      }

      // Don't save a second copy of something that is already in the library.
      if (entry.saveToLibrary && !templates.some((template) => isSameTemplate(template, entry))) {
        const saved = await createTemplate({
          name: entry.name,
          kind: entry.kind,
          maxHp: entry.maxHp,
          armorClass: entry.armorClass,
          statBlock: entry.statBlock,
        });
        setTemplates((previous) =>
          [...previous, saved].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }

      await refresh();
      setShowMonsterForm(false);
      return true;
    } catch (addError) {
      setActionError(addError.message ?? "Could not add that.");
      await refresh();
      return false;
    }
  }

  // Saves a monster to the DM's library without adding it to the table, so
  // the DM can prepare for later without leaving this screen.
  async function handleSaveToLibraryOnly(entry) {
    if (templates.some((template) => isSameTemplate(template, entry))) {
      return { ok: false, message: `${entry.name} is already in your library.` };
    }
    try {
      const saved = await createTemplate(entry);
      setTemplates((previous) => [...previous, saved].sort((a, b) => a.name.localeCompare(b.name)));
      return { ok: true, message: `Saved ${entry.name} to your library. It isn't in the fight.` };
    } catch (saveError) {
      return { ok: false, message: saveError.message ?? "Couldn't save that to your library." };
    }
  }

  async function handleHitPlayer(event) {
    event.preventDefault();
    const amount = Number(hitAmount);
    const userId = hitTargetUserId || players[0]?.user_id;
    if (!userId || !Number.isInteger(amount) || amount < 1) return;

    await run(() => postPlayerDamage(table.id, userId, amount, hitSource.trim()));
    setHitAmount("");
  }

  // Rolls initiative for every monster and ally that has none yet. Anyone who
  // already has one (a boss the DM rolled with real dice) is left alone.
  async function rollForAllNpcs() {
    const unrolled = combatants.filter(
      (combatant) =>
        combatant.kind !== "player" &&
        (combatant.initiative === null || combatant.initiative === undefined),
    );
    if (unrolled.length === 0) return;

    await run(async () => {
      for (const combatant of unrolled) {
        const bonus = readStatBlock(enemyHp[combatant.id]?.stat_block).initiativeBonus;
        const { total } = rollMonsterInitiative(bonus);
        await setCombatantInitiative(combatant.id, total);
      }
    });
  }

  // A friendly reminder to players who haven't rolled initiative yet.
  function nudge(...players) {
    if (nudgeCooling) return undefined;
    setNudgeCooling(true);
    clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => setNudgeCooling(false), NUDGE_COOLDOWN_MS);

    return run(async () => {
      for (const player of players) {
        await dmLog(table.id, nudgeMessage(player.name));
      }
    });
  }

  function denyAttack(player) {
    if (
      window.confirm(
        `Deny ${player.name}'s last attack? Any damage it dealt is undone.`,
      )
    ) {
      run(() => dmDenyAttack(player.id));
    }
  }

  function rowProps(combatant) {
    const isMe = combatant.kind === "player" && combatant.user_id === user?.id;

    return {
      combatant,
      isCurrent: table.combat_active && combatant.id === table.current_combatant_id,
      portraitUrl: portraitByUser.get(combatant.user_id) ?? "",
      avatarCharacter: avatarByUser.get(combatant.user_id),
      isDm,
      isMe,
      hp: enemyHp[combatant.id],
      myDexterity,
      onSetInitiative: (target, value) =>
        run(() =>
          isMe ? setMyInitiative(table.id, value) : setCombatantInitiative(target.id, value),
        ),
      onDamage: (target, amount) => run(() => applyDamage(target.id, amount)),
      onDeny: denyAttack,
      onAway: (target, away) => run(() => setCombatantAway(target.id, away)),
      pendingCalls: awaitingCall.filter((player) => player.attack_target === combatant.id),
      combatActive: table.combat_active,
      targets: combatants.filter((other) => other.id !== combatant.id),
      recentEvents: recentEventsFor(events, combatant.name).map((entry) => ({
        ...entry,
        isEarlier: turnMarker.after !== null && entry.created_at <= turnMarker.after,
      })),
      tableId: table.id,
      onChanged: refresh,
      onEdit: async (changes) => {
        await editCombatant(changes);
        await refresh();
      },
      onResolve: (attacker, hit) => run(() => dmResolveAttack(attacker.id, hit)),
      onNudge: isDm && combatant.kind === "player" && combatant.initiative == null ? nudge : null,
      nudged: combatant.kind === "player" && hasActiveNudge(events, combatant.name),
      nudgeCooling,
      onRemove: (target, { forGood = false } = {}) => {
        if (target.kind === "player") {
          run(async () => {
            if (forGood) {
              await banMember(table.id, target.user_id);
              await loadBans();
            } else {
              await removeMember(table.id, target.user_id);
            }
          });
        } else {
          run(() => removeCombatant(target.id));
        }
      },
    };
  }

  // A player's page: the whole row, as it has always been.
  function renderRow(combatant) {
    return <CombatantRow key={combatant.id} {...rowProps(combatant)} />;
  }

  // The DM's list: one short line each, and one panel of controls underneath
  // for the creature picked (or, by default, whoever's turn it is).
  const currentId = table.combat_active ? table.current_combatant_id : null;
  // Each player's party row, by character: the one source for their conditions
  // and concentration, used by the Party card, the initiative line and the
  // picked character's panel alike.
  const partyRowById = new Map(partyRows.map((row) => [row.id, row]));
  const sheetOfCombatant = (combatant) =>
    combatant.kind === "player"
      ? characters.find((entry) =>
          members.some((m) => m.user_id === combatant.user_id && m.character_id === entry.id),
        )
      : null;
  // Characters whose statuses show on their initiative line, so their Party
  // card doesn't repeat them. Anyone not in the initiative order keeps theirs
  // on the card.
  const currentSheetId = sheetOfCombatant(combatants.find((c) => c.id === currentId) ?? {})?.id ?? null;
  const statusOnInitiative = new Set(
    combatants.map((combatant) => sheetOfCombatant(combatant)?.id).filter(Boolean),
  );
  const selectedId = combatants.some((c) => c.id === pickedId)
    ? pickedId
    : (combatants.find((c) => c.id === currentId)?.id ?? ordered[0]?.id ?? combatants[0]?.id ?? null);
  const selectedCombatant = combatants.find((c) => c.id === selectedId) ?? null;

  function renderSummary(combatant) {
    const props = rowProps(combatant);
    const sheet = sheetOfCombatant(combatant);
    return (
      <CombatantSummaryRow
        key={combatant.id}
        {...props}
        // Before the fight nobody is "selected" until the DM picks someone (their panel isn't shown before that).
        selected={combatant.id === (!table.combat_active && pickedId === null ? null : selectedId)}
        statusRow={sheet ? partyRowById.get(sheet.id) : null}
        // Picking whoever is up goes back to following the turn. Tapping the
        // one you already picked lets go of it: before a fight that closes
        // its panel, during one the panel follows the turn again.
        onSelect={(id) => setPickedId(id === currentId || id === pickedId ? null : id)}
        playerStats={
          sheet?.combat?.hitPoints
            ? {
                current_hp: sheet.combat.hitPoints.current ?? 0,
                max_hp: sheet.combat.hitPoints.max ?? 0,
                armor_class: toPartyRow(sheet).armorClass,
              }
            : null
        }
      />
    );
  }

  // On the DM's Combat tab, wide screens lay these out in three panels:
  // the party, the fight, and the damage form with the activity log. Other
  // tabs (and narrow screens) show them one after another as before.
  const dmCombatLayout = isDm && dmTab === "combat";
  // The DM's Prep tab lays its panels out in two columns (TablePage.css).
  const prepLayout = isDm && dmTab === "prep";
  const playerCount = partyRows.length;
  const partyHurt = partyRows.filter((row) => row.health === "bloodied").length;
  const partyDown = partyRows.filter((row) => row.health === "down").length;
  const partyGlance =
    partyDown + partyHurt === 0
      ? "Everyone is healthy"
      : [partyHurt > 0 ? `${partyHurt} bloodied` : "", partyDown > 0 ? `${partyDown} down` : ""]
          .filter(Boolean)
          .join(" · ");
  const shareLabel = isDm && (
    <label className="table-page__party-share">
      <input
        type="checkbox"
        checked={partyShared}
        onChange={(event) => run(() => setShareParty(table.id, event.target.checked))}
      />
      Let players see the party&apos;s HP, AC and conditions
    </label>
  );
  const partyInner = (
    <>
      {isDm && (
        <div id="party-visibility" className="table-page__party-visibility" hidden={!shareOpen}>
          {shareLabel}
        </div>
      )}
      <PartyStrip
        rows={partyRows}
        onSelect={isDm ? showPlayerCard : undefined}
        selectedId={isDm && selectedPlayerId !== "all" ? selectedSheet?.id : undefined}
        compact={dmCombatLayout}
        hideStatusFor={dmCombatLayout ? statusOnInitiative : null}
        currentId={dmCombatLayout ? currentSheetId : null}
      />
    </>
  );
  const partyBlock = (isDm ? characters.length > 0 : partyRows.length > 0) && (
          <section
            className={`table-page__party${isDm ? " table-page__section--panel table-page__party--panel" : ""}${
              partyOpen ? " table-page__party--open" : ""
            }`}
            aria-labelledby="party-title"
          >
            {isDm ? (
              /* The same slim header bar as the other panels. */
              <header className="table-page__slim-head table-page__slim-head--bar">
                <h2 id="party-title" className="table-page__slim-title">
                  Party · {playerCount} {playerCount === 1 ? "player" : "players"}
                </h2>
                {isDm && (
                  <button
                    type="button"
                    className="table-page__party-visibility-toggle"
                    aria-expanded={shareOpen}
                    aria-controls="party-visibility"
                    onClick={() => setShareOpen((open) => !open)}
                  >
                    <span className="table-page__visually-hidden">Party visibility: </span>
                    {partyShared ? "Stats shared" : "Stats hidden"}
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                      <path d={shareOpen ? ICON_PATHS.close : ICON_PATHS.open} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                {/* Narrow screens: the party folds away behind this button (wide
                    screens always show it, and the button is hidden). */}
                <button
                  type="button"
                  className="table-page__party-toggle"
                  aria-expanded={partyOpen}
                  aria-controls="party-body"
                  onClick={() => setPartyOpen((open) => !open)}
                >
                  <span className="table-page__party-glance">{partyGlance}</span>
                  <span className="table-page__party-toggle-word">{partyOpen ? "Hide" : "Show"}</span>
                </button>
              </header>
            ) : (
              <div className="table-page__party-head">
                <h2 id="party-title" className="table-page__section-title">
                  Party
                </h2>
                {shareLabel}
              </div>
            )}
            {isDm ? (
              <div
                id="party-body"
                className={`table-page__party-body table-page__slim-body${partyOpen ? " table-page__party-body--open" : ""}`}
              >
                {partyInner}
              </div>
            ) : (
              partyInner
            )}
          </section>
        );
  // The list scrolls inside its box, so a waiting attack gets its own way to be
  // reached: this takes the DM straight to it.
  const callJump = isDm && awaitingCall.length > 0 && (
    <button
      type="button"
      className="table-page__call-jump"
      onClick={() => {
        const row = document.querySelector(".table-page__row--awaiting");
        row?.scrollIntoView?.({ block: "nearest" });
        row?.querySelector("button")?.focus();
      }}
    >
      ⚠ {awaitingCall.length === 1 ? "1 attack needs your call" : `${awaitingCall.length} attacks need your call`}
      : go to it
    </button>
  );
  const combatBlock = (onTab("combat") || (dmTab === "prep" && !table.combat_active)) && (
        <section
          className={`table-page__combat${isDm ? " table-page__section--panel table-page__combat--panel" : ""}${
            isDm && !table.combat_active ? " table-page__combat--setup" : ""
          }`}
          ref={combatRef}
        >
          {isDm && (
            <>
              {/* The same slim header bar as the other panels: the title, with
                  adding a monster and ending the fight beside it. */}
              <header className="table-page__slim-head table-page__slim-head--bar">
                <h2 className="table-page__slim-title">{prepLayout ? "Initiative setup" : "Combat"}</h2>
                <div className="table-page__combat-buttons">
                  {table.combat_active && (
                    <Button
                      variant="secondary"
                      aria-expanded={showMonsterForm}
                      onClick={() => setShowMonsterForm((open) => !open)}
                    >
                      {showMonsterForm ? "Hide monster form" : "+ Add monster"}
                    </Button>
                  )}
                  {table.combat_active && (
                    <Button variant="secondary" onClick={() => run(() => endCombat(table.id))}>
                      End combat
                    </Button>
                  )}
                </div>
              </header>
              {/* The toolbar right under it: the round and whose turn it is,
                  New encounter, and Next turn at the far right. */}
              <div className="table-page__toolbar">
                {table.combat_active ? (
                  <p className="table-page__turn-line">
                    <strong>Round {table.round}</strong>
                    {now && <> · Now: <strong>{now.name}</strong></>}
                    {now && now.attacks_this_turn > 0 && (
                      <> ({now.attacks_this_turn} {now.attacks_this_turn === 1 ? "attack" : "attacks"})</>
                    )}
                    {upcoming.length > 0 && (
                      <>
                        {" · "}
                        {describeUpcoming(upcoming, myCombatant?.id)}
                      </>
                    )}
                  </p>
                ) : prepLayout ? (
                  <p className="table-page__turn-line">Creatures you&apos;ve added for this encounter.</p>
                ) : (
                  <p className="table-page__turn-line">No fight in progress.</p>
                )}
                <div className="table-page__combat-buttons">
                  {unrolledNpcCount > 0 && (
                    <Button variant={prepLayout ? undefined : "secondary"} onClick={rollForAllNpcs}>
                      {`Roll initiative for ${unrolledLabel}`}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Clear all monsters and everyone's initiative for a new encounter?",
                        )
                      ) {
                        run(async () => {
                          await resetEncounter(table.id);
                          await dmLog(table.id, NEW_ENCOUNTER_MESSAGE);
                        });
                      }
                    }}
                  >
                    New encounter
                  </Button>
                  {table.combat_active ? (
                    <Button className="table-page__next-turn" onClick={() => run(() => advanceTurn(table, combatants))}>
                      Next turn
                    </Button>
                  ) : (
                    !prepLayout && (
                      <Button
                        className="table-page__next-turn"
                        disabled={!canStart}
                        onClick={() => run(() => startCombat(table.id, combatants))}
                      >
                        Start combat
                      </Button>
                    )
                  )}
                </div>
              </div>
            </>
          )}
          {!isDm && (
          <div className="table-page__combat-head">
            <h2 className="table-page__section-title">Combat</h2>

            {table.combat_active ? (
              <p className="table-page__turn-line">
                <strong>Round {table.round}</strong>
                {now && <> · Now: <strong>{now.name}</strong></>}
                {now && now.attacks_this_turn > 0 && (
                  <> ({now.attacks_this_turn} {now.attacks_this_turn === 1 ? "attack" : "attacks"})</>
                )}
                {upcoming.length > 0 && (
                  <>
                    {" · "}
                    {describeUpcoming(upcoming, myCombatant?.id)}
                  </>
                )}
              </p>
            ) : (
              <p className="table-page__turn-line">No fight in progress.</p>
            )}

            {!isDm && table.combat_active && amUp && (
              <div className="table-page__combat-buttons">
                <Button onClick={() => run(() => endMyTurn(table.id))}>End my turn</Button>
              </div>
            )}


          </div>
          )}

          {/* On Prep, Start combat and its reason sit in the readiness bar. */}
          {isDm && !canStart && !prepLayout && (
            <p className="table-page__hint">
              Set at least one initiative (yours, a player's, or a monster's) to start combat.
            </p>
          )}

          {isDm && unrolledNpcCount > 0 && !prepLayout && (
            <p className="table-page__hint">
              Rolling for a boss yourself? Set its initiative first, then use the roll button
              for the rest. Anyone who already has an initiative is left alone.
            </p>
          )}
          {isDm && unrolledNpcCount > 0 && prepLayout && (
            <details className="table-page__hint-more">
              <summary>How rolling works</summary>
              <p>
                Rolling for a boss yourself? Set its initiative first, then use the roll button for the rest.
                Anyone who already has an initiative is left alone. Set one at least to start combat.
              </p>
            </details>
          )}

          {!isDm && myCombatant && myCombatant.initiative == null && (
            <InitiativePrompt
              combatant={myCombatant}
              dexterity={myDexterity}
              nudgeId={findActiveNudge(events, myCombatant.name)?.id ?? null}
              onSet={(total, note) => {
                setMyRollNote(note);
                run(() => setMyInitiative(table.id, total));
              }}
            />
          )}

          {!isDm && myRollNote && myCombatant?.initiative != null && (
            <p className="table-page__hint" role="status">
              Your initiative: {myRollNote}.
            </p>
          )}

          {!isDm && myCombatant?.away && (
            <p className="table-page__hint" role="status">
              Your DM has marked you away, so your turns are skipped. Ask them to bring you back when you&apos;re
              ready.
            </p>
          )}
          {!isDm && playerTip && <p className="table-page__hint">{playerTip}</p>}

          {/* Listed first: these are who the table is waiting on. */}
          {waiting.length > 0 && (
            <>
              <h3 className="table-page__subtitle table-page__subtitle--order">
                Waiting for initiative ({waiting.length})
              </h3>
              <ul className={`table-page__order${isDm ? " table-page__order--waiting" : ""}`} aria-label="Waiting for initiative">
                {waiting.map(isDm ? renderSummary : renderRow)}
              </ul>
            </>
          )}

          {ordered.length > 0 &&
            (isDm ? (
              <div className="table-page__order-head">
                <h3 className="table-page__subtitle table-page__subtitle--order">Initiative order</h3>
                {callJump}
              </div>
            ) : (
              <h3 className="table-page__subtitle table-page__subtitle--order">Initiative order</h3>
            ))}
          <ol className="table-page__order" aria-label="Initiative order">
            {ordered.map(isDm ? renderSummary : renderRow)}
          </ol>

          {/* The DM's controls for the creature picked above. Every creature's
              panel stays on the page (only the picked one is shown), so an
              amount typed or an attack in progress is still there when the DM
              looks at someone else and comes back. */}
          {isDm && selectedCombatant && (table.combat_active || pickedId !== null) && (
            <section
              id="detail-panel"
              className="table-page__detail"
              aria-labelledby="detail-title"
              tabIndex={-1}
            >
              <div className="table-page__detail-head">
                <h3 id="detail-title" className="table-page__detail-title">
                  Selected · {selectedCombatant.name}
                </h3>
                <span className="table-page__detail-note">
                  {pickedId === null ? "Following the turn" : "Picked by you"}
                </span>
                {pickedId !== null && currentId && (
                  <Button type="button" variant="secondary" onClick={() => setPickedId(null)}>
                    Follow the turn
                  </Button>
                )}
              </div>
              {combatants.map((combatant) => (
                <CombatantRow
                  key={combatant.id}
                  {...rowProps(combatant)}
                  variant="detail"
                  selected={combatant.id === selectedId}
                  statusRow={partyRowById.get(sheetOfCombatant(combatant)?.id) ?? null}
                />
              ))}
            </section>
          )}

          {combatants.length === 0 && (
            <p className="table-page__empty">
              Nobody is here yet.{isDm ? " Share the join code with your players." : ""}
            </p>
          )}
        </section>
        );
  const addMonsterBlock = isDm && (dmTab === "prep" || (dmTab === "combat" && table.combat_active && showMonsterForm)) && (
          <section className="table-page__section table-page__section--panel">
            <header className="table-page__slim-head">
              <h2 className="table-page__slim-title">Add monsters and NPCs</h2>
            </header>
            <div className="table-page__slim-body">
            <p className="table-page__hint">
              Add to the fight puts it in tonight&apos;s fight now; Save for later only stores it in your
              library. Players never see HP, AC or stat blocks.
            </p>
            <details className="table-page__hint-more">
              <summary>What players can see</summary>
              <p>
                Players see a name, a status like Bloodied, and damage taken. They never see HP, AC, or a
                stat block. Add several at once, or pick from your library. Friendly NPCs and party members
                you track by hand are added the same way.
              </p>
            </details>
            <AddCombatantForm
              onAdd={handleAddCombatants}
              onSaveToLibrary={handleSaveToLibraryOnly}
              templates={templates}
            />
            </div>
          </section>
        );
  const orphanBlock = isDm && dmTab === "combat" && orphanCalls.length > 0 && (
          <section className="table-page__section table-page__section--alert" role="alert">
            <h2 className="table-page__section-title">Waiting for your call</h2>
            {orphanCalls.map((player) => {
              const target = combatants.find((c) => c.id === player.attack_target);
              return (
                <div className="table-page__call" key={player.id}>
                  <span>
                    <strong>{player.name}</strong> attacked{" "}
                    <strong>{target?.name ?? "an enemy"}</strong> with{" "}
                    {player.attack_name ?? "an attack"}. Does it hit?
                  </span>
                  <div className="table-page__inline-form">
                    <Button onClick={() => run(() => dmResolveAttack(player.id, true))}>
                      Hit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => run(() => dmResolveAttack(player.id, false))}
                    >
                      Miss
                    </Button>
                    <Button variant="secondary" onClick={() => denyAttack(player)}>
                      Deny
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        );
  const damageBlock = isDm && dmTab === "combat" && players.length > 0 && (
          <section className="table-page__section table-page__section--panel">
            <header className="table-page__slim-head">
              <h2 className="table-page__slim-title">Send damage to a player</h2>
            </header>
            <div className="table-page__slim-body">
              <form className="table-page__monster-form" onSubmit={handleHitPlayer}>
                <div className="table-page__field-group">
                  <label className="table-page__field" htmlFor="hit-source">
                    <span className="table-page__field-label">Attacker</span>
                  </label>
                  <input
                    id="hit-source"
                    className="table-page__input"
                    list="enemy-names"
                    placeholder="Name"
                    maxLength={80}
                    value={hitSource}
                    onChange={(event) => setHitSource(event.target.value)}
                  />
                  <datalist id="enemy-names">
                    {npcs.map((npc) => (
                      <option key={npc.id} value={npc.name} />
                    ))}
                  </datalist>
                </div>
                <div className="table-page__field-group">
                  <label className="table-page__field" htmlFor="hit-target">
                    <span className="table-page__field-label">Target</span>
                  </label>
                  <select
                    id="hit-target"
                    className="table-page__input"
                    value={hitTargetUserId || players[0].user_id}
                    onChange={(event) => setHitTargetUserId(event.target.value)}
                  >
                    {players.map((player) => (
                      <option key={player.id} value={player.user_id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="table-page__field-group">
                  <label className="table-page__field" htmlFor="hit-amount">
                    <span className="table-page__field-label">Amount</span>
                  </label>
                  <input
                    id="hit-amount"
                    className="table-page__number"
                    type="number"
                    min="1"
                    placeholder="0"
                    value={hitAmount}
                    onChange={(event) => setHitAmount(event.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={!hitAmount}
                  aria-label={`Send${hitAmount ? ` ${hitAmount}` : ""} damage to ${
                    players.find((player) => player.user_id === (hitTargetUserId || players[0].user_id))?.name ??
                    "the player"
                  } to apply`}
                >
                  Send to player to apply
                </Button>
              </form>
              <p className="table-page__hint">
                This sends a damage request to the player. It does not change their HP directly.
              </p>
              <details className="table-page__help">
                <summary>How does this work?</summary>
                <p>
                  Say who hit them and for how much. The player sees it on their own sheet and
                  taps Apply to take it. You never edit their character.
                </p>
              </details>
            </div>
          </section>
        );
  // When something happened, as "4:21 PM" (nothing if the time can't be read).
  const eventTime = (entry) => {
    const date = new Date(entry.created_at);
    return Number.isNaN(date.getTime())
      ? null
      : { iso: date.toISOString(), text: date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) };
  };
  const activityBlock = onTab("combat") && (isDm ? (
        <section className="table-page__section table-page__section--panel">
          <header className="table-page__slim-head">
            <h2 className="table-page__slim-title">Activity</h2>
          </header>
          <div className="table-page__slim-body">
            {events.length === 0 ? (
              <p className="table-page__empty">Nothing has happened yet.</p>
            ) : (
              <>
                {/* A fixed space on the left of every entry is kept for an icon
                    for each kind of activity, to come later. */}
                <ul
                  className={`table-page__log table-page__log--icons${showAllEvents ? " table-page__log--expanded" : ""}`}
                  tabIndex={0}
                  aria-label="Activity log"
                >
                  {visibleEvents.map((entry) => {
                    const when = eventTime(entry);
                    // The icon comes only from the line's explicit kind, never
                    // from its words; no kind means no icon and no empty box.
                    const icon = getActivityIcon(entry.kind);
                    return (
                      <li key={entry.id} className={icon ? "table-page__log-item--icon" : undefined}>
                        {icon && <img className="table-page__log-icon" src={icon} alt="" width="30" height="30" />}
                        <span className="table-page__log-text">{entry.message}</span>
                        {when && (
                          <time className="table-page__log-time" dateTime={when.iso}>
                            {when.text}
                          </time>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {events.length > 5 && (
                  <Button
                    variant="secondary"
                    className="table-page__log-toggle"
                    onClick={() => setShowAllEvents((open) => !open)}
                  >
                    {showAllEvents ? "Show fewer" : `Show all ${events.length}`}
                  </Button>
                )}
              </>
            )}
          </div>
        </section>
  ) : (
        <section className="table-page__section">
          <h2 className="table-page__section-title">Activity</h2>
          {events.length === 0 ? (
            <p className="table-page__empty">Nothing has happened yet.</p>
          ) : (
            <>
              <ul className={`table-page__log${showAllEvents ? " table-page__log--expanded" : ""}`}>
                {visibleEvents.map((entry) => (
                  <li key={entry.id}>{entry.message}</li>
                ))}
              </ul>
              {events.length > 5 && (
                <Button
                  variant="secondary"
                  className="table-page__log-toggle"
                  onClick={() => setShowAllEvents((open) => !open)}
                >
                  {showAllEvents ? "Show fewer" : `Show all ${events.length}`}
                </Button>
              )}
            </>
          )}
        </section>
  ));

  const handoutsPanel = onTab("story") && (
    <TableHandouts
      tableId={table.id}
      isDm={isDm}
      players={players.map((player) => ({ userId: player.user_id, name: player.name }))}
      onSharedWithEveryone={(title) =>
        run(() =>
          Promise.all([
            dmLog(table.id, `📜 The DM shared a handout: ${title}`, "handout"),
            // Also into the journal, so the session recap shows when it appeared.
            addJournalEntry(table.id, {
              body: `📜 Shared a handout: ${title}`,
              visibility: "table",
            }),
          ]),
        )
      }
    />
  );
  const journalPanel = onTab("story") && (
    <TableJournal
      tableId={table.id}
      userId={user?.id}
      isDm={isDm}
      composerLast={isDm}
      avatarCharacters={avatarByUser}
      sessionNumber={table.session_number ?? 1}
      campaignNumber={table.campaign_number ?? 1}
      campaignNames={table.campaign_names ?? {}}
    />
  );

  return (
    <main className={`table-page${isDm ? " table-page--dm" : ""}`}>
      <div className={`table-page__content${dmCombatLayout || (isDm && (dmTab === "story" || dmTab === "players" || dmTab === "prep")) ? " table-page__content--wide" : ""}`}>
        <Link className="table-page__back" to={isDm ? "/dm" : "/games"}>
          {isDm ? "← DM Screen" : "← My Games"}
        </Link>

        {/* A player's quiet heads-up when their turn is next or here. */}
        {!isDm && table.combat_active && (
          <TurnHeadsUp
            isMyTurn={amUp}
            isNext={Boolean(myCombatant && !amUp && upcoming[0]?.id === myCombatant.id)}
          />
        )}

        <header className={`table-page__header${isDm ? "" : " table-page__header--banner"}`}>
          {/* The banner picture: decoration only, behind the title. The DM's is the lantern;
              a player's is the same sample picture their table has on My Games. */}
          {isDm ? (
            <img className="table-page__banner-art table-page__banner-art--lantern" src={lanternArt} alt="" width="940" height="370" />
          ) : (
            <img
              className="table-page__banner-art table-page__banner-art--wide"
              src={getBannerInfo("player-game").src}
              srcSet={getBannerInfo("player-game").srcSet}
              sizes="(min-width: 620px) 620px, 100vw"
              alt=""
              width="2172"
              height="724"
            />
          )}
          <div className="table-page__header-text">
            {/* The DM's join code sits right beside the table name as a small
                pill (it wraps under a long name). */}
            {isDm ? (
              <div className="table-page__title-row">
                <h1 className="table-page__title">{table.name}</h1>
                <div className="table-page__code">
                  <span className="table-page__code-label">Join code</span>
                  <span className="table-page__code-value">{table.join_code}</span>
                </div>
              </div>
            ) : (
              <h1 className="table-page__title">{table.name}</h1>
            )}
            <p className="table-page__role">
              {isDm ? "DM Screen" : "You are a player"} ·{" "}
              <Link className="table-page__guide-link" to="/guide?section=tables">
                How tables work
              </Link>
            </p>
          </div>

        </header>

        {actionError ? (
          <p className="table-page__error" role="alert">
            {actionError}
          </p>
        ) : (
          error && (
            <StatusNote variant="error" onRetry={refresh}>
              Couldn&apos;t refresh this table just now. It will keep trying, or you can try again.
            </StatusNote>
          )
        )}

        {/* The player's own character, always on top of their game page. */}
        {!isDm && myMember?.character_id && (
          <PlayerCharacterCard sheet={mySheet} characterId={myMember.character_id} />
        )}

        {/* The DM's table rules, for players to read (nothing if there are none). */}
        {!isDm && <TableRules tableId={table.id} rules={table.table_rules} />}

        {/* What the DM doesn't allow here (nothing shows if nothing is blocked). */}
        {!isDm && <ContentNotice banned={cleanBanned(table.banned_content)} sheet={mySheet} />}

        {!dmCombatLayout && !(isDm && (dmTab === "story" || dmTab === "players" || dmTab === "prep")) && partyBlock}

        {(isDm || myMember) && (
          <div className="table-page__tabs-bar">
            <div
              className="table-page__dm-tabs"
              role="tablist"
              aria-label={isDm ? "DM screen" : "Game"}
            >
              {roleTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  id={`dm-tab-${tab.key}`}
                  aria-selected={dmTab === tab.key}
                  className={`table-page__dm-tab${dmTab === tab.key ? " table-page__dm-tab--active" : ""}`}
                  onClick={() => pickTab(tab.key)}
                >
                  {tab.label}
                  {isDm && tab.key === "combat" && awaitingCall.length > 0 && (
                    <span className="table-page__dm-tab-count" aria-label={`${awaitingCall.length} waiting`}>
                      {awaitingCall.length}
                    </span>
                  )}
                  {/* A player who still has to roll initiative (or was nudged). */}
                  {!isDm && tab.key === "combat" && needsMyRoll && currentTab !== "combat" && (
                    <span className="table-page__dm-tab-count" aria-label="Roll initiative">
                      !
                    </span>
                  )}
                </button>
              ))}
            </div>
            {table.combat_active && dmTab !== "combat" && (
              <p className="table-page__tab-turn">
                Round {table.round}
                {now ? ` · ${now.name}'s turn` : ""}
                {!isDm && amUp && " · It's your turn!"}
                {isDm && awaitingCall.length > 0 && (
                  <>
                    {" · "}
                    <button type="button" className="table-page__tab-turn-link" onClick={() => pickTab("combat")}>
                      {awaitingCall.length === 1 ? "1 attack needs your call" : `${awaitingCall.length} attacks need your call`}
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {/* The DM's Combat tab: three panels side by side on wide screens (the
            party, the fight, and damage plus activity), one after another on
            narrow ones (TablePage.css). */}
        {dmCombatLayout && (
          <div className="table-page__dm-grid">
            <div className="table-page__dm-party">{partyBlock}</div>
            <div className="table-page__dm-main">
              {orphanBlock}
              {combatBlock}
              {addMonsterBlock}
            </div>
            <div className="table-page__dm-side">
              {damageBlock}
              {activityBlock}
            </div>
          </div>
        )}

        {/* The DM's Prep tab: how ready the fight is across the top, the
            encounter helper and the add form on the left, and the table's
            rules, allowed content, loot ideas and the initiative list on
            the right (one column on narrow screens; TablePage.css). */}
        {prepLayout && (
          <div className="table-page__prep-grid">
            <div className="table-page__prep-ready">
              {table.combat_active ? (
                <section className="table-page__prep table-page__prep--live table-page__section--panel" aria-label="The fight is on">
                  <p className="table-page__prep-live-text">
                    The fight is on. Add more monsters here, or head to the Combat tab to run it.
                  </p>
                  <Button className="table-page__next-turn" onClick={() => pickTab("combat")}>
                    Go to Combat →
                  </Button>
                </section>
              ) : (
                <section className="table-page__prep table-page__prep--ready table-page__section--panel" aria-labelledby="prep-title">
                  <header className="table-page__prep-head">
                    <h2 id="prep-title" className="table-page__prep-title">
                      Before the fight
                    </h2>
                    <button
                      type="button"
                      className="table-page__prep-more-toggle"
                      aria-expanded={showPrepDetails}
                      aria-controls="prep-details"
                      onClick={() => setShowPrepDetails((open) => !open)}
                    >
                      {showPrepDetails ? "Hide step details" : "Step details"}
                    </button>
                    <div className="table-page__prep-go">
                      <Button
                        className="table-page__next-turn"
                        disabled={!canStart}
                        aria-describedby={canStart ? undefined : "prep-start-hint"}
                        onClick={() => run(() => startCombat(table.id, combatants))}
                      >
                        Start combat
                      </Button>
                      {!canStart && (
                        <span id="prep-start-hint" className="table-page__prep-go-hint">
                          Set at least one initiative first.
                        </span>
                      )}
                    </div>
                  </header>
                  <ol className="table-page__prep-steps">
                    {prepSteps.map((step, index) => (
                      <li
                        key={step.id}
                        className={`table-page__prep-step${step.done ? " table-page__prep-step--done" : ""}${
                          step.current ? " table-page__prep-step--current" : ""
                        }`}
                      >
                        <span className="table-page__prep-mark" aria-hidden="true">
                          {step.done ? "✓" : index + 1}
                        </span>
                        <span className="table-page__prep-step-text">
                          <strong>{step.label}</strong>
                          <span className="table-page__visually-hidden">{step.done ? " (done)" : " (to do)"}</span>
                          <span className="table-page__prep-detail">{step.status}</span>
                          {step.id === "initiative" && waitingPlayers.length > 0 && (
                            <Button
                              variant="secondary"
                              className="table-page__prep-action"
                              disabled={nudgeCooling}
                              onClick={() => nudge(...waitingPlayers)}
                            >
                              {nudgeCooling
                                ? "Nudged ✓"
                                : `🔔 Nudge ${
                                    waitingPlayers.length === 1
                                      ? waitingPlayers[0].name
                                      : `${waitingPlayers.length} players`
                                  } to roll`}
                            </Button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {/* The longer explanation for each step, including who is still waiting. */}
                  <ul id="prep-details" className="table-page__prep-details" hidden={!showPrepDetails}>
                    {prepSteps.map((step) => (
                      <li key={step.id}>
                        <strong>{step.label}.</strong> {step.detail}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="table-page__prep-main">
              {/* Ideas for a fight that suits the party, from the free SRD monsters. */}
              <EncounterHelper
                levels={characters.map((sheet) => Number(sheet.level) || 1)}
                onAdd={handleAddCombatants}
              />
              {addMonsterBlock}
            </div>

            <div className="table-page__prep-side">
              {!table.combat_active && combatBlock}
              <TableRules
                key={table.id}
                tableId={table.id}
                rules={table.table_rules}
                isDm
                onSave={(text) => setTableRules(table.id, text)}
              />
              <ContentRules
                banned={cleanBanned(table.banned_content)}
                onSave={(next) => setBannedContent(table.id, next)}
              />
              {/* And ideas for what the fight leaves behind. */}
              <LootHelper levels={characters.map((sheet) => Number(sheet.level) || 1)} />
            </div>
          </div>
        )}

        {/* The Combat tab and the players' page (the DM's Prep tab has its own layout above). */}
        {!dmCombatLayout && !prepLayout && combatBlock}

        {!dmCombatLayout && !prepLayout && addMonsterBlock}

        {!dmCombatLayout && !prepLayout && orphanBlock}

        {!dmCombatLayout && !prepLayout && damageBlock}

        {/* Handouts: made and revealed on the DM's Story tab; players see
            the ones revealed to them on their page. The shared journal is on
            the DM's Story tab and every player's page. The DM's Story tab lays
            the party clues, journal and handouts side by side (TablePage.css). */}
        {onTab("story") && (
          <div className={isDm ? "table-page__story-grid" : "table-page__story-plain"} ref={isDm ? combatRef : undefined}>
            {isDm && (
              <div className="table-page__story-clues">
                <DmStoryTab
                  characters={characters}
                  statusFor={(id) => <StatusLine name="" status={statusOf(partyRowById.get(id))} />}
                />
              </div>
            )}
            {isDm ? (
              <div className="table-page__story-journal">{journalPanel}</div>
            ) : null}
            <div className={isDm ? "table-page__story-handouts" : undefined}>{handoutsPanel}</div>
            {!isDm && journalPanel}
          </div>
        )}

        {isDm && dmTab === "players" && (
          <DmPlayersTab
            characters={characters}
            selectedId={selectedPlayerId}
            onSelect={setSelectedPlayerId}
            bannedFor={(sheet) => bannedChoicesOf(sheet, cleanBanned(table.banned_content))}
            shareControl={shareLabel}
            partyShared={partyShared}
            sectionRef={playersSectionRef}
          >
            {/* Players removed for good can't rejoin until the DM lets them back. */}
            {bans.length > 0 && (
              <div className="table-page__bans">
                <h3 className="table-page__section-subtitle">Removed for good</h3>
                <ul className="table-page__ban-list">
                  {bans.map((ban) => (
                    <li key={ban.user_id} className="table-page__ban">
                      <span>{ban.name || "A player"}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          run(async () => {
                            await unbanMember(table.id, ban.user_id);
                            await loadBans();
                          })
                        }
                      >
                        Let them back
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DmPlayersTab>
        )}

        {!isDm && myMember && table.combat_active && onTab("combat") && (
          <p className="table-page__hint">
            Attacks and damage happen on your character sheet. Use the button at the
            top to open it.
          </p>
        )}

        {/* The log is mostly about fights, so the DM sees it on Combat only. */}
        {!dmCombatLayout && activityBlock}

        <footer className="table-page__footer">
          {isDm ? (
            <Button
              variant="danger"
              onClick={async () => {
                if (window.confirm(`Delete "${table.name}" for everyone? This cannot be undone.`)) {
                  await run(() => deleteTable(table.id));
                  navigate("/dm");
                }
              }}
            >
              Delete table
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={async () => {
                if (window.confirm("Leave this table?")) {
                  await run(() => leaveTable(table.id));
                  navigate("/games");
                }
              }}
            >
              Leave table
            </Button>
          )}
        </footer>
      </div>
    </main>
  );
}

export default TablePage;
