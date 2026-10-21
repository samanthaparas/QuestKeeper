import { useId, useState } from "react";
import { getMonsterDetails, getMonsters } from "../../utils/api";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  combatantFromMonster,
  formatChallenge,
  rateEncounter,
  suggestEncounter,
} from "../../utils/encounters";
import "./EncounterHelper.css";

// The DM's encounter helper, on the Prep tab: pick how hard a fight should
// be and get an idea for it (or search the SRD monsters and build your own),
// see how hard the mix is for this party, then add it to the fight in one
// tap. It's only a guide: the DM can change anything, and nothing here is
// shown to players.
//
// levels: the party's character levels (from the table's players).
// onAdd(entry): adds monsters to the fight (the page's own add), where
// entry = { name, count, maxHp, kind, armorClass, statBlock }. It resolves
// true when it worked.
function EncounterHelper({ levels = [], onAdd }) {
  const searchId = useId();
  const [monsters, setMonsters] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [theme, setTheme] = useState("");
  // [{ monster, count }]: the current mix, whether suggested or hand-picked.
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [custom, setCustom] = useState(levels.length === 0 ? { size: 4, level: 3 } : null);
  const [message, setMessage] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const partyLevels = custom ? Array.from({ length: Math.max(1, custom.size) }, () => custom.level) : levels;
  const rating = rateEncounter(entries, partyLevels);

  // The monster list loads the first time the helper is opened.
  function handleToggle(event) {
    if (!event.currentTarget.open || monsters || loadError) return;
    getMonsters()
      .then(setMonsters)
      .catch(() => setLoadError("Couldn't load the monster list. Check your connection and reopen this."));
  }

  const types = monsters
    ? [...new Set(monsters.map((monster) => String(monster.type).split(" ")[0]))].sort()
    : [];

  function suggest() {
    setMessage("");
    const idea = suggestEncounter({ levels: partyLevels, difficulty, monsters: monsters ?? [], theme });
    if (!idea) {
      setMessage("Nothing fits that combination. Try another difficulty or theme.");
      return;
    }
    setEntries(idea);
  }

  function addPick(monster) {
    setMessage("");
    setEntries((current) =>
      current.some((entry) => entry.monster.index === monster.index)
        ? current.map((entry) => (entry.monster.index === monster.index ? { ...entry, count: entry.count + 1 } : entry))
        : [...current, { monster, count: 1 }],
    );
    setSearch("");
  }

  function changeCount(index, delta) {
    setEntries((current) =>
      current
        .map((entry) => (entry.monster.index === index ? { ...entry, count: entry.count + delta } : entry))
        .filter((entry) => entry.count > 0),
    );
  }

  const matches =
    search.trim().length >= 2 && monsters
      ? monsters.filter((monster) => monster.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8)
      : [];

  async function addToFight() {
    setIsAdding(true);
    setMessage("");
    try {
      for (const { monster, count } of entries) {
        const detail = await getMonsterDetails(monster.index);
        const ok = await onAdd({ ...combatantFromMonster(detail), count, kind: "monster", initiative: null });
        if (!ok) throw new Error("add failed");
      }
      setMessage(
        `Added ${entries.map((entry) => `${entry.count} ${entry.monster.name}`).join(", ")}. Roll their initiative from the list below.`,
      );
      setEntries([]);
    } catch {
      setMessage("Couldn't add all of them. Check the list below and try again.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <details className="encounter-helper" onToggle={handleToggle}>
      <summary className="encounter-helper__summary">Encounter helper</summary>
      <div className="encounter-helper__body">
        <p className="encounter-helper__hint">
          Ideas for a fight that suits your party. It&apos;s a guide, not a rule: change anything, and players never
          see this.
        </p>

        {loadError && (
          <p className="encounter-helper__error" role="alert">
            {loadError}
          </p>
        )}

        {/* Who it's for. */}
        <div className="encounter-helper__party">
          {custom ? (
            <>
              <label>
                Players{" "}
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="encounter-helper__number"
                  value={custom.size}
                  onChange={(event) => setCustom({ ...custom, size: Number(event.target.value) || 1 })}
                />
              </label>
              <label>
                Level{" "}
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="encounter-helper__number"
                  value={custom.level}
                  onChange={(event) => setCustom({ ...custom, level: Number(event.target.value) || 1 })}
                />
              </label>
              {levels.length > 0 && (
                <button type="button" className="encounter-helper__link" onClick={() => setCustom(null)}>
                  Use my table&apos;s players
                </button>
              )}
            </>
          ) : (
            <>
              <span>
                Party: {levels.length} {levels.length === 1 ? "player" : "players"} (levels {levels.join(", ")})
              </span>
              <button
                type="button"
                className="encounter-helper__link"
                onClick={() => setCustom({ size: levels.length, level: Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) })}
              >
                Different party?
              </button>
            </>
          )}
        </div>

        <div className="encounter-helper__controls">
          <div className="encounter-helper__difficulty" role="radiogroup" aria-label="How hard">
            {DIFFICULTIES.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={difficulty === name}
                className="encounter-helper__pill"
                onClick={() => setDifficulty(name)}
              >
                {DIFFICULTY_LABELS[name]}
              </button>
            ))}
          </div>
          <label className="encounter-helper__theme">
            Theme{" "}
            <select value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="">Anything</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="encounter-helper__button" onClick={suggest} disabled={!monsters}>
            {entries.length > 0 ? "Another idea" : "Suggest an encounter"}
          </button>
        </div>

        {/* The mix: suggested or picked by hand, always editable. */}
        {entries.length > 0 ? (
          <ul className="encounter-helper__list" aria-label="This encounter">
            {entries.map(({ monster, count }) => (
              <li key={monster.index}>
                <span className="encounter-helper__count">
                  <button type="button" aria-label={`One fewer ${monster.name}`} onClick={() => changeCount(monster.index, -1)}>
                    −
                  </button>
                  <b>{count}</b>
                  <button type="button" aria-label={`One more ${monster.name}`} onClick={() => changeCount(monster.index, 1)}>
                    +
                  </button>
                </span>
                <span>
                  {monster.name} <span className="encounter-helper__meta">CR {formatChallenge(monster.challengeRating)} · {monster.xp} XP each</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="encounter-helper__empty">No monsters picked yet. Suggest an encounter, or search below.</p>
        )}

        {entries.length > 0 && (
          <p className={`encounter-helper__rating encounter-helper__rating--${rating.difficulty}`} role="status">
            <b>{DIFFICULTY_LABELS[rating.difficulty]}</b> for this party · {rating.adjustedXp} XP (Easy {rating.thresholds.easy}
            , Medium {rating.thresholds.medium}, Hard {rating.thresholds.hard}, Deadly {rating.thresholds.deadly})
          </p>
        )}

        <div className="encounter-helper__search">
          <label htmlFor={searchId}>Add a monster</label>
          <input
            id={searchId}
            type="search"
            className="encounter-helper__input"
            placeholder="Search the SRD monsters"
            value={search}
            disabled={!monsters}
            onChange={(event) => setSearch(event.target.value)}
          />
          {matches.length > 0 && (
            <ul className="encounter-helper__matches" aria-label="Matching monsters">
              {matches.map((monster) => (
                <li key={monster.index}>
                  <button type="button" onClick={() => addPick(monster)}>
                    {monster.name} <span className="encounter-helper__meta">CR {formatChallenge(monster.challengeRating)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="encounter-helper__actions">
          <button
            type="button"
            className="encounter-helper__button encounter-helper__button--primary"
            onClick={addToFight}
            disabled={entries.length === 0 || isAdding}
          >
            {isAdding ? "Adding..." : "Add this encounter"}
          </button>
          {entries.length > 0 && (
            <button type="button" className="encounter-helper__link" onClick={() => setEntries([])}>
              Clear
            </button>
          )}
          <span className="encounter-helper__message" role="status">
            {message}
          </span>
        </div>
      </div>
    </details>
  );
}

export default EncounterHelper;
