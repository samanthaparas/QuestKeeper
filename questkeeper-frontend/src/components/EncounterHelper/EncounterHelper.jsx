import { useEffect, useId, useState } from "react";
import { getMonsterDetails, getMonsters } from "../../utils/api";
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  combatantFromMonster,
  formatChallenge,
  rateEncounter,
  suggestEncounter,
} from "../../utils/encounters";
import { getCreaturePortrait } from "../../utils/icons";
import "./EncounterHelper.css";

// The DM's encounter helper, open on the Prep tab: pick how hard a fight should
// be and get an idea for it (or search the SRD monsters and build your own),
// see how hard the mix is for this party, then add it to the fight in one
// tap. It's only a guide: the DM can change anything, and nothing here is
// shown to players.
//
// levels: the party's character levels (from the table's players).
// onAdd(entry): adds monsters to the fight (the page's own add), where
// entry = { name, count, maxHp, kind, armorClass, statBlock }. It resolves
// true when it worked.
// A creature's picture (the few the app has) or a neutral badge with its first letter.
function MonsterPortrait({ monster }) {
  const portrait = getCreaturePortrait(monster.index);
  return (
    <span className="encounter-helper__portrait" aria-hidden="true">
      {portrait ? <img src={portrait} alt="" /> : <span>{String(monster.name ?? "?").charAt(0)}</span>}
    </span>
  );
}

function MonsterTags({ monster }) {
  const tags = [String(monster.type ?? "").split(" ")[0], monster.size].filter(Boolean);
  return (
    <span className="encounter-helper__tags">
      {tags.map((tag) => (
        <span key={tag} className="encounter-helper__tag">
          {tag.charAt(0).toUpperCase() + tag.slice(1)}
        </span>
      ))}
    </span>
  );
}

function EncounterHelper({ levels = [], onAdd }) {
  const searchId = useId();
  const titleId = useId();
  const difficultyId = useId();
  const themeId = useId();
  const [monsters, setMonsters] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [theme, setTheme] = useState("");
  // [{ monster, count }]: the current mix, whether suggested or hand-picked.
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  // The DM's own "different party" numbers; until they ask for it, the table's players are used
  // (or a starting guess while nobody has joined or their sheets are still loading).
  const [picked, setCustom] = useState(null);
  const custom = picked ?? (levels.length === 0 ? { size: 4, level: 3 } : null);
  const [message, setMessage] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const partyLevels = custom ? Array.from({ length: Math.max(1, custom.size) }, () => custom.level) : levels;
  const rating = rateEncounter(entries, partyLevels);

  // The monster list loads when the helper is shown (it sits open on the Prep tab).
  useEffect(() => {
    let live = true;
    getMonsters()
      .then((list) => live && setMonsters(list))
      .catch(() => live && setLoadError("Couldn't load the monster list. Check your connection and reload this page."));
    return () => {
      live = false;
    };
  }, []);

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
        `Added ${entries.map((entry) => `${entry.count} ${entry.monster.name}`).join(", ")}. Set or roll their initiative under Initiative setup.`,
      );
      setEntries([]);
    } catch {
      setMessage("Couldn't add all of them. Check the list below and try again.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <section className="encounter-helper table-page__section--panel" aria-labelledby={titleId}>
      <header className="encounter-helper__head">
        <div>
          <h2 id={titleId} className="encounter-helper__title">
            Encounter helper
          </h2>
          <p className="encounter-helper__hint">
            Build an encounter for your party. Difficulty is a guideline.
          </p>
          <details className="encounter-helper__more">
            <summary>How encounter suggestions work</summary>
            <p>
              It&apos;s a guide, not a rule: change anything, and players never see this. Suggest an encounter
              picks a mix of SRD monsters that fits your party and the difficulty. Search to add your own picks,
              change how many of each, then add the encounter to the fight.
            </p>
          </details>
        </div>
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
      </header>

      <div className="encounter-helper__body">
        {loadError && (
          <p className="encounter-helper__error" role="alert">
            {loadError}
          </p>
        )}

        <div className="encounter-helper__controls">
          <label className="encounter-helper__field" htmlFor={difficultyId}>
            <span>
              Difficulty <span className="encounter-helper__optional">(guideline)</span>
            </span>
            <select id={difficultyId} value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              {DIFFICULTIES.map((name) => (
                <option key={name} value={name}>
                  {DIFFICULTY_LABELS[name]}
                </option>
              ))}
            </select>
          </label>
          <label className="encounter-helper__field" htmlFor={themeId}>
            <span>
              Theme <span className="encounter-helper__optional">(optional)</span>
            </span>
            <select id={themeId} value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="">Anything</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <div className="encounter-helper__field encounter-helper__field--search">
            <label htmlFor={searchId}>Search SRD monsters</label>
            <input
              id={searchId}
              type="search"
              className="encounter-helper__input"
              placeholder="Search monsters (e.g. goblin, kobold, wolf)"
              value={search}
              disabled={!monsters}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button type="button" className="encounter-helper__button" onClick={suggest} disabled={!monsters}>
            {entries.length > 0 ? "Another idea" : "Suggest an encounter"}
          </button>
        </div>

        {/* Matches for what was typed: tap Add to put one in the mix below. */}
        {matches.length > 0 && (
          <ul className="encounter-helper__cards" aria-label="Matching monsters">
            {matches.map((monster) => (
              <li key={monster.index} className="encounter-helper__card">
                <MonsterPortrait monster={monster} />
                <span className="encounter-helper__card-text">
                  <b className="encounter-helper__card-name">{monster.name}</b>
                  <span className="encounter-helper__meta">
                    CR {formatChallenge(monster.challengeRating)} · {monster.xp} XP
                  </span>
                  <MonsterTags monster={monster} />
                </span>
                <button
                  type="button"
                  className="encounter-helper__add"
                  aria-label={`Add ${monster.name}`}
                  onClick={() => addPick(monster)}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* The mix: suggested or picked by hand, always editable. */}
        {entries.length > 0 ? (
          <ul className="encounter-helper__cards encounter-helper__cards--mix" aria-label="This encounter">
            {entries.map(({ monster, count }) => (
              <li key={monster.index} className="encounter-helper__card">
                <MonsterPortrait monster={monster} />
                <span className="encounter-helper__card-text">
                  <b className="encounter-helper__card-name">{monster.name}</b>
                  <span className="encounter-helper__meta">
                    CR {formatChallenge(monster.challengeRating)} · {monster.xp} XP each
                  </span>
                  <MonsterTags monster={monster} />
                </span>
                <span className="encounter-helper__count">
                  <button type="button" aria-label={`One fewer ${monster.name}`} onClick={() => changeCount(monster.index, -1)}>
                    −
                  </button>
                  <b>{count}</b>
                  <button type="button" aria-label={`One more ${monster.name}`} onClick={() => changeCount(monster.index, 1)}>
                    +
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          matches.length === 0 && <p className="encounter-helper__empty">No monsters picked yet. Suggest an encounter, or search above.</p>
        )}

        {entries.length > 0 && (
          <p className={`encounter-helper__rating encounter-helper__rating--${rating.difficulty}`} role="status">
            <b>{DIFFICULTY_LABELS[rating.difficulty]}</b> for this party · {rating.adjustedXp} XP (Easy {rating.thresholds.easy}
            , Medium {rating.thresholds.medium}, Hard {rating.thresholds.hard}, Deadly {rating.thresholds.deadly})
          </p>
        )}

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
    </section>
  );
}

export default EncounterHelper;
