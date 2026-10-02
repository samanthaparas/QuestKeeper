import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { listCharacters } from "../../utils/characterStore";
import { createTable, joinTable, listMyTables } from "../../utils/tableStore";
import Button from "../../components/Button/Button";
import "./TablesPage.css";

function TablesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [newTableName, setNewTableName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinCharacterId, setJoinCharacterId] = useState("");

  useEffect(() => {
    Promise.all([listMyTables(), listCharacters()])
      .then(([loadedTables, loadedCharacters]) => {
        setTables(loadedTables);
        setCharacters(loadedCharacters);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    if (!newTableName.trim()) return;

    setError("");
    try {
      const table = await createTable(newTableName);
      navigate(`/tables/${table.id}`);
    } catch (createError) {
      setError(createError.message);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();
    if (!joinCode.trim() || !joinCharacterId) return;

    setError("");
    try {
      const tableId = await joinTable(joinCode, joinCharacterId);
      navigate(`/tables/${tableId}`);
    } catch (joinError) {
      setError(joinError.message);
    }
  }

  return (
    <main className="tables-page">
      <div className="tables-page__content">
        <h1 className="tables-page__title">Tables</h1>
        <p className="tables-page__description">
          A table is one campaign or session. The DM creates it and shares the
          join code. Players join with one of their characters.
        </p>

        {error && (
          <p className="tables-page__error" role="alert">
            {error}
          </p>
        )}

        <div className="tables-page__forms">
          <form className="tables-page__card" onSubmit={handleCreate}>
            <h2 className="tables-page__card-title">Run a table (DM)</h2>
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
            <Button type="submit" disabled={!newTableName.trim()}>
              Create table
            </Button>
          </form>

          <form className="tables-page__card" onSubmit={handleJoin}>
            <h2 className="tables-page__card-title">Join a table (player)</h2>
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
            <Button type="submit" disabled={!joinCode.trim() || !joinCharacterId}>
              Join table
            </Button>
          </form>
        </div>

        <h2 className="tables-page__section-title">Your tables</h2>

        {isLoading && <p className="tables-page__empty">Loading your tables...</p>}

        {!isLoading && tables.length === 0 && (
          <p className="tables-page__empty">
            You are not at any tables yet. Create one or join with a code.
          </p>
        )}

        <ul className="tables-page__list">
          {tables.map((table) => (
            <li key={table.id}>
              <Link className="tables-page__item" to={`/tables/${table.id}`}>
                <span className="tables-page__item-name">{table.name}</span>
                <span className="tables-page__item-role">
                  {table.dm_id === user?.id ? "You are the DM" : "Player"}
                  {table.combat_active ? " · In combat" : ""}
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
