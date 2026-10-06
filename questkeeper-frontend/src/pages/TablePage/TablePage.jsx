import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  leaveTable,
  listTemplates,
  postPlayerDamage,
  removeCombatant,
  removeMember,
  resetEncounter,
  setCombatantInitiative,
  setMyInitiative,
  startCombat,
} from "../../utils/tableStore";
import { isSameTemplate, pieceNames, readStatBlock, recentEventsFor } from "../../utils/statBlock";
import {
  NEW_ENCOUNTER_MESSAGE,
  getDmPrepSteps,
  getPlayerTableTip,
  findActiveNudge,
  hasActiveNudge,
  nudgeMessage,
} from "../../utils/tableGuidance";
import { getAbilityModifier } from "../../utils/characterSheet";
import Button from "../../components/Button/Button";
import CharacterSummaryCard from "../../components/CharacterSummaryCard/CharacterSummaryCard";
import MonsterAttackPanel from "../../components/MonsterAttackPanel/MonsterAttackPanel";
import AddCombatantForm from "../../components/AddCombatantForm/AddCombatantForm";
import CombatantEditPanel from "../../components/CombatantEditPanel/CombatantEditPanel";
import "./TablePage.css";

const CHARACTER_POLL_MS = 10000;
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

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function formatRollNote(roll, modifier, total) {
  return `Rolled ${roll} ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)} = ${total}`;
}

