import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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
import { getActivityIcon } from "../../utils/icons";
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
function recipientNames(handout, players) {
  return (handout.shown_to ?? [])
    .map((id) => players.find((player) => player.userId === id)?.name)
    .filter(Boolean);
}

function describeAudience(handout, players) {
  if (handout.shown_to_all) return "Shown to everyone";
  const names = recipientNames(handout, players);
  if (names.length === 0) return "Hidden · Only you";
  // A long list is summarised here; the full list is in a disclosure under the badge.
  if (names.length > 3) return `Shown to ${names.length} players`;
  return `Shown to ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`}`;
}

// "everyone", "chosen" or "hidden": which badge picture goes with the words.
function audienceKind(handout) {
  if (handout.shown_to_all) return "everyone";
  return (handout.shown_to ?? []).length > 0 ? "chosen" : "hidden";
}

const AUDIENCE_GLYPHS = { everyone: "🌐", chosen: "👥", hidden: "🔒" };

// A small picture in a handout's line: the real picture when there is one,
// otherwise a neutral "document" icon. It is only a preview. Whether anyone
// can see the handout is decided by who it was revealed to, never by this.
function HandoutThumb({ path }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let ignore = false;
    if (!path) return undefined;
    getHandoutImageUrl(path)
      .then((signed) => !ignore && setUrl(signed))
      .catch(() => !ignore && setUrl(null));
    return () => {
      ignore = true;
    };
  }, [path]);

  const neutral = getActivityIcon("handout");
  return (
    <span className="table-handouts__thumb" aria-hidden="true">
      {path && url ? <img src={url} alt="" /> : neutral && <img className="table-handouts__thumb-neutral" src={neutral} alt="" />}
    </span>
  );
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
  // Edit and Delete live behind a small "Options" button, one handout at a time.
  const [optionsId, setOptionsId] = useState(null);
  const [chosen, setChosen] = useState([]);
  const [seen, setSeen] = useState(() => readSeen(tableId));
  const titleId = useId();
  const listRef = useRef(null);
  // A long title shows two lines in a compact card. These track which titles
  // are cut off (so only those get a "Show full title" button) and which the
  // DM has opened out.
  const [truncated, setTruncated] = useState(() => new Set());
  const [fullTitles, setFullTitles] = useState(() => new Set());

  // When a handout's list is its own scroll box (the DM's Story panel on a
  // wide screen), the browser only scrolls a focused button to the very edge,
  // which clips its focus ring and can leave the handout's title out of view.
  // So when focus lands in a handout, scroll this list (never the page) until
  // the whole handout is showing with a little room around it; a handout
  // taller than the box shows its title, unless that would hide the focused
  // control.
  function keepHandoutInView(event) {
    const list = listRef.current;
    if (!list || list.scrollHeight <= list.clientHeight + 1) return;
    // Only for keyboard focus: a click or tap never moves the list under the pointer.
    if (!event.target.matches?.(":focus-visible")) return;
    placeInList(event.currentTarget, event.target);
  }

  function placeInList(cardEl, targetEl) {
    const list = listRef.current;
    if (!list) return;
    const pad = 8;
    const box = list.getBoundingClientRect();
    const card = cardEl.getBoundingClientRect();
    const target = targetEl.getBoundingClientRect();
    let delta = 0;
    if (card.height + pad * 2 <= box.height) {
      if (card.top < box.top + pad) delta = card.top - (box.top + pad);
      else if (card.bottom > box.bottom - pad) delta = card.bottom - (box.bottom - pad);
    } else {
      delta = card.top - (box.top + pad);
      if (target.bottom - delta > box.bottom - pad) delta = target.bottom - (box.bottom - pad);
    }
    if (delta) list.scrollTop += delta;
  }

  // Which titles are cut off by the two-line limit. Measured after each
  // render and whenever the list changes size (a titles that are already
  // opened out keep their button so they can be closed again).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    function measure() {
      const next = new Set();
      for (const name of list.querySelectorAll("[data-handout-title]")) {
        const id = name.getAttribute("data-handout-title");
        if (name.classList.contains("table-handouts__name--full")) {
          if (truncatedRef.current.has(id)) next.add(id);
        } else if (name.scrollHeight > name.clientHeight + 1) {
          next.add(id);
        }
      }
      const same = next.size === truncatedRef.current.size && [...next].every((id) => truncatedRef.current.has(id));
      if (!same) {
        truncatedRef.current = next;
        setTruncated(next);
      }
    }
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  });
  const truncatedRef = useRef(new Set());

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

      <ul className="table-handouts__list" ref={listRef}>
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
              onFocus={keepHandoutInView}
            >
              <details
                className="table-handouts__details"
                open={isDm ? undefined : !isNew || undefined}
                onToggle={(event) => event.currentTarget.open && markSeen(handout.id)}
              >
                <summary className="table-handouts__summary">
                  {isDm && <HandoutThumb path={handout.image_path} />}
                  <span className="table-handouts__summary-text">
                    <span
                      className={`table-handouts__name${fullTitles.has(handout.id) ? " table-handouts__name--full" : ""}`}
                      data-handout-title={handout.id}
                      title={handout.title}
                    >
                      {isDm ? "" : "📜 "}
                      {handout.title}
                    </span>
                    {isNew && <span className="table-handouts__new">New</span>}
                    {isDm && (
                      <span
                        className={`table-handouts__status table-handouts__status--${audienceKind(handout)}${
                          isShown ? " table-handouts__status--shown" : ""
                        }`}
                      >
                        <span aria-hidden="true">{AUDIENCE_GLYPHS[audienceKind(handout)]} </span>
                        {describeAudience(handout, players)}
                      </span>
                    )}
                  </span>
                </summary>
                {isDm && recipientNames(handout, players).length > 3 && (
                  <p className="table-handouts__recipients">Shown to {recipientNames(handout, players).join(", ")}</p>
                )}
                <div className="table-handouts__content">
                  {handout.image_path && <HandoutImage path={handout.image_path} title={handout.title} />}
                  {handout.body && <p className="table-handouts__body">{handout.body}</p>}
                </div>
              </details>

              {/* Only a title that is cut off gets this, so short cards stay compact. */}
              {isDm && (truncated.has(handout.id) || fullTitles.has(handout.id)) && (
                <button
                  type="button"
                  className="table-handouts__title-toggle"
                  aria-expanded={fullTitles.has(handout.id)}
                  onClick={(event) => {
                    const button = event.currentTarget;
                    setFullTitles((current) => {
                      const next = new Set(current);
                      if (next.has(handout.id)) next.delete(handout.id);
                      else next.add(handout.id);
                      return next;
                    });
                    // The card just changed height: if that pushed this button out of
                    // the list's box, bring it back (once; the reader can then scroll freely).
                    requestAnimationFrame(() => {
                      const list = listRef.current;
                      if (!list || !button.isConnected) return;
                      const box = list.getBoundingClientRect();
                      const at = button.getBoundingClientRect();
                      if (at.top < box.top + 4 || at.bottom > box.bottom - 4) placeInList(button.closest("li"), button);
                    });
                  }}
                >
                  {fullTitles.has(handout.id) ? "Show less" : "Show full title"}
                </button>
              )}

              {isDm && (
                <div className="table-handouts__actions">
                  {/* One compact row of sharing actions that fits the handout's state. */}
                  {handout.shown_to_all ? null : (
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
                    {!handout.shown_to_all && (handout.shown_to ?? []).length > 0 ? "Change players" : "Choose players"}
                  </Button>
                  {isShown && (
                    <Button
                      variant="secondary"
                      onClick={() => run(() => setHandoutAudience(handout.id, { everyone: false, userIds: [] }))}
                    >
                      Hide again
                    </Button>
                  )}
                  <button
                    type="button"
                    className="table-handouts__options-toggle"
                    aria-expanded={optionsId === handout.id}
                    aria-label={`Options for ${handout.title}`}
                    onClick={() => setOptionsId(optionsId === handout.id ? null : handout.id)}
                  >
                    Options
                  </button>
                  {optionsId === handout.id && (
                <div className="table-handouts__options" role="group" aria-label={`Options for ${handout.title}`}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setOptionsId(null);
                      setEditingId(handout.id);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="secondary" onClick={() => remove(handout)}>
                    Delete
                  </Button>
                </div>
                  )}
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
