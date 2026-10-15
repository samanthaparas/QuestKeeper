import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  listCharacters,
  deleteCharacter,
  saveCharacterOrder,
  sortByListPosition,
} from "../../utils/characterStore";
import { getInitials } from "../../utils/characterSheet";
import "./CharactersPage.css";
import Button from "../../components/Button/Button";

// "Your Characters": the signed-in player's list of characters. Each row
// shows the character's portrait (or their initials if they have none),
// name and level/race/class, and links to the full sheet.
//
// "Reorder" switches the list into an arranging mode: each row gets up and
// down arrows, and "Save order" keeps the new order in their account so it's
// the same on every device.

// Simple outline icons, drawn the same way as the character sheet's.
const ICON_PATHS = {
  trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
};

function IconButton({ icon, label, className = "", onClick, disabled = false }) {
  return (
    <button
      type="button"
      className={`characters-page__icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
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

// Portrait, name and "Level 15 · Tiefling · Paladin".
function CharacterSummary({ sheet }) {
  return (
    <>
      <span className="characters-page__portrait" aria-hidden="true">
        {sheet.portraitUrl ? <img src={sheet.portraitUrl} alt="" /> : getInitials(sheet.name)}
      </span>

      <span className="characters-page__item-text">
        <span className="characters-page__item-name">{sheet.name}</span>
        <span className="characters-page__item-meta">
          Level {sheet.level} · {sheet.race?.name ?? "No race"} ·{" "}
          {sheet.class?.name ?? "No class"}
        </span>
      </span>
    </>
  );
}

function CharactersPage() {
  const [characters, setCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // While reordering, `draftOrder` holds the list as the player is arranging
  // it; nothing is saved until they press "Save order".
  const [draftOrder, setDraftOrder] = useState(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  // The character whose row is asking "Delete X?" right now, if any.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // One message line for anything that didn't save (order or delete).
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const isReordering = draftOrder !== null;
  const shownCharacters = draftOrder ?? characters;

  useEffect(() => {
    listCharacters()
      .then((list) => setCharacters(sortByListPosition(list)))
      .finally(() => setIsLoading(false));
  }, []);

  // Asks on the page itself rather than with a browser pop-up, because a
  // browser can be set to silently block pop-ups, which made Delete look
  // like it did nothing.
  async function handleDelete(id, name) {
    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteCharacter(id);
      setCharacters(sortByListPosition(await listCharacters()));
      setConfirmingDeleteId(null);
    } catch {
      setErrorMessage(`Couldn't delete ${name}. Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  }

  function startReordering() {
    setConfirmingDeleteId(null);
    setErrorMessage("");
    setDraftOrder(characters);
  }

  // Swaps a character with its neighbour above (-1) or below (+1).
  function moveCharacter(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= draftOrder.length) return;

    const next = [...draftOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setDraftOrder(next);
  }

  async function saveOrder() {
    setIsSavingOrder(true);
    setErrorMessage("");

    try {
      await saveCharacterOrder(draftOrder.map((sheet) => sheet.id));
      setCharacters(draftOrder.map((sheet, index) => ({ ...sheet, listPosition: index })));
      setDraftOrder(null);
    } catch {
      setErrorMessage("Couldn't save the new order. Please try again.");
    } finally {
      setIsSavingOrder(false);
    }
  }

  return (
    <main className="characters-page">
      <div className="characters-page__content">
        <h1 className="characters-page__title">Your Characters</h1>

        <p className="characters-page__description">
          Saved to your account — sign in anywhere to see the same characters.
        </p>

        <div className="characters-page__toolbar">
          {isReordering ? (
            <>
              <Button onClick={saveOrder} disabled={isSavingOrder}>
                {isSavingOrder ? "Saving…" : "Save order"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDraftOrder(null)}
                disabled={isSavingOrder}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => navigate("/characters/new")}>+ New Character</Button>
              {characters.length > 1 && (
                <Button variant="secondary" onClick={startReordering}>
                  Reorder
                </Button>
              )}
            </>
          )}
        </div>

        {isReordering && (
          <p className="characters-page__hint">
            Use the arrows to move characters up or down, then save.
          </p>
        )}

        {errorMessage && (
          <p className="characters-page__error" role="alert">
            {errorMessage}
          </p>
        )}

        {isLoading && (
          <p className="characters-page__empty">Loading your characters...</p>
        )}

        {!isLoading && characters.length === 0 && (
          <p className="characters-page__empty">
            No characters yet. Create one to get started.
          </p>
        )}

        <ul className="characters-page__list">
          {shownCharacters.map((sheet, index) => (
            <li className="characters-page__item" key={sheet.id}>
              {isReordering ? (
                // Not a link while arranging, so a missed tap on an arrow
                // doesn't open the sheet and lose the unsaved order.
                <div className="characters-page__item-info">
                  <CharacterSummary sheet={sheet} />
                </div>
              ) : (
                <Link className="characters-page__item-info" to={`/characters/${sheet.id}`}>
                  <CharacterSummary sheet={sheet} />
                </Link>
              )}

              {isReordering ? (
                <span className="characters-page__move">
                  <IconButton
                    icon="up"
                    label={`Move ${sheet.name} up`}
                    onClick={() => moveCharacter(index, -1)}
                    disabled={index === 0 || isSavingOrder}
                  />
                  <IconButton
                    icon="down"
                    label={`Move ${sheet.name} down`}
                    onClick={() => moveCharacter(index, 1)}
                    disabled={index === shownCharacters.length - 1 || isSavingOrder}
                  />
                </span>
              ) : confirmingDeleteId === sheet.id ? (
                <span className="characters-page__confirm" role="group" aria-label={`Delete ${sheet.name}?`}>
                  <span className="characters-page__confirm-text">
                    Delete {sheet.name}? This can't be undone.
                  </span>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(sheet.id, sheet.name)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmingDeleteId(null)}
                    disabled={isDeleting}
                  >
                    Keep
                  </Button>
                </span>
              ) : (
                // A small trash can instead of a big red button, so deleting
                // is still easy to find but doesn't shout. It asks first.
                <IconButton
                  icon="trash"
                  label={`Delete ${sheet.name}`}
                  className="characters-page__icon-button--delete"
                  onClick={() => {
                    setErrorMessage("");
                    setConfirmingDeleteId(sheet.id);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default CharactersPage;
