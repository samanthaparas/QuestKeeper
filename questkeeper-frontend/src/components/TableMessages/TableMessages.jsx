import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMessages } from "../../hooks/useMessages";
import { startConversation } from "../../utils/messageStore";
import ConversationThread from "./ConversationThread";
import StatusNote from "../StatusNote/StatusNote";
import { conversationTitle, joinNames, personName } from "./messageLabels";
import "./TableMessages.css";

// "/games/abc", "/dm/tables/abc" (or an old "/tables/abc") -> "abc": on a
// table's page, new messages start there.
function tableFromPath(pathname) {
  return pathname.match(/^\/(?:games|dm\/tables|tables)\/([^/]+)/)?.[1] ?? null;
}

// Secret messages, from the header on every page: an envelope with an
// unread count that opens a side drawer with conversations from all your
// tables. Anyone at a table can message the whole party, a few people, or
// one person; only the people in a conversation can read it.
// Things the keyboard can land on, inside the drawer.
const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

function TableMessages({ myId }) {
  const messages = useMessages(myId);
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState({ name: "list" }); // list | new | thread
  const buttonRef = useRef(null);
  const drawerRef = useRef(null);
  const titleRef = useRef(null);
  const titleId = useId();
  // Which screen of the drawer was showing last time, so changing screens
  // (not opening the drawer) is what moves keyboard focus.
  const shownView = useRef(null);
  const { incoming, clearIncoming } = messages;
  const viewKey = `${view.name}:${view.id ?? ""}`;

  // Open and showing: Escape closes from anywhere, and Tab stays among the
  // Messages button and the drawer's own controls (on a phone the drawer
  // covers the page, so Tab must not wander into what's hidden behind it).
  useEffect(() => {
    if (!isOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        clearIncoming();
        buttonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = drawerRef.current;
      const toggle = buttonRef.current;
      if (!drawer || !toggle) return;
      const stops = [
        toggle,
        ...[...drawer.querySelectorAll(FOCUSABLE)].filter(
          (element) => !element.disabled && !element.closest("[hidden]") && getComputedStyle(element).display !== "none",
        ),
      ];
      const first = stops[0];
      const last = stops.at(-1);
      const active = document.activeElement;
      // Focus on the drawer's heading or message list (focusable only by script) counts as inside.
      if (active !== toggle && !drawer.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, clearIncoming]);

  // The button you pressed to change screens is gone from the page, so focus
  // moves to the drawer's heading, which says where you are now.
  useEffect(() => {
    if (!isOpen) {
      shownView.current = null;
      return;
    }
    if (shownView.current !== null && shownView.current !== viewKey) titleRef.current?.focus();
    shownView.current = viewKey;
  }, [isOpen, viewKey]);

  if (!myId) return null;

  function close() {
    setIsOpen(false);
    // Anything that arrived while it was open has been seen.
    clearIncoming();
    buttonRef.current?.focus();
  }

  const tableName = (tableId) => messages.tables.find((table) => table.id === tableId)?.name ?? "A table";
  const peopleAt = (tableId) => messages.peopleByTable[tableId] ?? [];
  const fromName = incoming
    ? personName(peopleAt(incoming.table_id), incoming.sender_id, myId)
    : "";
  const openConversation = messages.conversations.find((entry) => entry.id === view.id);
  const unread = messages.unreadTotal;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`table-messages__button${unread > 0 ? " table-messages__button--unread" : ""}${
          incoming && !isOpen ? " table-messages__button--new" : ""
        }`}
        aria-expanded={isOpen}
        aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
        title="Messages"
        onClick={() => {
          if (isOpen) return close();
          clearIncoming();
          setIsOpen(true);
          setView({ name: "list" });
        }}
      >
        <svg className="table-messages__icon" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 5h14v10H3z" />
          <path d="m3 5 7 6 7-6" />
        </svg>
        {/* The word makes it easy to find; it drops away on narrow screens. */}
        <span className="table-messages__label">Messages</span>
        {unread > 0 && (
          <span className="table-messages__badge" aria-hidden="true">
            {unread}
          </span>
        )}
      </button>
      {/* Read out for screen readers when something new arrives. */}
      <span className="table-messages__live" aria-live="polite">
        {incoming && !isOpen ? `New message from ${fromName}` : ""}
      </span>

      {isOpen && (
        <aside className="table-messages__drawer" aria-labelledby={titleId} ref={drawerRef}>
          <header className="table-messages__header">
            {view.name !== "list" && (
              <button
                type="button"
                className="table-messages__back"
                onClick={() => {
                  setView({ name: "list" });
                  messages.reload();
                }}
              >
                ‹ All messages
              </button>
            )}
            <h2 id={titleId} className="table-messages__title" ref={titleRef} tabIndex={-1}>
              Messages
              {view.name === "thread" && openConversation && (
                <span className="table-messages__table"> · {tableName(openConversation.tableId)}</span>
              )}
            </h2>
            <button type="button" className="table-messages__close" aria-label="Close messages" onClick={close}>
              ×
            </button>
          </header>

          {messages.error && (
            <StatusNote
              variant="error"
              onRetry={async () => {
                await messages.reload();
                titleRef.current?.focus();
              }}
            >
              {messages.error}
            </StatusNote>
          )}

          {/* Something arrived while this is open: say so, and offer to open it
              (not shown when you're already reading that conversation). */}
          {incoming && !(view.name === "thread" && view.id === incoming.conversation_id) && (
            <div className="table-messages__arrived" role="status">
              <span>
                <strong>New message</strong> from {fromName}
              </span>
              <button
                type="button"
                className="table-messages__arrived-open"
                onClick={() => {
                  setView({ name: "thread", id: incoming.conversation_id });
                  clearIncoming();
                }}
              >
                Open it
              </button>
            </div>
          )}

          {messages.isLoading && messages.tables.length === 0 && !messages.error ? (
            <div className="table-messages__body">
              <StatusNote variant="loading">Loading your messages...</StatusNote>
            </div>
          ) : messages.error && messages.tables.length === 0 ? null : messages.tables.length === 0 ? (
            <div className="table-messages__body">
              <StatusNote>
                Messages are for the people at your tables. Make a table, or join one with your
                DM&apos;s code, and you can message the whole party, a few people, or just one.
              </StatusNote>
              <Link className="table-messages__primary table-messages__primary--link" to="/games" onClick={close}>
                Go to My Games
              </Link>
            </div>
          ) : (
            <>
              {view.name === "list" && (
                <ConversationList
                  conversations={messages.conversations}
                  showTable={messages.tables.length > 1}
                  tableName={tableName}
                  peopleAt={peopleAt}
                  myId={myId}
                  onNew={() => setView({ name: "new" })}
                  onOpen={(id) => setView({ name: "thread", id })}
                />
              )}
              {view.name === "new" && (
                <NewConversation
                  tables={messages.tables}
                  startTableId={tableFromPath(pathname)}
                  peopleAt={peopleAt}
                  myId={myId}
                  onOpen={(id) => {
                    setView({ name: "thread", id });
                    messages.reload();
                  }}
                />
              )}
              {view.name === "thread" && (
                <ConversationThread
                  // Fresh for each conversation opened.
                  key={view.id}
                  conversationId={view.id}
                  conversation={openConversation}
                  people={openConversation ? peopleAt(openConversation.tableId) : []}
                  myId={myId}
                  version={messages.version}
                  onRead={messages.reload}
                />
              )}
            </>
          )}
        </aside>
      )}
    </>
  );
}

