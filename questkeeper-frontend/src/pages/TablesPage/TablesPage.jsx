import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { listCharacters } from "../../utils/characterStore";
import { createTable, joinTable, listMyTables } from "../../utils/tableStore";
import Button from "../../components/Button/Button";
import StatusNote from "../../components/StatusNote/StatusNote";
import { useFocusAfterRetry } from "../../components/StatusNote/useFocusAfterRetry";
import PageBanner from "../../components/PageBanner/PageBanner";
import { getCampaignArtForList } from "../../utils/redesignArt";
import "./TablesPage.css";

// One page, two sides. mode="player" is My Games (/games): join a table and
// open the games you play in. mode="dm" is the DM Screen list (/dm): start a
// table and open the ones you run.
function TablesPage({ mode = "player" }) {
  const isDmSide = mode === "dm";
  const { user } = useAuth();
  const navigate = useNavigate();
  // The character sheet's "Join a table" link picks the character for you.
  const [searchParams] = useSearchParams();

  const [tables, setTables] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // The tables couldn't load: said in friendly words, with a retry (never the raw system message).
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [hasRetried, setHasRetried] = useState(false);
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");

  const [newTableName, setNewTableName] = useState("");
  const [joinCode, setJoinCode] = useState(() => (searchParams.get("code") ?? "").toUpperCase());
  const [joinCharacterId, setJoinCharacterId] = useState(() => searchParams.get("character") ?? "");

  useEffect(() => {
    let ignore = false;
    Promise.all([listMyTables(), isDmSide ? [] : listCharacters()])
      .then(([loadedTables, loadedCharacters]) => {
        if (ignore) return;
        setTables(loadedTables);
        setCharacters(loadedCharacters);
      })
      .catch(() => !ignore && setLoadError(true))
      .finally(() => !ignore && setIsLoading(false));
    return () => {
      ignore = true;
    };
  }, [isDmSide, loadAttempt]);

  useFocusAfterRetry(hasRetried, isLoading);

  function retryLoading() {
    setLoadError(false);
    setIsLoading(true);
    setHasRetried(true);
    setLoadAttempt((count) => count + 1);
  }

  // Only this side's tables: the ones you run, or the ones you play in.
  const myTables = tables.filter((table) => (table.dm_id === user?.id) === isDmSide);

  // A sample picture for each table card (never a real place), with no two neighbours alike.
  const tableArt = getCampaignArtForList(myTables.map((table) => table.id));

  async function handleCreate(event) {
    event.preventDefault();
    if (!newTableName.trim()) return;

    setCreateError("");
    try {
      const table = await createTable(newTableName);
      navigate(`/dm/tables/${table.id}`);
    } catch (failure) {
      setCreateError(failure.message);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();
    if (!joinCode.trim() || !joinCharacterId) return;

    setJoinError("");
    try {
      const tableId = await joinTable(joinCode, joinCharacterId);
      navigate(`/games/${tableId}`);
    } catch (failure) {
      setJoinError(failure.message);
    }
  }

  return (
    <main className="tables-page">
      <div className="tables-page__content">
        <PageBanner art={isDmSide ? "guild-table" : "hearth"} eyebrow={isDmSide ? "Dungeon Master" : "Adventurer"} title={isDmSide ? "DM Screen" : "My Games"}>
          <p className="page-banner__description">
            {isDmSide
              ? "Start a table for your campaign or one-shot, share its join code, and run the game from here. "
              : "Join your DM's table with one of your characters, then play from here and your character sheet. "}
            <Link className="page-banner__link" to="/guide?section=tables">
              How playing at a table works
            </Link>
          </p>
        </PageBanner>

        <div className="tables-page__forms">
          {isDmSide ? (
            <form className="tables-page__card" onSubmit={handleCreate}>
              <h2 className="tables-page__card-title">Start a new table</h2>
              <label className="tables-page__label" htmlFor="new-table-name">
                Table name
              </label>
              <input
                id="new-table-name"
                className="tables-page__input"
                value={newTableName}
                maxLength={80}
                placeholder="e.g. The Final Fight"
                onChange={(event) => setNewTableName(event.target.value)}
              />
              {createError && (
                <p className="tables-page__error" role="alert">
                  {createError}
                </p>
              )}
              <Button type="submit" disabled={!newTableName.trim()}>
                Create table
              </Button>
            </form>
          ) : (
            <form className="tables-page__card" onSubmit={handleJoin}>
              <h2 className="tables-page__card-title">Join a table</h2>
              <label className="tables-page__label" htmlFor="join-code">
                Join code from your DM
              </label>
              <input
                id="join-code"
                className="tables-page__input tables-page__input--code"
                value={joinCode}
                maxLength={6}
                placeholder="ABC123"
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              />
              <label className="tables-page__label" htmlFor="join-character">
                Your character
              </label>
              <select
                id="join-character"
                className="tables-page__input"
                value={joinCharacterId}
                onChange={(event) => setJoinCharacterId(event.target.value)}
              >
                <option value="">Choose a character...</option>
                {characters.map((sheet) => (
                  <option key={sheet.id} value={sheet.id}>
                    {sheet.name} (Level {sheet.level} {sheet.class?.name ?? ""})
                  </option>
                ))}
              </select>
              {joinError && (
                <p className="tables-page__error" role="alert">
                  {joinError}
                </p>
              )}
              <Button type="submit" disabled={!joinCode.trim() || !joinCharacterId}>
                Join table
              </Button>
            </form>
          )}

          {/* A pointer to the other side, for people who landed on the wrong one. */}
          <aside className="tables-page__card tables-page__card--other">
            <h2 className="tables-page__card-title">
              {isDmSide ? "Playing instead?" : "Running the game?"}
            </h2>
            <p className="tables-page__empty">
              {isDmSide
                ? "Tables you join as a player are under Adventurer, in My Games."
                : "Tables you run as the DM, and the join code to share, are on your DM Screen."}
            </p>
            <Link
              className="qk-button qk-button--secondary tables-page__other-link"
              to={isDmSide ? "/games" : "/dm"}
            >
              {isDmSide ? "Go to My Games" : "Go to the DM Screen"}
            </Link>
          </aside>
        </div>

        <h2 className="tables-page__section-title">
          {isDmSide ? "Tables you run" : "Games you play in"}
        </h2>

        {isLoading && (
          <StatusNote variant="loading" focusOnShow={hasRetried}>
            Loading your tables...
          </StatusNote>
        )}

        {loadError && (
          <StatusNote variant="error" onRetry={retryLoading}>
            Couldn&apos;t load your tables. Check your connection and try again.
          </StatusNote>
        )}

        {!isLoading && !loadError && myTables.length === 0 && (
          <div className="tables-page__intro">
            <p className="tables-page__empty">
              {isDmSide ? "You are not running any tables yet." : "You are not at any tables yet."}{" "}
              Here is how a game night works:
            </p>
            <ol className="tables-page__intro-steps">
              <li>
                <strong>The DM creates a table</strong> on the DM Screen and reads
                out its six-character join code.
              </li>
              <li>
                <strong>Each player joins</strong> from My Games (or their
                character sheet) with that code and the character they are playing.
              </li>
              <li>
                <strong>When a fight starts,</strong> everyone rolls initiative.
                Players attack from their character sheet, and the DM keeps the
                monsters&apos; HP and AC hidden.
              </li>
            </ol>
          </div>
        )}

        <ul className="tables-page__list">
          {myTables.map((table, index) => (
            <li key={table.id}>
              <Link
                className="tables-page__item"
                to={isDmSide ? `/dm/tables/${table.id}` : `/games/${table.id}`}
              >
                {/* A sample picture picked from the table's id (never a real place). */}
                <img className="tables-page__item-art" src={tableArt[index]} alt="" width="160" height="120" loading="lazy" />
                <span className="tables-page__item-text">
                  <span className="tables-page__item-name">{table.name}</span>
                  <span className="tables-page__item-role">
                    {isDmSide ? `Join code ${table.join_code}` : "Player"}
                    {table.combat_active ? " · In combat" : ""}
                  </span>
                </span>
                <span className="tables-page__item-open" aria-hidden="true">
                  {isDmSide ? "Open table" : "Open game"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default TablesPage;
