import { useId, useState } from "react";
import "./TableRules.css";

// Table rules: session zero, written down. The DM writes a few plain lines
// (phones, absences, how rules calls work) and players read them on their
// game page. Nothing shows for players until the DM writes something.
//
// isDm: the editor (with one-tap starters so there's no blank page).
// Otherwise a short, collapsed list with a "New" tag while there's something
// they haven't opened yet (remembered on this device).
//
// rules: the saved text. onSave(text): the DM saves it.

// The same cap the database holds it to (see 20261021_table_rules.sql).
const TABLE_RULES_MAX = 1500;

const STARTERS = [
  "Phones down unless it's your turn or the game needs them.",
  "Plan your move while others take their turn.",
  "If you can't make a session, tell the group early.",
  "I'll make a quick call on rules questions, and we look it up after the session.",
  "If anything in the story isn't okay for you, say so and we'll skip it.",
];

const seenKey = (tableId) => `qk-rules-seen-${tableId}`;

function readSeen(tableId) {
  try {
    return window.localStorage.getItem(seenKey(tableId)) ?? "";
  } catch {
    return "";
  }
}

function rememberSeen(tableId, rules) {
  try {
    window.localStorage.setItem(seenKey(tableId), rules);
  } catch {
    // Not saved; the "New" tag just shows again next visit.
  }
}

const linesOf = (text) =>
  String(text ?? "")
    .split("\n")
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);

function TableRules({ tableId, rules = "", isDm = false, onSave }) {
  const headingId = useId();
  const [draft, setDraft] = useState(rules);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // What this player had already opened, to tell when there's something new.
  const [seen, setSeen] = useState(() => (isDm ? "" : readSeen(tableId)));

  if (isDm) {
    const unchanged = draft.trim() === String(rules ?? "").trim();

    function addStarter(text) {
      setMessage("");
      setDraft((current) => (current.trim() ? `${current.trim()}\n${text}` : text));
    }

    async function save() {
      setIsSaving(true);
      setMessage("");
      try {
        await onSave(draft);
        setMessage(draft.trim() ? "Saved. Your players can read it now." : "Cleared. Players won't see a rules card.");
      } catch {
        setMessage("Couldn't save that. Please try again.");
      } finally {
        setIsSaving(false);
      }
    }

    return (
      <section className="table-rules" aria-labelledby={headingId}>
        <h2 id={headingId} className="table-rules__title">
          Table rules
        </h2>
        <p className="table-rules__hint">
          A few plain lines your players can read on their game page: session zero, written down. Leave it empty
          to show nothing.
        </p>
        <textarea
          className="table-rules__input"
          aria-label="Table rules"
          rows={3}
          maxLength={TABLE_RULES_MAX}
          placeholder="One rule per line"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setMessage("");
          }}
        />
        <div className="table-rules__actions">
          <button type="button" className="table-rules__save" onClick={save} disabled={isSaving || unchanged}>
            {isSaving ? "Saving..." : "Save table rules"}
          </button>
          <span className="table-rules__message" role="status">
            {message}
          </span>
        </div>
        {/* Suggestions are tucked away so the box stays small. */}
        <details className="table-rules__starter-details">
          <summary>Starter lines (suggestions)</summary>
          <div className="table-rules__starters" role="group" aria-label="Add a starter line">
            {STARTERS.map((text) => (
              <button
                key={text}
                type="button"
                className="table-rules__starter"
                onClick={() => addStarter(text)}
                disabled={draft.includes(text)}
              >
                + {text}
              </button>
            ))}
          </div>
        </details>
      </section>
    );
  }

  const lines = linesOf(rules);
  if (lines.length === 0) return null;
  const isNew = seen !== String(rules).trim();

  return (
    <details
      className="table-rules table-rules--read"
      onToggle={(event) => {
        if (event.currentTarget.open && isNew) {
          rememberSeen(tableId, String(rules).trim());
          setSeen(String(rules).trim());
        }
      }}
    >
      <summary className="table-rules__summary">
        Table rules
        {isNew && <span className="table-rules__new">New</span>}
      </summary>
      <ul className="table-rules__list">
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    </details>
  );
}

export default TableRules;
