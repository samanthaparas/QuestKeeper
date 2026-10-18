import { useCallback, useEffect, useId, useState } from "react";
import Button from "../Button/Button";
import {
  addJournalEntry,
  deleteJournalEntry,
  getTablePortraits,
  listJournal,
  setSessionNumber,
  startNextSession,
  subscribeToJournal,
  updateJournalEntry,
} from "../../utils/journalStore";
import {
  formatDay,
  formatStamp,
  groupBySession,
  readSessionNumber,
  sessionChoices,
  wasEdited,
} from "../../utils/journal";
import { getInitials } from "../../utils/characterSheet";
import "./TableJournal.css";

const POLL_MS = 15000;
const MAX_LENGTH = 4000;
// How many of the newest notes show before "Show all".
const SHOWN_NOTES = 5;

// The note you're writing is kept per table, so switching tabs or reloading
// doesn't lose it.
function draftKey(tableId) {
  return `qk-journal-draft-${tableId}`;
}

function readDraft(tableId) {
  try {
    return window.localStorage.getItem(draftKey(tableId)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(tableId, text) {
  try {
    if (text) window.localStorage.setItem(draftKey(tableId), text);
    else window.localStorage.removeItem(draftKey(tableId));
  } catch {
    // Saving the draft is a convenience; writing still works without it.
  }
}

// "Whole table" or "Just me" for one note.
function VisibilityChoice({ value, onChange, name }) {
  return (
    <fieldset className="table-journal__visibility">
      <legend className="table-journal__visually-hidden">Who can read this note</legend>
      {[
        ["table", "Whole table"],
        ["private", "🔒 Just me"],
      ].map(([key, label]) => (
        <label
          key={key}
          className={`table-journal__choice${value === key ? " table-journal__choice--on" : ""}`}
        >
          <input
            type="radio"
            name={name}
            value={key}
            checked={value === key}
            onChange={() => onChange(key)}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

// The table's shared journal: notes and session recaps from everyone at the
// table, signed with the character's name (or "DM") and a time. Each note is
// for the whole table or just its writer. Only the writer can edit or delete.
//
// Anyone can file a note under any session number (to catch up on an earlier
// session, or write about session 41 of a long campaign), and look back at any
// session from the "Look back at" list. isDm adds "Start session N" and a box
// to set the table's current session. sessionNumber is the table's current one.
function TableJournal({ tableId, userId, isDm, sessionNumber = 1 }) {
  const [entries, setEntries] = useState([]);
  // Each writer's portrait, from the table's members (initials where there's none).
  const [portraits, setPortraits] = useState(() => new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraftText] = useState(() => readDraft(tableId));
  const [showAll, setShowAll] = useState(false);
  const [visibility, setVisibility] = useState("table");
  const [isPosting, setIsPosting] = useState(false);
  const [editing, setEditing] = useState(null); // { id, body, visibility, session }
  // Which session a new note goes under ("" = the table's current one), and
  // what's being looked at: "recent", "all", or a session number.
  const [noteSession, setNoteSession] = useState("");
  const [view, setView] = useState("recent");
  const [currentInput, setCurrentInput] = useState("");
  const draftId = useId();
  const choiceName = useId();

  function setDraft(text) {
    setDraftText(text);
    writeDraft(tableId, text);
  }

  const load = useCallback(() => {
    listJournal(tableId)
      .then((loaded) => {
        setEntries(loaded);
        setError("");
      })
      .catch(() => setError("Couldn't load the journal. It will try again shortly."))
      .finally(() => setIsLoading(false));
  }, [tableId]);

  useEffect(() => {
    let ignore = false;
    getTablePortraits(tableId).then((found) => !ignore && setPortraits(found));
    return () => {
      ignore = true;
    };
  }, [tableId]);

  // Live updates, plus a slow safety refresh in case they're off.
  useEffect(() => {
    load();
    const stop = subscribeToJournal(tableId, load);
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

  async function post(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    const chosen = readSessionNumber(noteSession, { allowBlank: true });
    if (chosen.error) {
      setError(chosen.error);
      return;
    }
    setIsPosting(true);
    const posted = await run(() =>
      addJournalEntry(tableId, { body: draft, visibility, sessionNumber: chosen.value }),
    );
    setIsPosting(false);
    if (posted) {
      setDraft("");
      // Look at the session the note went into, so it's easy to find.
      if (chosen.value && chosen.value !== sessionNumber) setView(String(chosen.value));
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editing.body.trim()) return;
    const chosen = readSessionNumber(editing.session);
    if (chosen.error) {
      setError(chosen.error);
      return;
    }
    if (await run(() => updateJournalEntry(editing.id, { ...editing, sessionNumber: chosen.value }))) {
      setEditing(null);
    }
  }

  // DM: set the table's current session to any number.
  async function changeCurrentSession(event) {
    event.preventDefault();
    const chosen = readSessionNumber(currentInput);
    if (chosen.error) {
      setError(chosen.error);
      return;
    }
    if (chosen.value === sessionNumber) return;
    if (window.confirm(`Make session ${chosen.value} the current session? New notes will go under it.`)) {
      if (await run(() => setSessionNumber(tableId, chosen.value))) setCurrentInput("");
    }
  }

  function remove(entry) {
    if (window.confirm("Delete this note? This can't be undone.")) {
      run(() => deleteJournalEntry(entry.id));
    }
  }

  function startSession() {
    if (window.confirm(`Start session ${sessionNumber + 1}? New notes will go under it.`)) {
      run(() => startNextSession(tableId, sessionNumber));
    }
  }

  // What's on screen: the newest few notes (the default), every session, or
  // one session in full.
  const choices = sessionChoices(entries, sessionNumber);
  const newestFirst = [...entries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const hiddenCount = view === "recent" && !showAll ? Math.max(0, entries.length - SHOWN_NOTES) : 0;
  let sessions;
  if (view === "recent") {
    sessions = groupBySession(hiddenCount ? newestFirst.slice(0, SHOWN_NOTES) : entries);
    // Show the current session's heading even before anyone writes in it.
    if (!sessions.some((group) => group.session === sessionNumber)) {
      sessions.unshift({ session: sessionNumber, startedAt: null, entries: [] });
    }
  } else if (view === "all") {
    sessions = groupBySession(entries);
    if (!sessions.some((group) => group.session === sessionNumber)) {
      sessions.unshift({ session: sessionNumber, startedAt: null, entries: [] });
    }
  } else {
    const wanted = Number(view);
    sessions = groupBySession(entries.filter((entry) => (entry.session_number ?? 1) === wanted));
    if (sessions.length === 0) sessions = [{ session: wanted, startedAt: null, entries: [] }];
  }

  return (
    <section className="table-journal" aria-labelledby={`${draftId}-title`}>
      <div className="table-journal__head">
        <h2 id={`${draftId}-title`} className="table-journal__title">
          Journal
        </h2>
        {isDm && (
          <Button variant="secondary" onClick={startSession}>
            Start session {sessionNumber + 1}
          </Button>
        )}
      </div>
      {isDm && (
        <form className="table-journal__current" onSubmit={changeCurrentSession} noValidate>
          <label htmlFor={`${draftId}-current`}>Current session is {sessionNumber}. Set it to:</label>
          <input
            id={`${draftId}-current`}
            className="table-journal__number"
            type="number"
            min="1"
            max="9999"
            placeholder={String(sessionNumber)}
            value={currentInput}
            onChange={(event) => setCurrentInput(event.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={currentInput.trim() === ""}>
            Set
          </Button>
        </form>
      )}
      <p className="table-journal__hint">
        Notes and recaps for the whole table. Each note is signed{" "}
        {isDm ? "“DM”" : "with your character's name"} and the time. Pick{" "}
        <strong>Just me</strong> for a private note only you can read.
      </p>

      <form className="table-journal__composer" onSubmit={post} noValidate>
        <label className="table-journal__visually-hidden" htmlFor={draftId}>
          New note
        </label>
        <textarea
          id={draftId}
          className="table-journal__input"
          value={draft}
          maxLength={MAX_LENGTH}
          rows={3}
          placeholder="What happened? Names, clues, loot, who owes who a favour..."
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="table-journal__composer-row">
          <VisibilityChoice value={visibility} onChange={setVisibility} name={choiceName} />
          <label className="table-journal__session-pick" htmlFor={`${draftId}-session`}>
            Session
            <input
              id={`${draftId}-session`}
              className="table-journal__number"
              type="number"
              min="1"
              max="9999"
              placeholder={String(sessionNumber)}
              value={noteSession}
              onChange={(event) => setNoteSession(event.target.value)}
            />
          </label>
          <Button type="submit" disabled={!draft.trim() || isPosting}>
            {isPosting
              ? "Saving..."
              : visibility === "private"
                ? "Save private note"
                : `Add to session ${noteSession.trim() || sessionNumber}`}
          </Button>
        </div>
        <p className="table-journal__hint">
          Leave Session as it is for the current session, or type another number to write about an earlier
          one (or start a new one).
        </p>
      </form>

      {/* Look back at any earlier session, in full. */}
      <div className="table-journal__lookback">
        <label htmlFor={`${draftId}-view`}>Look back at</label>
        <select
          id={`${draftId}-view`}
          className="table-journal__select"
          value={view}
          onChange={(event) => setView(event.target.value)}
        >
          <option value="recent">Newest notes</option>
          <option value="all">Every session</option>
          {choices.map(({ session, count }) => (
            <option key={session} value={String(session)}>
              Session {session} ({count} {count === 1 ? "note" : "notes"})
              {session === sessionNumber ? ", current" : ""}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="table-journal__error" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="table-journal__empty">Loading the journal...</p>
      ) : (
        sessions.map((group) => (
          <section key={group.session} className="table-journal__session">
            <h3 className="table-journal__session-title">
              Session {group.session}
              {group.startedAt && (
                <span className="table-journal__session-day"> · {formatDay(group.startedAt)}</span>
              )}
            </h3>

            {group.entries.length === 0 && (
              <p className="table-journal__empty">No notes yet this session.</p>
            )}

            <ol className="table-journal__entries">
              {group.entries.map((entry) => {
                const isMine = entry.author_id === userId;
                const isEditing = editing?.id === entry.id;
                return (
                  <li
                    key={entry.id}
                    className={`table-journal__entry${
                      entry.visibility === "private" ? " table-journal__entry--private" : ""
                    }${entry.author_name === "DM" ? " table-journal__entry--dm" : ""}`}
                  >
                    {/* The writer's picture (or initials, like "DM"), then the note. */}
                    <span className="table-journal__avatar table-journal__avatar--note" aria-hidden="true">
                      {portraits.get(entry.author_id) ? (
                        <img src={portraits.get(entry.author_id)} alt="" loading="lazy" />
                      ) : (
                        getInitials(entry.author_name)
                      )}
                    </span>

                    <div className="table-journal__entry-main">
                      {/* Name, time and (for your own notes) Edit and Delete on one line. */}
                      <div className="table-journal__entry-head">
                        <p className="table-journal__byline">
                          <strong className="table-journal__author">{entry.author_name}</strong>
                          <span className="table-journal__stamp">
                            {formatStamp(entry.created_at)}
                            {wasEdited(entry) ? " · edited" : ""}
                          </span>
                          {entry.visibility === "private" && (
                            <span className="table-journal__private">🔒 Just me</span>
                          )}
                        </p>
                        {isMine && !isEditing && (
                          <p className="table-journal__actions">
                            <button
                              type="button"
                              className="table-journal__link"
                              onClick={() =>
                                setEditing({
                                  id: entry.id,
                                  body: entry.body,
                                  visibility: entry.visibility,
                                  session: String(entry.session_number ?? 1),
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="table-journal__link table-journal__link--danger"
                              onClick={() => remove(entry)}
                            >
                              Delete
                            </button>
                          </p>
                        )}
                      </div>

                      {isEditing ? (
                        <form className="table-journal__edit" onSubmit={saveEdit} noValidate>
                          <textarea
                            className="table-journal__input"
                            aria-label="Edit note"
                            value={editing.body}
                            maxLength={MAX_LENGTH}
                            rows={3}
                            onChange={(event) => setEditing({ ...editing, body: event.target.value })}
                          />
                          <label className="table-journal__session-pick">
                            Session
                            <input
                              className="table-journal__number"
                              type="number"
                              min="1"
                              max="9999"
                              aria-label="Session number for this note"
                              value={editing.session}
                              onChange={(event) => setEditing({ ...editing, session: event.target.value })}
                            />
                          </label>
                          <div className="table-journal__composer-row">
                            <VisibilityChoice
                              value={editing.visibility}
                              name={`${choiceName}-${entry.id}`}
                              onChange={(next) => setEditing({ ...editing, visibility: next })}
                            />
                            <span className="table-journal__edit-buttons">
                              <Button variant="secondary" onClick={() => setEditing(null)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={!editing.body.trim()}>
                                Save
                              </Button>
                            </span>
                          </div>
                        </form>
                      ) : (
                        <p className="table-journal__body">{entry.body}</p>
                      )}

                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}

      {view === "recent" && (hiddenCount > 0 || (showAll && entries.length > SHOWN_NOTES)) && (
        <Button
          variant="secondary"
          className="table-journal__more"
          onClick={() => setShowAll((open) => !open)}
        >
          {showAll ? "Show only the newest notes" : `Show all ${entries.length} notes`}
        </Button>
      )}
    </section>
  );
}

export default TableJournal;
