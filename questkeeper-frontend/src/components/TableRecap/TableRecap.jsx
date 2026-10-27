import { useCallback, useEffect, useId, useState } from "react";
import { listRecaps, saveRecap, subscribeToRecaps } from "../../utils/recapStore";
import { writeRecapFromNotes } from "../../utils/api";
import { formatStamp } from "../../utils/journal";
import { sessionLabel } from "../../utils/campaigns";
import { clearFormDraft, loadFormDraft, saveFormDraft } from "../../utils/formDrafts";
import "./TableRecap.css";

// "Previously on...": one short recap per session, at the top of the Story
// tab. The group writes it together: anyone at the table (players and DM)
// can edit it, and "Draft from the notes" asks Claude to retell the session
// from the notes marked for the whole table (never a private "Just me"
// note). A draft only goes into the edit box; nothing is saved or shown until
// someone taps Save.
//
// entries: the journal entries of the campaign being read (the screen picks
// the shared ones). currentSession: its current session number. campaign:
// which campaign this is; showCampaign: label sessions "2.5" (campaign 2,
// session 5) when the table has several.

const POLL_MS = 15000;
const MAX_LENGTH = 3000;

function TableRecap({ tableId, entries = [], currentSession = 1, campaign = 1, showCampaign = false }) {
  const headingId = useId();
  const textareaId = useId();
  const [recaps, setRecaps] = useState([]);
  const [pick, setPick] = useState(null);
  // null when not editing; else { text, expectedAt: the saved version's time }.
  const [editing, setEditing] = useState(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const load = useCallback(() => {
    listRecaps(tableId)
      .then(setRecaps)
      .catch(() => {
        // Keep what's on screen; the next refresh tries again.
      });
  }, [tableId]);

  useEffect(() => {
    load();
    const stop = subscribeToRecaps(tableId, load);
    const timer = setInterval(load, POLL_MS);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [tableId, load]);

  // The sessions with notes or a recap, newest first. The one shown starts as
  // the latest session before the current one (what happened last time), or the
  // current one if that's all there is.
  const recapsHere = recaps.filter((item) => (item.campaign_number ?? 1) === campaign);
  const sessions = [
    ...new Set([
      currentSession,
      ...entries.map((entry) => entry.session_number ?? 1),
      ...recapsHere.map((recap) => recap.session_number),
    ]),
  ].sort((a, b) => b - a);
  const earlier = sessions.filter((session) => session < currentSession);
  const selected = pick ?? earlier[0] ?? currentSession;

  const selectedLabel = sessionLabel(campaign, selected, showCampaign);
  const recap = recapsHere.find((item) => item.session_number === selected) ?? null;

  // A recap being written is kept on this device until it's saved or
  // cancelled, so leaving the page (a Back press, a reload) doesn't lose it.
  const draftKey = `qk-recap-draft:${tableId}:${campaign}:${selected}`;
  const [checkedDraftFor, setCheckedDraftFor] = useState(null);
  if (editing === null && checkedDraftFor !== draftKey) {
    setCheckedDraftFor(draftKey);
    const saved = loadFormDraft(draftKey);
    if (saved?.text?.trim()) {
      setEditing(saved);
      setIsOpen(true);
      setMessage("Your unsaved recap is back. Save it, or Cancel to throw it away.");
    }
  }
  useEffect(() => {
    if (editing) saveFormDraft(draftKey, editing);
  }, [editing, draftKey]);

  function stopEditing() {
    clearFormDraft(draftKey);
    setEditing(null);
  }
  // Only notes marked for the whole table go to the AI, never a private note.
  const sharedNotes = entries
    .filter((entry) => (entry.session_number ?? 1) === selected && entry.visibility === "table")
    .map((entry) => ({ author: entry.author_name, text: entry.body }));

  // Open by itself the first time there's a recap to read. (Adjusting state
  // during render, React's pattern for this.)
  if (recap && !hasAutoOpened) {
    setHasAutoOpened(true);
    setIsOpen(true);
  }

  function startEditing(text = recap?.body ?? "") {
    setMessage("");
    setEditing({ text, expectedAt: recap?.updated_at ?? null });
    setIsOpen(true);
  }

  async function draft() {
    if (editing?.text.trim() && !window.confirm("Replace what you've typed with a new draft?")) return;
    setIsDrafting(true);
    setMessage("");
    const result = await writeRecapFromNotes({ sessionNumber: selected, entries: sharedNotes });
    setIsDrafting(false);
    if (!result.recap) {
      setMessage(result.message ?? "Couldn't write a draft.");
      return;
    }
    startEditing(result.recap);
    setMessage("Here's a draft from the notes. Change anything, then Save.");
  }

  async function save(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    try {
      await saveRecap(tableId, selected, editing.text, editing.expectedAt, campaign);
      stopEditing();
      load();
    } catch (failure) {
      if (failure.code === "changed") {
        // Show their version; this person's words stay in the box, and a
        // second Save is then a deliberate choice to replace it.
        const latest = await listRecaps(tableId).catch(() => recaps);
        setRecaps(latest);
        const theirs = latest.find(
          (item) => (item.campaign_number ?? 1) === campaign && item.session_number === selected,
        );
        setEditing((current) => ({ ...current, expectedAt: theirs?.updated_at ?? null, conflict: true }));
        setMessage(
          theirs
            ? "Someone else changed this just now. Their version is shown above. Yours is still in the box: Save again to replace theirs."
            : "Someone else removed this recap just now. Yours is still in the box: Save again to put it back.",
        );
      } else {
        setMessage(failure.message ?? "Couldn't save the recap.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  const paragraphs = (recap?.body ?? "").split(/\n{2,}/).filter(Boolean);

  return (
    <details
      className="table-recap"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      aria-labelledby={headingId}
    >
      <summary id={headingId} className="table-recap__summary">
        Previously on… <span className="table-recap__session">Session {selectedLabel}</span>
        {!recap && <span className="table-recap__empty-tag">No recap yet</span>}
      </summary>
      <div className="table-recap__body">
        {sessions.length > 1 && (
          <label className="table-recap__pick">
            Recap for session{" "}
            <select
              value={selected}
              onChange={(event) => {
                setPick(Number(event.target.value));
                setEditing(null);
                setMessage("");
              }}
            >
              {sessions.map((session) => (
                <option key={session} value={session}>
                  {sessionLabel(campaign, session, showCampaign)}
                  {session === currentSession ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {editing ? (
          <form className="table-recap__form" onSubmit={save}>
            {/* After a clash, their saved words sit above yours, so you can
                compare before choosing to replace them. */}
            {editing.conflict && recap && (
              <div className="table-recap__theirs">
                <p className="table-recap__theirs-title">Their saved version</p>
                <div className="table-recap__text">
                  {paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                  <p className="table-recap__byline">
                    Last changed by {recap.updated_by_name || "someone"} · {formatStamp(recap.updated_at)}
                  </p>
                </div>
              </div>
            )}
            <label className="table-recap__label" htmlFor={textareaId}>
              Recap for session {selectedLabel}
            </label>
            <textarea
              id={textareaId}
              className="table-recap__input"
              rows={7}
              maxLength={MAX_LENGTH}
              value={editing.text}
              onChange={(event) => setEditing({ ...editing, text: event.target.value })}
            />
            <div className="table-recap__actions">
              <button type="submit" className="table-recap__button table-recap__button--primary" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save recap"}
              </button>
              <button type="button" className="table-recap__button" onClick={stopEditing}>
                Cancel
              </button>
              <button
                type="button"
                className="table-recap__button"
                onClick={draft}
                disabled={isDrafting || sharedNotes.length === 0}
              >
                {isDrafting ? "Writing..." : "Draft from the notes"}
              </button>
            </div>
          </form>
        ) : (
          <>
            {recap ? (
              <div className="table-recap__text">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
                <p className="table-recap__byline">
                  Last changed by {recap.updated_by_name || "someone"} · {formatStamp(recap.updated_at)}
                </p>
              </div>
            ) : (
              <p className="table-recap__empty">
                Nobody has written a recap for session {selectedLabel} yet. Anyone at the table can.
              </p>
            )}
            <div className="table-recap__actions">
              <button type="button" className="table-recap__button" onClick={() => startEditing()}>
                {recap ? "Edit recap" : "Write one"}
              </button>
              <button
                type="button"
                className="table-recap__button"
                onClick={draft}
                disabled={isDrafting || sharedNotes.length === 0}
              >
                {isDrafting ? "Writing..." : "Draft from the notes"}
              </button>
            </div>
          </>
        )}

        {sharedNotes.length === 0 && (
          <p className="table-recap__hint">
            There are no notes for the whole table in session {selectedLabel} yet, so there&apos;s nothing to draft from.
          </p>
        )}
        <p className="table-recap__message" role="status">
          {message}
        </p>
        <p className="table-recap__hint">
          Anyone at the table can edit this. A draft only uses notes marked for the whole table, never a
          &ldquo;Just me&rdquo; note.
        </p>
      </div>
    </details>
  );
}

export default TableRecap;
