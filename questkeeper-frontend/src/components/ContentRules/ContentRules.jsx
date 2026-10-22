import { useId, useState } from "react";
import { getBackgrounds, getClasses, getFeatsToBrowse, getRaces, getSpells } from "../../utils/api";
import { CONTENT_KINDS, addBan, countBanned, groupBanned, isBanned, removeBan } from "../../utils/contentRules";
import "./ContentRules.css";

// The DM's "Allowed content" panel on the Prep tab: mark races, classes,
// backgrounds, feats and spells as not allowed at this table. Players see the
// list, and the Players tab flags characters that use one. Everything is
// allowed until the DM adds something. It's a guide for the table, not a lock.
//
// banned: the table's saved list. onSave(next): saves it.

// Each kind's choices come from the app's own lists, loaded the first time
// that kind is picked.
const LOADERS = {
  race: getRaces,
  class: getClasses,
  background: () => getBackgrounds(),
  feat: getFeatsToBrowse,
  spell: getSpells,
};

function ContentRules({ banned = {}, onSave }) {
  const headingId = useId();
  const listId = useId();
  const [kind, setKind] = useState("race");
  const [options, setOptions] = useState({});
  const [loadError, setLoadError] = useState("");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  function loadKind(next) {
    if (options[next]) return;
    LOADERS[next]()
      .then((entries) =>
        setOptions((current) => ({
          ...current,
          [next]: [...new Set(entries.map((entry) => entry.name))].sort((a, b) => a.localeCompare(b)),
        })),
      )
      .catch(() => setLoadError("Couldn't load that list. You can still type a name."));
  }

  function chooseKind(next) {
    setKind(next);
    setText("");
    setMessage("");
    setLoadError("");
    loadKind(next);
  }

  async function change(next) {
    setMessage("");
    try {
      await onSave(next);
    } catch {
      setMessage("Couldn't save that. Please try again.");
    }
  }

  async function add(event) {
    event.preventDefault();
    const name = text.trim();
    if (!name) return;
    if (isBanned(banned, kind, name)) {
      setMessage(`${name} is already on the list.`);
      return;
    }
    setText("");
    await change(addBan(banned, kind, name));
  }

  const total = countBanned(banned);
  const singular = CONTENT_KINDS.find((item) => item.key === kind).singular;

  return (
    <details className="content-rules" onToggle={(event) => event.currentTarget.open && loadKind(kind)} aria-labelledby={headingId}>
      <summary id={headingId} className="content-rules__summary">
        Allowed content
        {total > 0 && <span className="content-rules__count">{total} not allowed</span>}
      </summary>
      <div className="content-rules__body">
        <p className="content-rules__hint">
          Everything is allowed unless you add it here. Players see what isn&apos;t allowed, and your Players tab flags a
          character that uses one.
        </p>

        <div className="content-rules__kinds" role="radiogroup" aria-label="What kind of option">
          {CONTENT_KINDS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="radio"
              aria-checked={kind === item.key}
              className="content-rules__pill"
              onClick={() => chooseKind(item.key)}
            >
              {item.label}
              {(banned[item.key]?.length ?? 0) > 0 && <span className="content-rules__pill-count"> {banned[item.key].length}</span>}
            </button>
          ))}
        </div>

        <form className="content-rules__form" onSubmit={add}>
          <label className="content-rules__label" htmlFor={`${listId}-input`}>
            Not allowed: add a {singular}
          </label>
          <div className="content-rules__row">
            <input
              id={`${listId}-input`}
              className="content-rules__input"
              list={`${listId}-options`}
              maxLength={80}
              autoComplete="off"
              placeholder={`Start typing a ${singular}`}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <datalist id={`${listId}-options`}>
              {(options[kind] ?? []).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <button type="submit" className="content-rules__button" disabled={!text.trim()}>
              Not allowed
            </button>
          </div>
        </form>

        {loadError && <p className="content-rules__message">{loadError}</p>}

        {groupBanned(banned).length > 0 ? (
          <ul className="content-rules__list" aria-label="Not allowed at this table">
            {groupBanned(banned).map((group) => (
              <li key={group.key}>
                <b>{group.label}:</b>{" "}
                {group.names.map((name) => (
                  <span key={name} className="content-rules__chip">
                    {name}
                    <button
                      type="button"
                      className="content-rules__remove"
                      aria-label={`Allow ${name} again`}
                      onClick={() => change(removeBan(banned, group.key, name))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="content-rules__empty">Nothing is blocked. Everything is allowed.</p>
        )}

        <p className="content-rules__message" role="status">
          {message}
        </p>
      </div>
    </details>
  );
}

export default ContentRules;
