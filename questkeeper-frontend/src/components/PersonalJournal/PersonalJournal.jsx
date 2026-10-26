import { useCallback, useEffect, useId, useState } from "react";
import Button from "../Button/Button";
import {
  addPersonalNote,
  deletePersonalNote,
  listPersonalNotes,
  markNoteShared,
  updatePersonalNote,
} from "../../utils/characterJournalStore";
import { addJournalEntry } from "../../utils/journalStore";
import {
  formatDay,
  formatStamp,
  groupBySession,
  readSessionNumber,
  sessionChoices,
  wasEdited,
} from "../../utils/journal";
import CharacterAvatar from "../CharacterAvatar/CharacterAvatar";
import "../TableJournal/TableJournal.css";
import "./PersonalJournal.css";
import InlineLoading from "../StatusNote/InlineLoading";

const MAX_LENGTH = 4000;
// How many of the newest notes show before the reader picks a session.
const SHOWN_NOTES = 5;

// What was typed is kept per character, so switching tabs or reloading
// doesn't lose it.
function draftKey(characterId) {
  return `qk-personal-journal-draft-${characterId}`;
}

function readDraft(characterId) {
  try {
    return window.localStorage.getItem(draftKey(characterId)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(characterId, text) {
  try {
    if (text) window.localStorage.setItem(draftKey(characterId), text);
    else window.localStorage.removeItem(draftKey(characterId));
  } catch {
    // Saving the draft is a convenience; writing still works without it.
  }
}

const SHARE_CHOICES = [
  ["skip", "Keep out"],
  ["table", "Share with the table"],
  ["private", "Bring in as Just me"],
];

// A character's own journal: numbered sessions of notes only its owner can
// read, whether or not the character is at a table. A note can be kept here,
// or (if the character is at a table) brought into the table's journal for
// everyone, or as a "Just me" note there. Nothing is shared unless the player
// chooses it.
//
// characterId: whose journal. table: { id, name } when the character is at a
// table, so notes can be brought in; null otherwise. name and portraitUrl:
// the character's, shown beside the title.
function PersonalJournal({ characterId, table = null, name = "", portraitUrl = "", character }) {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraftText] = useState(() => readDraft(characterId));
  const [noteSession, setNoteSession] = useState("");
  const [view, setView] = useState("recent");
  const [showAll, setShowAll] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [editing, setEditing] = useState(null); // { id, body, session }
  const [sharing, setSharing] = useState(null); // { choices: { [id]: "skip" | "table" | "private" } }
  const [shareMessage, setShareMessage] = useState("");
  const draftId = useId();

  function setDraft(text) {
    setDraftText(text);
    writeDraft(characterId, text);
  }

  const load = useCallback(() => {
    return listPersonalNotes(characterId)
      .then((loaded) => {
        setEntries(loaded);
        setError("");
      })
      .catch(() => setError("Couldn't load your journal. Try again in a moment."))
      .finally(() => setIsLoading(false));
  }, [characterId]);

  useEffect(() => {
    load();
  }, [load]);

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

  // Notes go under the newest session by default; "Start session N" just moves
  // that to the next number, since a personal journal has no DM to do it.
  const latestSession = entries.reduce((highest, entry) => Math.max(highest, entry.session_number ?? 1), 1);

  async function post(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    const chosen = readSessionNumber(noteSession, { allowBlank: true });
    if (chosen.error) {
      setError(chosen.error);
      return;
    }
    const session = chosen.value ?? latestSession;
    setIsPosting(true);
    const posted = await run(() => addPersonalNote(characterId, { body: draft, sessionNumber: session }));
    setIsPosting(false);
    if (posted) {
      setDraft("");
      setNoteSession("");
      setView(String(session));
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
    if (await run(() => updatePersonalNote(editing.id, { body: editing.body, sessionNumber: chosen.value }))) {
      setEditing(null);
    }
  }

  function remove(entry) {
    if (window.confirm("Delete this note? This can't be undone.")) {
      run(() => deletePersonalNote(entry.id));
    }
  }

  function startNextSession() {
    setNoteSession(String(latestSession + 1));
  }

  // --- Bringing notes into the table's journal ---------------------------------

  const shareable = table ? entries.filter((entry) => entry.shared_table_id !== table.id) : [];

  function openSharing() {
    setShareMessage("");
    setSharing({ choices: Object.fromEntries(shareable.map((entry) => [entry.id, "skip"])) });
  }

  function chooseAll(choice) {
    setSharing({ choices: Object.fromEntries(shareable.map((entry) => [entry.id, choice])) });
  }

  async function bringIn() {
    const picked = shareable.filter((entry) => sharing.choices[entry.id] && sharing.choices[entry.id] !== "skip");
    if (picked.length === 0) return;
    setError("");
    let done = 0;
    let problem = "";
    try {
      for (const entry of picked) {
        const as = sharing.choices[entry.id];
        await addJournalEntry(table.id, { body: entry.body, visibility: as, sessionNumber: entry.session_number });
        await markNoteShared(entry.id, { tableId: table.id, as });
        done += 1;
      }
    } catch (failure) {
      problem = `${failure.message ?? "Something went wrong."} ${done} of ${picked.length} notes were brought in before it stopped.`;
    }
    if (done > 0) {
      setShareMessage(
        `Brought ${done} ${done === 1 ? "note" : "notes"} into ${table.name}'s journal. Your personal copies are still here.`,
      );
    }
    setSharing(null);
    // Reload first (it clears old errors), then say what went wrong, if anything.
    await load();
    if (problem) setError(problem);
  }

  // --- What's on screen --------------------------------------------------------

  const choices = sessionChoices(entries, latestSession);
  const newestFirst = [...entries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const hiddenCount = view === "recent" && !showAll ? Math.max(0, entries.length - SHOWN_NOTES) : 0;
  let sessions;
  if (view === "recent") {
    sessions = groupBySession(hiddenCount ? newestFirst.slice(0, SHOWN_NOTES) : entries);
  } else if (view === "all") {
    sessions = groupBySession(entries);
  } else {
    const wanted = Number(view);
    sessions = groupBySession(entries.filter((entry) => (entry.session_number ?? 1) === wanted));
    if (sessions.length === 0) sessions = [{ session: wanted, startedAt: null, entries: [] }];
  }

  const targetSession = noteSession.trim() || latestSession;

  return (
    <section className="table-journal personal-journal" aria-labelledby={`${draftId}-title`}>
      <div className="table-journal__head">
        <h2 id={`${draftId}-title`} className="table-journal__title personal-journal__title">
          {(portraitUrl || name) && (
            <span className="table-journal__avatar table-journal__avatar--large" aria-hidden="true">
              <CharacterAvatar character={character} name={name} portraitUrl={portraitUrl} />
            </span>
          )}
          My journal
        </h2>
        <Button variant="secondary" onClick={startNextSession}>
          Start session {latestSession + 1}
        </Button>
      </div>
      <p className="table-journal__hint">
        Your own notes about this character, numbered by session. <strong>Only you can read them.</strong> Use
        it on its own, or, once you join a table, choose which notes to share with it.
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
          <label className="table-journal__session-pick" htmlFor={`${draftId}-session`}>
            Session
            <input
              id={`${draftId}-session`}
              className="table-journal__number"
              type="number"
              min="1"
              max="9999"
              placeholder={String(latestSession)}
              value={noteSession}
              onChange={(event) => setNoteSession(event.target.value)}
            />
          </label>
          <Button type="submit" disabled={!draft.trim() || isPosting}>
            {isPosting ? "Saving..." : `Add to session ${targetSession}`}
          </Button>
        </div>
        <p className="table-journal__hint">
          Leave Session as it is for your newest session, or type another number to write about an earlier one
          (or start a new one).
        </p>
      </form>

      {error && (
        <p className="table-journal__error" role="alert">
          {error}
        </p>
      )}
      {shareMessage && (
        <p className="personal-journal__done" role="status">
          ✓ {shareMessage}
        </p>
      )}

      {/* At a table: choose what to bring into its journal. */}
      {table && !sharing && shareable.length > 0 && (
        <div className="personal-journal__bring">
          <p className="table-journal__hint">
            You&apos;re at <strong>{table.name}</strong>. You can bring some or all of these notes into its journal.
            You choose each one.
          </p>
          <Button variant="secondary" onClick={openSharing}>
            Bring notes into {table.name}
          </Button>
        </div>
      )}

      {sharing && (
        <section className="personal-journal__share" aria-label={`Bring notes into ${table.name}`}>
          <h3 className="personal-journal__share-title">Bring notes into {table.name}</h3>
          <p className="table-journal__hint">
            <strong>Share with the table</strong> means everyone at {table.name} can read it, including the DM.{" "}
            <strong>Bring in as Just me</strong> puts it in the table&apos;s journal where only you can read it.{" "}
            <strong>Keep out</strong> leaves it only here. Your personal copies stay either way.
          </p>
          <div className="personal-journal__share-all">
            <Button variant="secondary" onClick={() => chooseAll("table")}>
              Share everything with the table
            </Button>
            <Button variant="secondary" onClick={() => chooseAll("private")}>
              Bring everything in as Just me
            </Button>
            <Button variant="secondary" onClick={() => chooseAll("skip")}>
              Keep everything out
            </Button>
          </div>
          <ul className="personal-journal__share-list">
            {shareable.map((entry) => (
              <li key={entry.id} className="personal-journal__share-item">
                <p className="personal-journal__share-note">
                  <strong>Session {entry.session_number}</strong> · {entry.body.slice(0, 140)}
                  {entry.body.length > 140 ? "…" : ""}
                </p>
                <fieldset className="table-journal__visibility">
                  <legend className="table-journal__visually-hidden">
                    What to do with this note from session {entry.session_number}
                  </legend>
                  {SHARE_CHOICES.map(([key, label]) => (
                    <label
                      key={key}
                      className={`table-journal__choice${sharing.choices[entry.id] === key ? " table-journal__choice--on" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`share-${entry.id}`}
                        checked={sharing.choices[entry.id] === key}
                        onChange={() => setSharing({ choices: { ...sharing.choices, [entry.id]: key } })}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </li>
            ))}
          </ul>
          <div className="table-journal__edit-buttons">
            <Button variant="secondary" onClick={() => setSharing(null)}>
              Cancel
            </Button>
            <Button
              onClick={bringIn}
              disabled={!shareable.some((entry) => sharing.choices[entry.id] && sharing.choices[entry.id] !== "skip")}
            >
              Bring in{" "}
              {shareable.filter((entry) => sharing.choices[entry.id] && sharing.choices[entry.id] !== "skip").length}{" "}
              notes
            </Button>
          </div>
        </section>
      )}

      {/* Look back at any session, in full. */}
      {entries.length > 0 && (
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
                {session === latestSession ? ", newest" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <InlineLoading className="table-journal__empty">Loading your journal...</InlineLoading>
      ) : entries.length === 0 ? (
        <p className="table-journal__empty">
          No notes yet. Write your first one above, and it will be filed under session {latestSession}.
        </p>
      ) : (
        sessions.map((group) => (
          <section key={group.session} className="table-journal__session">
            <h3 className="table-journal__session-title">
              Session {group.session}
              {group.startedAt && (
                <span className="table-journal__session-day"> · {formatDay(group.startedAt)}</span>
              )}
            </h3>
            {group.entries.length === 0 && <p className="table-journal__empty">No notes in this session yet.</p>}
            <ol className="table-journal__entries">
              {group.entries.map((entry) => {
                const isEditing = editing?.id === entry.id;
                return (
                  <li key={entry.id} className="table-journal__entry table-journal__entry--plain">
                    {/* Time and Edit / Delete on one line, then the note. */}
                    <div className="table-journal__entry-head">
                      <p className="table-journal__byline">
                        <span className="table-journal__stamp">
                          {formatStamp(entry.created_at)}
                          {wasEdited(entry) ? " · edited" : ""}
                        </span>
                        {entry.shared_table_id && (
                          <span className="personal-journal__shared">
                            {entry.shared_as === "private" ? "Brought in as Just me" : "Shared with a table"}
                          </span>
                        )}
                      </p>
                      {!isEditing && (
                        <p className="table-journal__actions">
                          <button
                            type="button"
                            className="table-journal__link"
                            onClick={() =>
                              setEditing({ id: entry.id, body: entry.body, session: String(entry.session_number ?? 1) })
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
                        {entry.shared_table_id && (
                          <p className="table-journal__hint">
                            This note was already brought into a table&apos;s journal. Changing it here doesn&apos;t
                            change that copy.
                          </p>
                        )}
                        <span className="table-journal__edit-buttons">
                          <Button variant="secondary" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={!editing.body.trim()}>
                            Save
                          </Button>
                        </span>
                      </form>
                    ) : (
                      <p className="table-journal__body">{entry.body}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}

      {view === "recent" && (hiddenCount > 0 || (showAll && entries.length > SHOWN_NOTES)) && (
        <Button variant="secondary" className="table-journal__more" onClick={() => setShowAll((open) => !open)}>
          {showAll ? "Show only the newest notes" : `Show all ${entries.length} notes`}
        </Button>
      )}
    </section>
  );
}

export default PersonalJournal;
