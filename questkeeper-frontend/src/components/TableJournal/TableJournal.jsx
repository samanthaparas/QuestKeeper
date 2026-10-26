import { useCallback, useEffect, useId, useState } from "react";
import Button from "../Button/Button";
import {
  addJournalEntry,
  deleteJournalEntry,
  getTablePortraits,
  listJournal,
  setSessionNumber,
  moveJournalEntries,
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
import CharacterAvatar from "../CharacterAvatar/CharacterAvatar";
import TableRecap from "../TableRecap/TableRecap";
import CampaignTools from "../CampaignTools/CampaignTools";
import { campaignLabel, campaignNumbers, campaignOf, sessionLabel } from "../../utils/campaigns";
import "./TableJournal.css";
import InlineLoading from "../StatusNote/InlineLoading";

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
//
// A table can run several campaigns one after another ("season 2"): the
// journal opens on the current campaign, and a Campaign list reads the older
// ones. campaignNumber / campaignNames are the table's current campaign and the
// names the DM gave them.
function TableJournal({
  tableId,
  userId,
  isDm,
  sessionNumber = 1,
  campaignNumber = 1,
  campaignNames = {},
  // The DM screen's Story panel lays the journal out as a feed with the note box underneath.
  composerLast = false,
  avatarCharacters = null,
}) {
  const [allEntries, setEntries] = useState([]);
  // Which campaign is being read (null: the current one).
  const [viewCampaign, setViewCampaign] = useState(null);
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
  // The note whose "Move to another campaign" picker is open (someone else's note).
  const [movingId, setMovingId] = useState(null);
  const draftId = useId();
  const choiceName = useId();

  // The campaign on screen, and its notes. A table that never uses campaigns
  // is one campaign, so everything looks as it always did.
  const campaigns = campaignNumbers(allEntries, campaignNumber);
  const hasSeveral = campaigns.length > 1;
  const shownCampaign = campaigns.includes(viewCampaign) ? viewCampaign : campaignNumber;
  const isCurrentCampaign = shownCampaign === campaignNumber;
  const entries = allEntries.filter((entry) => campaignOf(entry) === shownCampaign);
  // The session counted as "current" in the campaign on screen (an older
  // campaign's is its last one).
  const viewSession = isCurrentCampaign
    ? sessionNumber
    : entries.reduce((highest, entry) => Math.max(highest, entry.session_number ?? 1), 1);

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
    const moveTo = Number(editing.campaign);
    if (
      await run(async () => {
        await updateJournalEntry(editing.id, {
          id: editing.id,
          body: editing.body,
          visibility: editing.visibility,
          session: editing.session,
          sessionNumber: chosen.value,
        });
        // The campaign picker in the edit box: only when it was changed.
        if (editing.campaign && moveTo !== editing.originalCampaign) {
          await moveJournalEntries(tableId, [editing.id], moveTo);
        }
      })
    ) {
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
  const choices = sessionChoices(entries, viewSession);
  const newestFirst = [...entries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const hiddenCount = view === "recent" && !showAll ? Math.max(0, entries.length - SHOWN_NOTES) : 0;
  let sessions;
  if (view === "recent") {
    sessions = groupBySession(hiddenCount ? newestFirst.slice(0, SHOWN_NOTES) : entries);
    // Show the current session's heading even before anyone writes in it.
    if (!sessions.some((group) => group.session === viewSession)) {
      sessions.unshift({ session: viewSession, startedAt: null, entries: [] });
    }
  } else if (view === "all") {
    sessions = groupBySession(entries);
    if (!sessions.some((group) => group.session === viewSession)) {
      sessions.unshift({ session: viewSession, startedAt: null, entries: [] });
    }
  } else {
    const wanted = Number(view);
    sessions = groupBySession(entries.filter((entry) => (entry.session_number ?? 1) === wanted));
    if (sessions.length === 0) sessions = [{ session: wanted, startedAt: null, entries: [] }];
  }

  // The note box (shown under the notes on the DM's Story panel, and above them elsewhere).
  const composer = isCurrentCampaign && (
      <form className="table-journal__composer" onSubmit={post} noValidate>
        <label className="table-journal__visually-hidden" htmlFor={draftId}>
          New note
        </label>
        <textarea
          id={draftId}
          className="table-journal__input"
          value={draft}
          maxLength={MAX_LENGTH}
          rows={composerLast ? 2 : 3}
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
        {!composerLast && (
          <p className="table-journal__hint">
            Leave Session as it is for the current session, or type another number to write about an earlier
            one (or start a new one).
          </p>
        )}
      </form>
  );

  // The notes themselves (errors, loading, each session's entries, the "show all" button).
  const entriesBlock = (
    <>
      {error && (
        <p className="table-journal__error" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <InlineLoading className="table-journal__empty">Loading the journal...</InlineLoading>
      ) : (
        sessions.map((group) => (
          <section key={group.session} className="table-journal__session">
            <h3 className="table-journal__session-title">
              Session {sessionLabel(shownCampaign, group.session, hasSeveral)}
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
                      <CharacterAvatar character={avatarCharacters?.get(entry.author_id)} name={entry.author_name} portraitUrl={portraits.get(entry.author_id)} />
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
                        {/* Someone else's note: a quiet Move link (your own notes have
                            it inside Edit). */}
                        {hasSeveral && !isMine && !isEditing && (
                          <p className="table-journal__actions">
                            <button
                              type="button"
                              className="table-journal__link"
                              aria-expanded={movingId === entry.id}
                              onClick={() => setMovingId(movingId === entry.id ? null : entry.id)}
                            >
                              Move
                            </button>
                          </p>
                        )}
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
                                  campaign: String(campaignOf(entry)),
                                  originalCampaign: campaignOf(entry),
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
                          {hasSeveral && (
                            <label className="table-journal__session-pick">
                              Campaign
                              <select
                                className="table-journal__select table-journal__select--small"
                                value={editing.campaign}
                                onChange={(event) => setEditing({ ...editing, campaign: event.target.value })}
                              >
                                {campaigns.map((number) => (
                                  <option key={number} value={number}>
                                    {campaignLabel(campaignNames, number)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
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

                      {movingId === entry.id && !isMine && (
                        <p className="table-journal__move">
                          <label>
                            Move to{" "}
                            <select
                              className="table-journal__select table-journal__select--small"
                              value={campaignOf(entry)}
                              onChange={(event) => {
                                const target = Number(event.target.value);
                                setMovingId(null);
                                if (target !== campaignOf(entry)) run(() => moveJournalEntries(tableId, [entry.id], target));
                              }}
                            >
                              {campaigns.map((number) => (
                                <option key={number} value={number}>
                                  {campaignLabel(campaignNames, number)}
                                  {number === campaignOf(entry) ? " (here now)" : ""}
                                </option>
                              ))}
                            </select>
                          </label>{" "}
                          <button type="button" className="table-journal__link" onClick={() => setMovingId(null)}>
                            Cancel
                          </button>
                        </p>
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
    </>
  );

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const recapStrip = (
    <TableRecap
      key={shownCampaign}
      tableId={tableId}
      entries={entries}
      currentSession={viewSession}
      campaign={shownCampaign}
      showCampaign={hasSeveral}
    />
  );
  const campaignTools = (
    <CampaignTools
      tableId={tableId}
      entries={allEntries}
      campaignNumber={campaignNumber}
      campaignNames={campaignNames}
      onChanged={load}
    />
  );
  const currentSessionForm = isDm && isCurrentCampaign && (
    <form className="table-journal__current" onSubmit={changeCurrentSession} noValidate>
      <label htmlFor={`${draftId}-current`}>
        Current session is {sessionLabel(campaignNumber, sessionNumber, hasSeveral)}. Set it to:
      </label>
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
  );
  const startSessionButton = isDm && isCurrentCampaign && (
    <Button variant="secondary" onClick={startSession}>
      Start session {sessionLabel(campaignNumber, sessionNumber + 1, hasSeveral)}
    </Button>
  );
  const campaignNote = !isCurrentCampaign && (
    <p className="table-journal__hint table-journal__campaign-note" role="status">
      You&apos;re reading {campaignLabel(campaignNames, shownCampaign)}. New notes go into{" "}
      {campaignLabel(campaignNames, campaignNumber)}.{" "}
      <button type="button" className="table-journal__link" onClick={() => setViewCampaign(null)}>
        Back to the current campaign
      </button>
    </p>
  );
  const campaignPicker = hasSeveral && (
    <div className="table-journal__lookback">
      <label htmlFor={`${draftId}-campaign`}>Campaign</label>
      <select
        id={`${draftId}-campaign`}
        className="table-journal__select"
        value={shownCampaign}
        onChange={(event) => {
          setViewCampaign(Number(event.target.value));
          setView("recent");
          setShowAll(false);
        }}
      >
        {campaigns.map((number) => (
          <option key={number} value={number}>
            {campaignLabel(campaignNames, number)}
            {number === campaignNumber ? " (current)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
  const sessionPicker = (
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
            Session {sessionLabel(shownCampaign, session, hasSeveral)} ({count} {count === 1 ? "note" : "notes"})
            {session === viewSession && isCurrentCampaign ? ", current" : ""}
          </option>
        ))}
      </select>
    </div>
  );

  // The DM's Story panel: a slim header with Start session, a compact recap
  // strip, one filter row, the scrolling notes, and the note box at the bottom.
  // Campaigns and the manual "current session" box sit in "Session options".
  if (composerLast) {
    return (
      <section className="table-journal table-journal--feed" aria-labelledby={`${draftId}-title`}>
        <div className="table-journal__head">
          <h2 id={`${draftId}-title`} className="table-journal__title">
            Journal
          </h2>
          {startSessionButton}
        </div>
        <div className="table-journal__top">
          {recapStrip}
          <div className="table-journal__bar">
            {campaignPicker}
            {sessionPicker}
            <button
              type="button"
              className="table-journal__toggle"
              aria-expanded={optionsOpen}
              aria-controls={`${draftId}-options`}
              onClick={() => setOptionsOpen((open) => !open)}
            >
              Session options
            </button>
            <button
              type="button"
              className="table-journal__toggle"
              aria-expanded={helpOpen}
              aria-controls={`${draftId}-help`}
              onClick={() => setHelpOpen((open) => !open)}
            >
              How notes work
            </button>
          </div>
          <div id={`${draftId}-options`} className="table-journal__panel" hidden={!optionsOpen}>
            {currentSessionForm}
            {campaignTools}
          </div>
          <p id={`${draftId}-help`} className="table-journal__hint table-journal__panel" hidden={!helpOpen}>
            Notes and recaps for the whole table. Each note is signed “DM” and the time. Pick{" "}
            <strong>Just me</strong> for a private note only you can read. Leave Session as it is for the
            current session, or type another number to write about an earlier one (or start a new one).
          </p>
          {campaignNote}
        </div>
        <div className="table-journal__scroll">{entriesBlock}</div>
        {composer}
      </section>
    );
  }

  return (
    <section className="table-journal" aria-labelledby={`${draftId}-title`}>
      {recapStrip}
      {campaignTools}
      <div className="table-journal__head">
        <h2 id={`${draftId}-title`} className="table-journal__title">
          Journal
        </h2>
        {startSessionButton}
      </div>
      {currentSessionForm}
      <p className="table-journal__hint">
        Notes and recaps for the whole table. Each note is signed{" "}
        {isDm ? "“DM”" : "with your character's name"} and the time. Pick{" "}
        <strong>Just me</strong> for a private note only you can read.
      </p>
      {campaignNote}
      {composer}
      {campaignPicker}
      {sessionPicker}
      {entriesBlock}
    </section>
  );
}

export default TableJournal;
