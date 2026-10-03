import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { useTable } from "../../hooks/useTable";
import { getCharacter, getCharactersByIds } from "../../utils/characterStore";
import {
  STATUS_LABELS,
  getNowAndNext,
  rollInitiative,
  sortCombatants,
} from "../../utils/initiative";
import {
  addMonster,
  advanceTurn,
  applyDamage,
  deleteTable,
  dmDenyAttack,
  dmResolveAttack,
  endCombat,
  leaveTable,
  postPlayerDamage,
  removeCombatant,
  removeMember,
  resetEncounter,
  setCombatantInitiative,
  setMyInitiative,
  startCombat,
} from "../../utils/tableStore";
import Button from "../../components/Button/Button";
import CharacterSummaryCard from "../../components/CharacterSummaryCard/CharacterSummaryCard";
import MonsterAttackPanel from "../../components/MonsterAttackPanel/MonsterAttackPanel";
import "./TablePage.css";

const CHARACTER_POLL_MS = 10000;

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
  players = [],
  tableId,
  onChanged,
  onRemove,
}) {
  const [amount, setAmount] = useState("");
  const [initiativeInput, setInitiativeInput] = useState("");
  const [rollNote, setRollNote] = useState("");
  const [showAttack, setShowAttack] = useState(false);

  const isMonster = combatant.kind === "monster";
  // Initiative is locked once combat starts. The one exception is someone who
  // joined mid-fight and has none yet, otherwise they would never get a turn.
  const canEditInitiative =
    (isDm || isMe) && (!combatActive || combatant.initiative === null);
  const canAttack =
    isDm && isMonster && combatActive && combatant.status !== "down" && players.length > 0;

  function submitInitiative(event) {
    event.preventDefault();
    const value = Number(initiativeInput);
    if (initiativeInput === "" || Number.isNaN(value)) return;
    onSetInitiative(combatant, value);
    setInitiativeInput("");
  }

  function rollForMe() {
    const { roll, modifier, total } = rollInitiative(myDexterity);
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
      }${pendingCalls.length > 0 ? " table-page__row--awaiting" : ""}`}
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
          </span>

          {combatant.attacks_this_turn > 0 && (
            <span className="table-page__attack-count">
              {combatant.attacks_this_turn}{" "}
              {combatant.attacks_this_turn === 1 ? "attack" : "attacks"} this turn
            </span>
          )}

          {isMonster && (
            <span className={`table-page__status table-page__status--${combatant.status}`}>
              {STATUS_LABELS[combatant.status]}
              {combatant.damage_taken > 0 && ` · ${combatant.damage_taken} damage taken`}
            </span>
          )}

          {isMonster && isDm && hp && (
            <span className="table-page__secret-hp">
              DM only: {hp.current_hp}/{hp.max_hp} HP
              {hp.armor_class ? ` · AC ${hp.armor_class}` : " · no AC set"}
            </span>
          )}
        </div>
      </div>

      <div className="table-page__row-actions">
        {canEditInitiative && (
          <form className="table-page__inline-form" onSubmit={submitInitiative}>
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
            {isMe && (
              <Button type="button" onClick={rollForMe}>
                Roll d20
              </Button>
            )}
          </form>
        )}

        {isMe && rollNote && <span className="table-page__roll-note">{rollNote}</span>}

        {isDm && isMonster && (
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

        {isDm && !isMonster && combatant.attacks_this_turn > 0 && combatant.last_attack_target && (
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
          players={players}
          tableId={tableId}
          onChanged={onChanged}
          onClose={() => setShowAttack(false)}
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

  const [monsterName, setMonsterName] = useState("");
  const [monsterHp, setMonsterHp] = useState("");
  const [monsterInitiative, setMonsterInitiative] = useState("");
  const [monsterAc, setMonsterAc] = useState("");
  const [showMonsterForm, setShowMonsterForm] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [showAllEvents, setShowAllEvents] = useState(false);

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
  const { now, next } = getNowAndNext(combatants, table.current_combatant_id);
  const canStart = ordered.length > 0;
  const myMember = members.find((member) => member.user_id === user?.id);
  const players = combatants.filter((combatant) => combatant.kind === "player");
  const monsters = combatants.filter((combatant) => combatant.kind === "monster");
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

  async function handleAddMonster(event) {
    event.preventDefault();
    const hp = Number(monsterHp);
    if (!monsterName.trim() || !hp || hp < 1) return;

    const initiative = monsterInitiative === "" ? null : Number(monsterInitiative);
    const armorClass = monsterAc === "" ? null : Number(monsterAc);
    await run(() =>
      addMonster(table.id, monsterName.trim(), hp, initiative, armorClass),
    );
    setMonsterName("");
    setMonsterHp("");
    setMonsterInitiative("");
    setMonsterAc("");
    setShowMonsterForm(false);
  }

  async function handleHitPlayer(event) {
    event.preventDefault();
    const amount = Number(hitAmount);
    const userId = hitTargetUserId || players[0]?.user_id;
    if (!userId || !Number.isInteger(amount) || amount < 1) return;

    await run(() => postPlayerDamage(table.id, userId, amount, hitSource.trim()));
    setHitAmount("");
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
        players={players}
        tableId={table.id}
        onChanged={refresh}
        onResolve={(attacker, hit) => run(() => dmResolveAttack(attacker.id, hit))}
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
            <p className="table-page__role">{isDm ? "You are the DM" : "You are a player"}</p>
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
                {next && <> · Next: {next.name}</>}
              </p>
            ) : (
              <p className="table-page__turn-line">No fight in progress.</p>
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
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Clear all monsters and everyone's initiative for a new encounter?",
                      )
                    ) {
                      run(() => resetEncounter(table.id));
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

          {!isDm && myMember && waiting.some((c) => c.user_id === user?.id) && (
            <p className="table-page__hint">
              Set your initiative below: roll a d20 here, or enter a roll from your own dice.
            </p>
          )}

          {ordered.length > 0 && (
            <h3 className="table-page__subtitle table-page__subtitle--order">
              Initiative order
            </h3>
          )}
          <ol className="table-page__order" aria-label="Initiative order">
            {ordered.map(renderRow)}
          </ol>

          {waiting.length > 0 && (
            <>
              <h3 className="table-page__subtitle">Waiting for initiative</h3>
              <ul className="table-page__order">{waiting.map(renderRow)}</ul>
            </>
          )}

          {combatants.length === 0 && (
            <p className="table-page__empty">
              Nobody is here yet.{isDm ? " Share the join code with your players." : ""}
            </p>
          )}
        </section>

        {isDm && monsterFormOpen && (
          <section className="table-page__section">
            <h2 className="table-page__section-title">Add a monster</h2>
            <p className="table-page__hint">
              Players see the name, a status like Bloodied, and damage taken. They never
              see its HP or AC. Without an AC, you call hits yourself.
            </p>
            <form className="table-page__monster-form" onSubmit={handleAddMonster}>
              <input
                className="table-page__input"
                aria-label="Monster name"
                placeholder="Name (e.g. Kobold)"
                maxLength={80}
                value={monsterName}
                onChange={(event) => setMonsterName(event.target.value)}
              />
              <input
                className="table-page__number"
                type="number"
                min="1"
                aria-label="Monster HP"
                placeholder="HP"
                value={monsterHp}
                onChange={(event) => setMonsterHp(event.target.value)}
              />
              <input
                className="table-page__number"
                type="number"
                min="1"
                aria-label="Monster AC"
                placeholder="AC"
                value={monsterAc}
                onChange={(event) => setMonsterAc(event.target.value)}
              />
              <input
                className="table-page__number"
                type="number"
                aria-label="Monster initiative"
                placeholder="Init"
                value={monsterInitiative}
                onChange={(event) => setMonsterInitiative(event.target.value)}
              />
              <Button type="submit" disabled={!monsterName.trim() || !monsterHp}>
                Add monster
              </Button>
            </form>
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
                {monsters.map((monster) => (
                  <option key={monster.id} value={monster.name} />
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
