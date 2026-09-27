import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { listCharacters, deleteCharacter } from "../../utils/characterStore";
import "./CharactersPage.css";
import Button from "../../components/Button/Button";

function CharactersPage() {
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listCharacters()
      .then(setCharacters)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDelete(id, name) {
    const confirmed = window.confirm(`Delete ${name}? This cannot be undone.`);

    if (!confirmed) return;

    await deleteCharacter(id);
    setCharacters(await listCharacters());
  }

  return (
    <main className="characters-page">
      <div className="characters-page__content">
        <h1 className="characters-page__title">Your Characters</h1>

        <p className="characters-page__description">
          Saved to your account — sign in anywhere to see the same characters.
        </p>

        <Button
          className="characters-page__create-button"
          onClick={() => navigate("/characters/new")}
        >
          + New Character
        </Button>

        {isLoading && (
          <p className="characters-page__empty">Loading your characters...</p>
        )}

        {!isLoading && characters.length === 0 && (
          <p className="characters-page__empty">
            No characters yet. Create one to get started.
          </p>
        )}

        <ul className="characters-page__list">
          {characters.map((sheet) => (
            <li className="characters-page__item" key={sheet.id}>
              <Link
                className="characters-page__item-info"
                to={`/characters/${sheet.id}`}
              >
                <span className="characters-page__item-name">{sheet.name}</span>
                <span className="characters-page__item-meta">
                  Level {sheet.level} · {sheet.race?.name ?? "No race"} ·{" "}
                  {sheet.class?.name ?? "No class"}
                </span>
              </Link>

              <Button
                variant="danger"
                onClick={() => handleDelete(sheet.id, sheet.name)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default CharactersPage;