function ConversationList({ conversations, showTable, tableName, peopleAt, myId, onNew, onOpen }) {
  return (
    <div className="table-messages__body">
      <button type="button" className="table-messages__new" onClick={onNew}>
        + New message
      </button>
      {conversations.length === 0 ? (
        <StatusNote>
          No messages yet. Send a secret note to one person, a few, or the whole party: only the
          people you pick can read it.
        </StatusNote>
      ) : (
        <ul className="table-messages__list">
          {conversations.map((conversation) => {
            const people = peopleAt(conversation.tableId);
            const last = conversation.lastMessage;
            const title = conversationTitle(conversation, people, myId);
            const preview = last
              ? `${personName(people, last.sender_id, myId)}: ${last.body || "Sent a picture"}`
              : "No messages yet";
            const table = showTable ? tableName(conversation.tableId) : null;
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={`table-messages__row${conversation.unread > 0 ? " table-messages__row--unread" : ""}`}
                  // Read as one sentence: "DM. Test night. DM: Meet me later. 2 new".
                  aria-label={[title, table, preview, conversation.unread > 0 && `${conversation.unread} new`]
                    .filter(Boolean)
                    .join(". ")}
                  onClick={() => onOpen(conversation.id)}
                >
                  {/* A wax seal marks unread conversations. */}
                  {conversation.unread > 0 && <span className="table-messages__seal" aria-hidden="true" />}
                  <span className="table-messages__row-title">{title}</span>
                  {table && <span className="table-messages__row-table">{table}</span>}
                  <span className="table-messages__row-preview">{preview}</span>
                  {conversation.unread > 0 && (
                    <span className="table-messages__row-count">{conversation.unread} new</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Pick the table (when you're at more than one), then who should see it.
function NewConversation({ tables, startTableId, peopleAt, myId, onOpen }) {
  const [tableId, setTableId] = useState(
    tables.some((table) => table.id === startTableId) ? startTableId : tables[0]?.id,
  );
  const [everyone, setEveryone] = useState(false);
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const people = peopleAt(tableId);
  const others = people.filter((person) => person.userId !== myId);
  const canStart = Boolean(tableId) && (everyone || picked.length > 0);

  async function handleStart() {
    setIsBusy(true);
    setError("");
    try {
      onOpen(await startConversation(tableId, { everyone, userIds: picked }));
    } catch (startError) {
      setError(startError.message ?? "Couldn't start that conversation.");
      setIsBusy(false);
    }
  }

  return (
    <div className="table-messages__body">
      {tables.length > 1 && (
        <label className="table-messages__field">
          <span>Which table?</span>
          <select
            value={tableId}
            onChange={(event) => {
              setTableId(event.target.value);
              setPicked([]);
            }}
          >
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset className="table-messages__pick">
        <legend>Who should see it?</legend>
        <label className="table-messages__check">
          <input type="checkbox" checked={everyone} onChange={() => setEveryone((value) => !value)} />
          <span>
            <b>Everyone at the table</b>
            <small>Good for maps, handouts and news for the whole party.</small>
          </span>
        </label>
        {!everyone &&
          others.map((person) => (
            <label key={person.userId} className="table-messages__check">
              <input
                type="checkbox"
                checked={picked.includes(person.userId)}
                onChange={() =>
                  setPicked((list) =>
                    list.includes(person.userId)
                      ? list.filter((id) => id !== person.userId)
                      : [...list, person.userId],
                  )
                }
              />
              <span>
                <b>{person.name}</b>
                {person.isDm && <small>Runs the table</small>}
              </span>
            </label>
          ))}
        {!everyone && others.length === 0 && (
          <p className="table-messages__empty">
            Nobody else is at this table yet. You can still message everyone, and people who join
            later will see it.
          </p>
        )}
      </fieldset>
      {!everyone && picked.length > 0 && (
        <p className="table-messages__privacy">
          Only {joinNames([...picked.map((id) => personName(people, id, myId)), "you"])} will see it
          {picked.length > 1 ? ", together." : "."}
        </p>
      )}
      {error && (
        <p className="table-messages__error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="table-messages__primary" disabled={!canStart || isBusy} onClick={handleStart}>
        {isBusy ? "Opening..." : "Write a message"}
      </button>
    </div>
  );
}

export default TableMessages;