// Shown at the top of Combat to a player who hasn't rolled initiative yet, so
// they don't have to find their own row under a long list of monsters. A
// physical roll works like attacks: type just the die, and Dexterity is added.
function InitiativePrompt({ combatant, dexterity, onSet, nudgeId = null }) {
  const [dieInput, setDieInput] = useState("");
  const cardRef = useRef(null);
  const nudged = nudgeId !== null;

  // Shake once for each new nudge (each has its own log id). Skipped for
  // people who ask their device for less motion; the glow still shows.
  useEffect(() => {
    if (!nudgeId || prefersReducedMotion()) return;
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
    if (dieInput === "" || !Number.isInteger(roll) || roll < 1 || roll > 20) return;
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
        <form className="table-page__init-prompt-option" onSubmit={useMyRoll}>
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
              onChange={(event) => setDieInput(event.target.value)}
            />
            <Button type="submit" variant="secondary" disabled={dieInput === ""}>
              Use my roll
            </Button>
          </div>
          <span className="table-page__init-prompt-note">We add your {bonus} for you.</span>
        </form>
      </div>
    </section>
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
  onResolve,
  pendingCalls = [],
  combatActive = false,
  targets = [],
  recentEvents = [],
  tableId,
  onChanged,
  onEdit,
  onRemove,
  onNudge = null,
  nudged = false,
  nudgeCooling = false,
}) {
  const [amount, setAmount] = useState("");
  const [initiativeInput, setInitiativeInput] = useState("");
  const [rollNote, setRollNote] = useState("");
  const initiativeBonus = Number(readStatBlock(hp?.stat_block).initiativeBonus) || 0;
  const [showAttack, setShowAttack] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

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

  function submitDamage(sign) {
    const value = Math.abs(Number(amount));
    if (!value) return;
    onDamage(combatant, sign * value);
    setAmount("");
  }

  return (
    <li
      className={`table-page__row${isCurrent ? " table-page__row--current" : ""}${
        combatant.status === "down" ? " table-page__row--down" : ""
      }${pendingCalls.length > 0 ? " table-page__row--awaiting" : ""}${
        combatant.initiative === null || combatant.initiative === undefined
          ? " table-page__row--needs-initiative"
          : ""
      }`}
    >
      <div className="table-page__row-main">
        <span className="table-page__initiative">
          {combatant.initiative ?? "—"}
        </span>
        <div className="table-page__row-info">
          <span className="table-page__row-name">
            {combatant.name}
            {isMe && <span className="table-page__tag">You</span>}
            {isMonster && <span className="table-page__tag table-page__tag--monster">Enemy</span>}
            {combatant.kind === "ally" && <span className="table-page__tag">Ally</span>}
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

          {isNpc && isDm && hp && (
            <span className="table-page__secret-hp">
              DM only: {hp.current_hp}/{hp.max_hp} HP
              {hp.armor_class ? ` · AC ${hp.armor_class}` : " · no AC set"}
            </span>
          )}

          {isNpc &&
            recentEvents.map((entry) => (
              <span className="table-page__last-action" key={entry.id}>
                {entry.message}
              </span>
            ))}
        </div>
      </div>

      <div className="table-page__row-actions">
        {onNudge && (
          <Button
            type="button"
            variant="secondary"
            disabled={nudgeCooling}
            onClick={() => onNudge(combatant)}
          >
            {nudgeCooling ? "Nudged ✓" : nudged ? "🔔 Nudge again" : "🔔 Nudge"}
          </Button>
        )}
        {canEditInitiative && (
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

        {(isMe || (isDm && isNpc)) && rollNote && (
          <span className="table-page__roll-note">{rollNote}</span>
        )}

        {isDm && isNpc && (
          <div className="table-page__inline-form">
            <input
              className="table-page__number"
              type="number"
              min="0"
              aria-label={`Damage or healing for ${combatant.name}`}
              placeholder="Amt"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <Button type="button" variant="danger" onClick={() => submitDamage(1)}>
              Damage
            </Button>
            <Button type="button" variant="secondary" onClick={() => submitDamage(-1)}>
              Heal
            </Button>
          </div>
        )}

        {canAttack && (
          <Button
            type="button"
            variant="secondary"
            aria-expanded={showAttack}
            onClick={() => setShowAttack((open) => !open)}
          >
            Attack
          </Button>
        )}

        {isDm && isNpc && (
          <Button
            type="button"
            variant="secondary"
            aria-expanded={showEdit}
            onClick={() => setShowEdit((open) => !open)}
          >
            Edit
          </Button>
        )}

        {isDm && !isNpc && combatant.attacks_this_turn > 0 && combatant.last_attack_target && (
          <Button type="button" variant="secondary" onClick={() => onDeny(combatant)}>
            Deny last attack
          </Button>
        )}

        {isDm && (
          <Button type="button" variant="secondary" onClick={() => onRemove(combatant)}>
            Remove
          </Button>
        )}
      </div>

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

      {isDm && pendingCalls.length > 0 && (
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

function TablePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { table, members, combatants, enemyHp, events, isLoading, error, refresh, isDm } =
    useTable(id);

  const [actionError, setActionError] = useState("");
  const [characters, setCharacters] = useState([]);
  const [myDexterity, setMyDexterity] = useState(10);

  const [templates, setTemplates] = useState([]);
  const [showMonsterForm, setShowMonsterForm] = useState(false);
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

  // DM: the saved monster library, for the "From my library" picker.
  useEffect(() => {
    if (!isDm) return;

    listTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, [isDm]);

  // Player: read their own Dexterity so "Roll d20" adds the right modifier.
  const myCharacterId = members.find((member) => member.user_id === user?.id)?.character_id;

  useEffect(() => {
    if (!myCharacterId) return;

    getCharacter(myCharacterId)
      .then((sheet) => setMyDexterity(sheet?.abilityScores?.dexterity ?? 10))
      .catch(() => {});
  }, [myCharacterId]);

  async function run(action) {
    setActionError("");
    try {
      await action();
      await refresh();
    } catch (runError) {
      setActionError(runError.message ?? "Something went wrong.");
    }
  }

  if (isLoading) {
    return (
      <main className="table-page">
        <p className="table-page__empty">Loading table...</p>
      </main>
    );
  }

  if (!table) {
    return (
      <main className="table-page">
        <div className="table-page__content">
          <p className="table-page__empty">
            {error || "This table was not found, or you are not part of it."}
          </p>
          <Link to="/tables">Back to tables</Link>
        </div>
      </main>
    );
  }

  const ordered = sortCombatants(combatants);
  const waiting = combatants.filter(
    (combatant) => combatant.initiative === null || combatant.initiative === undefined,
  );
  const { now, upcoming } = getNowAndNext(combatants, table.current_combatant_id);
  const canStart = ordered.length > 0;
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
  const waitingPlayers = waiting.filter((combatant) => combatant.kind === "player");
  const prepSteps = getDmPrepSteps({ combatants, combatActive: table.combat_active });
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
  // Once a fight starts, the monster form folds away to save room. The DM can
  // still open it from the Combat header whenever they need another monster.
  const monsterFormOpen = !table.combat_active || showMonsterForm;
  const selectedSheet =
    characters.find((sheet) => sheet.id === selectedPlayerId) ?? characters[0];

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

  function renderRow(combatant) {
    const isMe = combatant.kind === "player" && combatant.user_id === user?.id;

    return (
      <CombatantRow
        key={combatant.id}
        combatant={combatant}
        isCurrent={table.combat_active && combatant.id === table.current_combatant_id}
        isDm={isDm}
        isMe={isMe}
        hp={enemyHp[combatant.id]}
        myDexterity={myDexterity}
        onSetInitiative={(target, value) =>
          run(() =>
            isMe ? setMyInitiative(table.id, value) : setCombatantInitiative(target.id, value),
          )
        }
        onDamage={(target, amount) => run(() => applyDamage(target.id, amount))}
        onDeny={denyAttack}
        pendingCalls={awaitingCall.filter((player) => player.attack_target === combatant.id)}
        combatActive={table.combat_active}
        targets={combatants.filter((other) => other.id !== combatant.id)}
        recentEvents={recentEventsFor(events, combatant.name)}
        tableId={table.id}
        onChanged={refresh}
        onEdit={async (changes) => {
          await editCombatant(changes);
          await refresh();
        }}
        onResolve={(attacker, hit) => run(() => dmResolveAttack(attacker.id, hit))}
        onNudge={
          isDm && combatant.kind === "player" && combatant.initiative == null ? nudge : null
        }
        nudged={combatant.kind === "player" && hasActiveNudge(events, combatant.name)}
        nudgeCooling={nudgeCooling}
        onRemove={(target) => {
          if (target.kind === "player") {
            if (window.confirm(`Remove ${target.name} from the table?`)) {
              run(() => removeMember(table.id, target.user_id));
            }
          } else {
            run(() => removeCombatant(target.id));
          }
        }}
      />
    );
  }

  return (
    <main className="table-page">
      <div className="table-page__content">
        <Link className="table-page__back" to="/tables">
          ← All tables
        </Link>

        <header className="table-page__header">
          <div>
            <h1 className="table-page__title">{table.name}</h1>
            <p className="table-page__role">
              {isDm ? "You are the DM" : "You are a player"} ·{" "}
              <Link className="table-page__guide-link" to="/guide?section=tables">
                How tables work
              </Link>
            </p>
          </div>

          {isDm && (
            <div className="table-page__code">
              <span className="table-page__code-label">Join code</span>
              <span className="table-page__code-value">{table.join_code}</span>
            </div>
          )}

          {!isDm && myMember?.character_id && (
            <Link
              className="qk-button qk-button--primary table-page__sheet-link"
              to={`/characters/${myMember.character_id}`}
            >
              Open my character sheet
            </Link>
          )}
        </header>

        {(error || actionError) && (
          <p className="table-page__error" role="alert">
            {actionError || error}
          </p>
        )}

        {isDm && !table.combat_active && (
          <section className="table-page__prep" aria-labelledby="prep-title">
            <h2 id="prep-title" className="table-page__prep-title">
              Before the fight
            </h2>
            <ol className="table-page__prep-steps">
              {prepSteps.map((step) => (
                <li
                  key={step.id}
                  className={`table-page__prep-step${step.done ? " table-page__prep-step--done" : ""}${
                    step.current ? " table-page__prep-step--current" : ""
                  }`}
                >
                  <span className="table-page__prep-mark" aria-hidden="true">
                    {step.done ? "✓" : ""}
                  </span>
                  <span>
                    <strong>{step.label}</strong>
                    <span className="table-page__visually-hidden">{step.done ? " (done)" : " (to do)"}</span>
                    <span className="table-page__prep-detail">{step.detail}</span>
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
          </section>
        )}

        <section className="table-page__combat">
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

            {isDm && (
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
                {!table.combat_active ? (
                  <Button
                    disabled={!canStart}
                    onClick={() => run(() => startCombat(table.id, combatants))}
                  >
                    Start combat
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => run(() => advanceTurn(table, combatants))}>
                      Next turn
                    </Button>
                    <Button variant="secondary" onClick={() => run(() => endCombat(table.id))}>
                      End combat
                    </Button>
                  </>
                )}
                {unrolledNpcCount > 0 && (
                  <Button variant="secondary" onClick={rollForAllNpcs}>
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
              </div>
            )}
          </div>

          {isDm && !canStart && (
            <p className="table-page__hint">
              Set at least one initiative (yours, a player's, or a monster's) to start combat.
            </p>
          )}

          {isDm && unrolledNpcCount > 0 && (
            <p className="table-page__hint">
              Rolling for a boss yourself? Set its initiative first, then use the roll button
              for the rest. Anyone who already has an initiative is left alone.
            </p>
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

          {!isDm && playerTip && <p className="table-page__hint">{playerTip}</p>}

          {/* Listed first: these are who the table is waiting on. */}
          {waiting.length > 0 && (
            <>
              <h3 className="table-page__subtitle table-page__subtitle--order">
                Waiting for initiative ({waiting.length})
              </h3>
              <ul className="table-page__order" aria-label="Waiting for initiative">
                {waiting.map(renderRow)}
              </ul>
            </>
          )}

          {ordered.length > 0 && (
            <h3 className="table-page__subtitle table-page__subtitle--order">
              Initiative order
            </h3>
          )}
          <ol className="table-page__order" aria-label="Initiative order">
            {ordered.map(renderRow)}
          </ol>

          {combatants.length === 0 && (
            <p className="table-page__empty">
              Nobody is here yet.{isDm ? " Share the join code with your players." : ""}
            </p>
          )}
        </section>

        {isDm && monsterFormOpen && (
          <section className="table-page__section">
            <h2 className="table-page__section-title">Add monsters and NPCs</h2>
            <p className="table-page__hint">
              Players see a name, a status like Bloodied, and damage taken. They never see
              HP, AC, or a stat block. Add several at once, or pick from your library.
              Friendly NPCs and party members you track by hand are added the same way.
            </p>
            <AddCombatantForm onAdd={handleAddCombatants} templates={templates} />
          </section>
        )}

        {isDm && orphanCalls.length > 0 && (
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
        )}

        {isDm && players.length > 0 && (
          <section className="table-page__section">
            <h2 className="table-page__section-title">An enemy hits a player</h2>
            <p className="table-page__hint">
              The player gets an Apply button on their own sheet. You never edit their
              character.
            </p>
            <form className="table-page__monster-form" onSubmit={handleHitPlayer}>
              <input
                className="table-page__input"
                aria-label="Who is attacking"
                list="enemy-names"
                placeholder="Who is attacking (e.g. Kobold)"
                maxLength={80}
                value={hitSource}
                onChange={(event) => setHitSource(event.target.value)}
              />
              <datalist id="enemy-names">
                {npcs.map((npc) => (
                  <option key={npc.id} value={npc.name} />
                ))}
              </datalist>
              <select
                className="table-page__input"
                aria-label="Which player is hit"
                value={hitTargetUserId || players[0].user_id}
                onChange={(event) => setHitTargetUserId(event.target.value)}
              >
                {players.map((player) => (
                  <option key={player.id} value={player.user_id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <input
                className="table-page__number"
                type="number"
                min="1"
                aria-label="Damage to the player"
                placeholder="Dmg"
                value={hitAmount}
                onChange={(event) => setHitAmount(event.target.value)}
              />
              <Button type="submit" variant="danger" disabled={!hitAmount}>
                Send hit
              </Button>
            </form>
          </section>
        )}

        {isDm && (
          <section className="table-page__section">
            <h2 className="table-page__section-title">Your players</h2>
            {characters.length === 0 ? (
              <p className="table-page__empty">
                Characters appear here when players join. You can read everything but
                cannot edit any sheet.
              </p>
            ) : (
              <>
                <div className="table-page__tabs" role="tablist" aria-label="Players">
                  {characters.map((sheet) => (
                    <button
                      key={sheet.id}
                      type="button"
                      role="tab"
                      aria-selected={selectedSheet?.id === sheet.id}
                      className={`table-page__tab${
                        selectedSheet?.id === sheet.id ? " table-page__tab--active" : ""
                      }`}
                      onClick={() => setSelectedPlayerId(sheet.id)}
                    >
                      {sheet.name}
                    </button>
                  ))}
                  {characters.length > 1 && (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={selectedPlayerId === "all"}
                      className={`table-page__tab${
                        selectedPlayerId === "all" ? " table-page__tab--active" : ""
                      }`}
                      onClick={() => setSelectedPlayerId("all")}
                    >
                      Show all
                    </button>
                  )}
                </div>

                <div className="table-page__characters">
                  {(selectedPlayerId === "all" ? characters : [selectedSheet]).map(
                    (sheet) => (
                      <CharacterSummaryCard key={sheet.id} sheet={sheet} />
                    ),
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {!isDm && myMember && table.combat_active && (
          <p className="table-page__hint">
            Attacks and damage happen on your character sheet. Use the button at the
            top to open it.
          </p>
        )}

        <section className="table-page__section">
          <h2 className="table-page__section-title">Activity</h2>
          {events.length === 0 ? (
            <p className="table-page__empty">Nothing has happened yet.</p>
          ) : (
            <>
              <ul
                className={`table-page__log${showAllEvents ? " table-page__log--expanded" : ""}`}
              >
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

        <footer className="table-page__footer">
          {isDm ? (
            <Button
              variant="danger"
              onClick={async () => {
                if (window.confirm(`Delete "${table.name}" for everyone? This cannot be undone.`)) {
                  await run(() => deleteTable(table.id));
                  navigate("/tables");
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
                  navigate("/tables");
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
