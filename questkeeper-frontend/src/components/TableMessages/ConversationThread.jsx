import { useEffect, useRef, useState } from "react";
import {
  getMessageImageUrl,
  listMessages,
  markConversationRead,
  sendMessage,
  uploadMessageImage,
  validateMessageImage,
} from "../../utils/messageStore";
import { messageTime, personName, whoCanSee } from "./messageLabels";

// One conversation: its messages (yours on the right), who can see it, and
// a box to write in, with an optional picture (a map, a handout).
//
// version: goes up when any new message arrives at the table, so this
// fetches again. onRead: called after marking it read (to clear the badge).
function ConversationThread({ conversationId, conversation, people, myId, version, onRead }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  // Messages that were unread when it opened get a small "unsealing" flourish.
  const [unreadWhenOpened] = useState(() => conversation?.unread ?? 0);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    listMessages(conversationId)
      .then((found) => {
        if (ignore) return;
        setMessages(found);
        setIsLoading(false);
        markConversationRead(conversationId).then(onRead).catch(() => {});
      })
      .catch(() => !ignore && setError("Couldn't load this conversation."));
    return () => {
      ignore = true;
    };
    // onRead only refreshes the list; a new one shouldn't refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, version]);

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length]);

  function chooseFile(event) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    const problem = validateMessageImage(chosen);
    setError(problem ?? "");
    setFile(problem ? null : chosen);
  }

  async function handleSend(event) {
    event?.preventDefault();
    if (!text.trim() && !file) return;
    setIsSending(true);
    setError("");
    try {
      const imagePath = file ? await uploadMessageImage(conversationId, file) : null;
      await sendMessage(conversationId, { body: text, imagePath });
      setText("");
      setFile(null);
      setMessages(await listMessages(conversationId));
    } catch (sendError) {
      setError(sendError.message ?? "Couldn't send that. Try again.");
    } finally {
      setIsSending(false);
    }
  }

  const firstNew = messages.length - unreadWhenOpened;

  return (
    <div className="table-messages__thread">
      {conversation && <p className="table-messages__privacy">{whoCanSee(conversation, people, myId)}</p>}

      <ol className="table-messages__messages" aria-label="Messages">
        {isLoading && <li className="table-messages__empty">Loading...</li>}
        {!isLoading && messages.length === 0 && (
          <li className="table-messages__empty">Nothing here yet. Say hello, or share a map.</li>
        )}
        {messages.map((message, index) => {
          const mine = message.sender_id === myId;
          return (
            <li
              key={message.id}
              className={`table-messages__message${mine ? " table-messages__message--mine" : ""}${
                index >= firstNew && !mine ? " table-messages__message--new" : ""
              }`}
            >
              <span className="table-messages__meta">
                {personName(people, message.sender_id, myId)} · {messageTime(message.created_at)}
              </span>
              {message.image_path && <MessageImage path={message.image_path} />}
              {message.body && <p className="table-messages__text">{message.body}</p>}
            </li>
          );
        })}
        <li ref={endRef} aria-hidden="true" />
      </ol>

      <form className="table-messages__composer" onSubmit={handleSend}>
        {error && (
          <p className="table-messages__error" role="alert">
            {error}
          </p>
        )}
        {file && (
          <p className="table-messages__attached">
            Picture: {file.name}{" "}
            <button type="button" className="table-messages__link" onClick={() => setFile(null)}>
              Remove
            </button>
          </p>
        )}
        <textarea
          className="table-messages__input"
          aria-label="Your message"
          placeholder="Write a secret message..."
          rows={2}
          maxLength={2000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          // Enter sends; Shift+Enter starts a new line.
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) handleSend(event);
          }}
        />
        <div className="table-messages__actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="table-messages__file"
            aria-label="Add a picture"
            onChange={chooseFile}
          />
          <button type="button" className="table-messages__secondary" onClick={() => fileRef.current?.click()}>
            Add a picture
          </button>
          <button
            type="submit"
            className="table-messages__primary"
            disabled={isSending || (!text.trim() && !file)}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

// A picture from a message, fetched through a private, short-lived link.
// Tapping it opens the full size in a new tab.
function MessageImage({ path }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    getMessageImageUrl(path)
      .then((found) => !ignore && setUrl(found))
      .catch(() => !ignore && setFailed(true));
    return () => {
      ignore = true;
    };
  }, [path]);

  if (failed) return <p className="table-messages__empty">Couldn't load this picture.</p>;
  if (!url) return <p className="table-messages__empty">Loading picture...</p>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="table-messages__image-link">
      <img className="table-messages__image" src={url} alt="Shared picture (opens full size)" />
    </a>
  );
}

export default ConversationThread;
