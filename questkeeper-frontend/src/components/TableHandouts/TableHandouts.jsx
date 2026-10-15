import { useCallback, useEffect, useId, useState } from "react";
import Button from "../Button/Button";
import ImageLightbox from "../ImageLightbox/ImageLightbox";
import {
  createHandout,
  deleteHandout,
  getHandoutImageUrl,
  listHandouts,
  setHandoutAudience,
  subscribeToHandouts,
  updateHandout,
  validateHandoutImage,
} from "../../utils/handoutStore";
import "./TableHandouts.css";

const POLL_MS = 15000;

// Which handouts this person has opened, per table, so new ones get a tag.
function readSeen(tableId) {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(`qk-handouts-seen-${tableId}`) ?? "[]"));
  } catch {
    return new Set();
  }
}

function writeSeen(tableId, seen) {
  try {
    window.localStorage.setItem(`qk-handouts-seen-${tableId}`, JSON.stringify([...seen]));
  } catch {
    // The "New" tag is a convenience; handouts still work without it.
  }
}

// "Hidden (only you)", "Shown to everyone" or "Shown to Rook and Billie".
function describeAudience(handout, players) {
  if (handout.shown_to_all) return "Shown to everyone";
  const names = (handout.shown_to ?? [])
    .map((id) => players.find((player) => player.userId === id)?.name)
    .filter(Boolean);
  if (names.length === 0) return "Hidden (only you can see it)";
  return `Shown to ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`}`;
}

// A handout's picture, fetched through a short-lived private link. Tap to
// see it big in a pop-up.
function HandoutImage({ path, title }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let ignore = false;
    getHandoutImageUrl(path)
      .then((signed) => !ignore && setUrl(signed))
      .catch(() => !ignore && setUrl(null));
    return () => {
      ignore = true;
    };
  }, [path]);

  if (!url) return <div className="table-handouts__image table-handouts__image--loading" aria-hidden="true" />;
  return (
    <ImageLightbox
      className="table-handouts__image"
      src={url}
      alt={`Handout: ${title}`}
      caption={title}
    />
  );
}

// The DM's write box for a new handout, or for changing one.
function HandoutForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const formId = useId();

  function pickFile(event) {
    const file = event.target.files?.[0] ?? null;
    const problem = file ? validateHandoutImage(file) : null;
    setError(problem ?? "");
    setImageFile(problem ? null : file);
  }

  async function submit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    setError("");
    try {
      await onSave({ title, body, imageFile, removeImage });
    } catch (failure) {
      setError(failure.message ?? "Couldn't save the handout.");
      setIsSaving(false);
    }
  }

  return (
    <form className="table-handouts__form" onSubmit={submit}>
      <label className="table-handouts__label" htmlFor={`${formId}-title`}>
        Title
      </label>
      <input
        id={`${formId}-title`}
        className="table-handouts__input"
        value={title}
        maxLength={120}
        placeholder="e.g. The Old Map, A Letter from Sildar"
        onChange={(event) => setTitle(event.target.value)}
      />
      <label className="table-handouts__label" htmlFor={`${formId}-body`}>
        Text (optional)
      </label>
      <textarea
        id={`${formId}-body`}
        className="table-handouts__input table-handouts__textarea"
        value={body}
        maxLength={4000}
        rows={4}
        placeholder="What the letter says, the riddle on the door, the wanted poster..."
        onChange={(event) => setBody(event.target.value)}
      />
      <label className="table-handouts__label" htmlFor={`${formId}-image`}>
        Picture (optional): a map, portrait or drawing, under 5 MB
      </label>
      <input
        id={`${formId}-image`}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={pickFile}
      />
      {initial?.image_path && !imageFile && (
        <label className="table-handouts__check">
          <input
            type="checkbox"
            checked={removeImage}
            onChange={(event) => setRemoveImage(event.target.checked)}
          />
          Remove the current picture
        </label>
      )}
      {error && (
        <p className="table-handouts__error" role="alert">
          {error}
        </p>
      )}
      <div className="table-handouts__buttons">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim() || isSaving}>
          {isSaving ? "Saving..." : initial ? "Save changes" : "Save (hidden)"}
        </Button>
      </div>
    </form>
  );
}

// Handouts for a table. The DM makes them (hidden at first) and reveals each
// to everyone or to chosen players. Players see only what's been revealed to
// them, newest first, with a "New" tag until they open it.
//
// players: [{ userId, name }] for the DM's "Choose players".
// onSharedWithEveryone(title): lets the page post it to the activity log.
function TableHandouts({ tableId, isDm, players = [], onSharedWithEveryone }) {
  const [handouts, setHandouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [choosingId, setChoosingId] = useState(null);
  const [chosen, setChosen] = useState([]);
  const [seen, setSeen] = useState(() => readSeen(tableId));
  const titleId = useId();

  const load = useCallback(() => {
    listHandouts(tableId)
      .then((loaded) => {
        setHandouts(loaded);
        setError("");
      })
      .catch(() => setError("Couldn't load handouts. They'll try again shortly."))
      .finally(() => setIsLoading(false));
  }, [tableId]);

  useEffect(() => {
    load();
    const stop = subscribeToHandouts(tableId, load);
    const timer = setInterval(load, POLL_MS);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [tableId, load]);

  async function run(action) {
    setError("");
    try {
      await action();
      load();
      return true;
    } catch (failure) {
      setError(failure.message ?? "Something went wrong.");
      return false;
    }
  }

  function markSeen(id) {
    if (seen.has(id)) return;
    const next = new Set(seen).add(id);
    setSeen(next);
    writeSeen(tableId, next);
  }

  async function revealToEveryone(handout) {
    const done = await run(() => setHandoutAudience(handout.id, { everyone: true, userIds: [] }));
    if (done) onSharedWithEveryone?.(handout.title);
  }

  async function revealToChosen(handout) {
    if (await run(() => setHandoutAudience(handout.id, { everyone: false, userIds: chosen }))) {
      setChoosingId(null);
    }
  }

  function remove(handout) {
    if (window.confirm(`Delete "${handout.title}"? This can't be undone.`)) {
      run(() => deleteHandout(handout));
    }
  }

  // Players: newest reveal first. The DM: newest made first.
  const shown = isDm
    ? handouts
    : [...handouts].sort((a, b) => new Date(b.revealed_at ?? 0) - new Date(a.revealed_at ?? 0));

  return (
    <section className="table-handouts" aria-labelledby={titleId}>
      <div className="table-handouts__head">
        <h2 id={titleId} className="table-handouts__title">
          Handouts
        </h2>
        {isDm && !isCreating && (
          <Button variant="secondary" onClick={() => setIsCreating(true)}>
            + New handout
          </Button>
        )}
      </div>
      <p className="table-handouts__hint">
        {isDm
          ? "Letters, maps, clues and wanted posters. A new handout is hidden until you reveal it to everyone or to chosen players."
          : "Letters, maps and clues your DM shares with you show up here."}
      </p>

      {isDm && isCreating && (
        <HandoutForm
          onCancel={() => setIsCreating(false)}
          onSave={async (values) => {
            await createHandout(tableId, values);
            setIsCreating(false);
            load();
          }}
        />
      )}

      {error && (
        <p className="table-handouts__error" role="alert">
          {error}
        </p>
      )}

      {!isLoading && !error && shown.length === 0 && (
        <p className="table-handouts__empty">
          {isDm ? "No handouts yet." : "Nothing yet."}
        </p>
      )}

      <ul className="table-handouts__list">
        {shown.map((handout) => {
          const isShown = handout.shown_to_all || (handout.shown_to ?? []).length > 0;
          const isNew = !isDm && !seen.has(handout.id);

          if (isDm && editingId === handout.id) {
            return (
              <li key={handout.id} className="table-handouts__card">
                <HandoutForm
                  initial={handout}
                  onCancel={() => setEditingId(null)}
                  onSave={async (values) => {
                    await updateHandout(handout, values);
                    setEditingId(null);
                    load();
                  }}
                />
              </li>
            );
          }

          return (
            <li
              key={handout.id}
              className={`table-handouts__card${isDm && !isShown ? " table-handouts__card--hidden" : ""}`}
            >
              <details
                className="table-handouts__details"
                open={isDm ? undefined : !isNew || undefined}
                onToggle={(event) => event.currentTarget.open && markSeen(handout.id)}
              >
                <summary className="table-handouts__summary">
                  <span className="table-handouts__name">📜 {handout.title}</span>
                  {isNew && <span className="table-handouts__new">New</span>}
                  {isDm && (
                    <span
                      className={`table-handouts__status${isShown ? " table-handouts__status--shown" : ""}`}
                    >
                      {describeAudience(handout, players)}
                    </span>
                  )}
                </summary>
                <div className="table-handouts__content">
                  {handout.image_path && <HandoutImage path={handout.image_path} title={handout.title} />}
                  {handout.body && <p className="table-handouts__body">{handout.body}</p>}
                </div>
              </details>

              {isDm && (
                <div className="table-handouts__actions">
                  {!handout.shown_to_all && (
                    <Button onClick={() => revealToEveryone(handout)}>Reveal to everyone</Button>
                  )}
                  <Button
                    variant="secondary"
                    aria-expanded={choosingId === handout.id}
                    onClick={() => {
                      setChoosingId(choosingId === handout.id ? null : handout.id);
                      setChosen(handout.shown_to ?? []);
                    }}
                  >
                    Choose players
                  </Button>
                  {isShown && (
                    <Button
                      variant="secondary"
                      onClick={() => run(() => setHandoutAudience(handout.id, { everyone: false, userIds: [] }))}
                    >
                      Hide again
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setEditingId(handout.id)}>
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => remove(handout)}>
                    Delete
                  </Button>
                </div>
              )}

              {isDm && choosingId === handout.id && (
                <fieldset className="table-handouts__choose">
                  <legend>Who finds &ldquo;{handout.title}&rdquo;?</legend>
                  {players.length === 0 && (
                    <p className="table-handouts__empty">No players have joined yet.</p>
                  )}
                  {players.map((player) => (
                    <label key={player.userId} className="table-handouts__check">
                      <input
                        type="checkbox"
                        checked={chosen.includes(player.userId)}
                        onChange={(event) =>
                          setChosen((current) =>
                            event.target.checked
                              ? [...current, player.userId]
                              : current.filter((id) => id !== player.userId),
                          )
                        }
                      />
                      {player.name}
                    </label>
                  ))}
                  <div className="table-handouts__buttons">
                    <Button variant="secondary" onClick={() => setChoosingId(null)}>
                      Cancel
                    </Button>
                    <Button onClick={() => revealToChosen(handout)} disabled={chosen.length === 0}>
                      Show to {chosen.length === 1 ? "1 player" : `${chosen.length} players`}
                    </Button>
                  </div>
                </fieldset>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default TableHandouts;
