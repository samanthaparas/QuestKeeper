import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCharacters, deleteCharacter } from "../../utils/characterStore";
import "./CharactersPage.css";

function CharactersPage() {
  const [characters, setCharacters] = useState(() => listCharacters());
  const navigate = useNavigate();

  function handleDelete(id) {
    deleteCharacter(id);
    setCharacters(listCharacters());
  }

  return (
    <main className="characters-page">
      <div className="characters-page__content">
        <h1 className="characters-page__title">Your Characters</h1>

        <p className="characters-page__description">
          Saved locally in this browser for now — accounts and sync are planned
          for later.
        </p>

        <button
          className="characters-page__create-button"
          type="button"
          onClick={() => navigate("/characters/new")}
        >
          + New Character
        </button>

        {characters.length === 0 && (
          <p className="characters-page__empty">
            No characters yet. Create one to get started.
          </p>
        )}

        <ul className="characters-page__list">
          {characters.map((sheet) => (
            <li className="characters-page__item" key={sheet.id}>
              <div className="characters-page__item-info">
                <span className="characters-page__item-name">{sheet.name}</span>
                <span className="characters-page__item-meta">
                  Level {sheet.level} · {sheet.race?.name ?? "No race"} ·{" "}
                  {sheet.class?.name ?? "No class"}
                </span>
              </div>

              <button
                className="characters-page__delete-button"
                type="button"
                onClick={() => handleDelete(sheet.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default CharactersPage;
