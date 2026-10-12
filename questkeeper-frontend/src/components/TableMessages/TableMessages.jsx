import { useId, useRef, useState } from "react";
import { useTableMessages } from "../../hooks/useTableMessages";
import { startConversation } from "../../utils/messageStore";
import ConversationThread from "./ConversationThread";
import { conversationTitle, personName } from "./messageLabels";
import "./TableMessages.css";

// Secret messages at a table: a Messages button (with an unread count) that
// opens a side drawer. Anyone at the table can message the whole party, a
// few people, or one person; only the people in a conversation can read it.
//
// raised: sit above the character sheet's roll bar on phones.
function TableMessages({ tableId, tableName, myId, raised = false }) {
  const messages = useTableMessages(tableId, myId);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState({ name: "list" }); // list | new | thread
  const buttonRef = useRef(null);
  const titleId = useId();
  const { incoming, clearIncoming } = messages;

  function close() {
    setIsOpen(false);
    // Anything that arrived while it was open has been seen.
    clearIncoming();
    buttonRef.current?.focus();
  }

  if (!tableId || !myId) return null;

  const fromName = incoming ? personName(messages.people, incoming.sender_id, myId) : "";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`table-messages__button${raised ? " table-messages__button--raised" : ""}${
          incoming && !isOpen ? " table-messages__button--new" : ""
        }`}
        aria-expanded={isOpen}
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
        Messages
        {messages.unreadTotal > 0 && (
          <span className="table-messages__badge" aria-label={`${messages.unreadTotal} unread`}>
            {messages.unreadTotal}
          </span>
        )}
      </button>
      {/* Read out for screen readers when something new arrives. */}
      <span className="table-messages__live" aria-live="polite">
        {incoming && !isOpen ? `New message from ${fromName}` : ""}
      </span>

      {isOpen && (
        <aside
          className="table-messages__drawer"
          aria-labelledby={titleId}
          onKeyDown={(event) => event.key === "Escape" && close()}
        >
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
            <h2 id={titleId} className="table-messages__title">
              Messages <span className="table-messages__table">· {tableName}</span>
            </h2>
            <button type="button" className="table-messages__close" aria-label="Close messages" onClick={close}>
              ×
            </button>
          </header>

          {messages.error && (
            <p className="table-messages__error" role="alert">
              {messages.error}
            </p>
          )}

          {view.name === "list" && (
            <ConversationList
              messages={messages}
              myId={myId}
              onNew={() => setView({ name: "new" })}
              onOpen={(id) => setView({ name: "thread", id })}
            />
          )}
          {view.name === "new" && (
            <NewConversation
              tableId={tableId}
              people={messages.people}
              myId={myId}
              onOpen={(id) => setView({ name: "thread", id })}
            />
          )}
          {view.name === "thread" && (
            <ConversationThread
              // Fresh for each conversation opened.
              key={view.id}
              conversationId={view.id}
              conversation={messages.conversations.find((entry) => entry.id === view.id)}
              people={messages.people}
              myId={myId}
              version={messages.version}
              onRead={messages.reload}
            />
          )}
        </aside>
      )}
    </>
  );
}

function ConversationList({ messages, myId, onNew, onOpen }) {
  const { conversations, people } = messages;
  return (
    <div className="table-messages__body">
      <button type="button" className="table-messages__new" onClick={onNew}>
        + New message
      </button>
      {conversations.length === 0 ? (
        <p className="table-messages__empty">
          No messages yet. Send a secret note to one person, a few, or the whole party: only the
          people you pick can read it.
        </p>
      ) : (
        <ul className="table-messages__list">
          {conversations.map((conversation) => {
            const last = conversation.lastMessage;
            const title = conversationTitle(conversation, people, myId);
            const preview = last
              ? `${personName(people, last.sender_id, myId)}: ${last.body || "Sent a picture"}`
              : "No messages yet";
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={`table-messages__row${conversation.unread > 0 ? " table-messages__row--unread" : ""}`}
                  // Read as one sentence: "DM. DM: Meet me later. 2 new".
                  aria-label={[title, preview, conversation.unread > 0 && `${conversation.unread} new`]
                    .filter(Boolean)
                    .join(". ")}
                  onClick={() => onOpen(conversation.id)}
                >
                  {/* A wax seal marks unread conversations. */}
                  {conversation.unread > 0 && <span className="table-messages__seal" aria-hidden="true" />}
                  <span className="table-messages__row-title">{title}</span>
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

function NewConversation({ tableId, people, myId, onOpen }) {
  const [everyone, setEveryone] = useState(false);
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const others = people.filter((person) => person.userId !== myId);
  const canStart = everyone || picked.length > 0;

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
          <p className="table-messages__empty">Nobody else is at this table yet.</p>
        )}
      </fieldset>
      {!everyone && picked.length > 0 && (
        <p className="table-messages__privacy">
          Only you and {picked.map((id) => personName(people, id, myId)).join(", ")} will see it
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
