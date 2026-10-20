import { useEffect, useRef, useState } from "react";
import {
  getMessageImageUrl,
  listMessages,
  markConversationRead,
  sendMessage,
  uploadMessageImage,
  validateMessageImage,
} from "../../utils/messageStore";
import { messageTime, personName, readReceipt, whoCanSee } from "./messageLabels";
import ImageLightbox from "../ImageLightbox/ImageLightbox";
import { shrinkImage } from "../../utils/portraits";

// How often to look again while your latest message hasn't been seen by
// everyone yet, so "Seen by" catches up soon after they open it.
const RECEIPT_CHECK_MS = 10000;

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
  // A picture being dragged over the box (it lights up to say "drop here").
  const [isDragging, setIsDragging] = useState(false);
  // A preview of the attached picture, shown before sending.
  const [preview, setPreview] = useState(null);
  // Messages that were unread when it opened get a small "unsealing" flourish.
  const [unreadWhenOpened] = useState(() => conversation?.unread ?? 0);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  // Which messages were here when it opened, so ones that arrive while it's
  // open (from someone else) can be marked "New".
  const knownIds = useRef(null);
  const [arrivedIds, setArrivedIds] = useState(() => new Set());
  // Where the messages that were unread when it opened start (fixed at the first load).
  const [firstNew, setFirstNew] = useState(Infinity);

  useEffect(() => {
    let ignore = false;
    listMessages(conversationId)
      .then((found) => {
        if (ignore) return;
        setMessages(found);
        setIsLoading(false);
        if (!knownIds.current) setFirstNew(found.length - unreadWhenOpened);
        if (knownIds.current) {
          const fresh = found.filter((message) => !knownIds.current.has(message.id) && message.sender_id !== myId);
          if (fresh.length > 0) setArrivedIds((previous) => new Set([...previous, ...fresh.map((message) => message.id)]));
        }
        knownIds.current = new Set(found.map((message) => message.id));
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

  // The attached picture's preview link is let go when it's replaced.
  useEffect(() => {
    if (!preview) return undefined;
    return () => URL.revokeObjectURL?.(preview);
  }, [preview]);

  // Attaches a picture (or clears it), with its preview.
  function setAttached(next) {
    setFile(next);
    setPreview(next && typeof URL.createObjectURL === "function" ? URL.createObjectURL(next) : null);
  }

  // Your newest message and who has seen it. While someone hasn't, check
  // again every few seconds (the list refreshes on its own every 30).
  const myLatest = [...messages].reverse().find((message) => message.sender_id === myId) ?? null;
  const receipt = myLatest ? readReceipt(conversation, myLatest, people, myId) : null;
  const waitingToBeSeen = Boolean(receipt && !receipt.seenAll);
  useEffect(() => {
    if (!waitingToBeSeen || typeof onRead !== "function") return undefined;
    const timer = setInterval(onRead, RECEIPT_CHECK_MS);
    return () => clearInterval(timer);
  }, [waitingToBeSeen, onRead]);

  // Attaches a picture from the picker, a paste or a drop: big ones are
  // shrunk first, then checked.
  async function attachFile(chosen) {
    if (!chosen) return;
    setError("");
    const ready = await shrinkImage(chosen);
    const problem = validateMessageImage(ready);
    setError(problem ?? "");
    setAttached(problem ? null : ready);
  }

  function chooseFile(event) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    attachFile(chosen);
  }

  // Cmd/Ctrl+V of a screenshot attaches it. Text pastes as usual.
  function handlePaste(event) {
    const item = [...(event.clipboardData?.items ?? [])].find(
      (entry) => entry.kind === "file" && entry.type.startsWith("image/"),
    );
    if (!item) return;
    if (!event.clipboardData.getData("text")) event.preventDefault();
    attachFile(item.getAsFile());
  }

  function handleDragOver(event) {
    if (![...(event.dataTransfer?.types ?? [])].includes("Files")) return;
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDrop(event) {
    const dropped = [...(event.dataTransfer?.files ?? [])].find((entry) => entry.type.startsWith("image/"));
    setIsDragging(false);
    if (!dropped) return;
    event.preventDefault();
    attachFile(dropped);
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
      setAttached(null);
      setMessages(await listMessages(conversationId));
    } catch (sendError) {
      setError(sendError.message ?? "Couldn't send that. Try again.");
    } finally {
      setIsSending(false);
    }
  }

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
          const isNew = !mine && (index >= firstNew || arrivedIds.has(message.id));
          return (
            <li
              key={message.id}
              className={`table-messages__message${mine ? " table-messages__message--mine" : ""}${
                isNew ? " table-messages__message--new" : ""
              }`}
            >
              <span className="table-messages__meta">
                {personName(people, message.sender_id, myId)} · {messageTime(message.created_at)}
                {isNew && <span className="table-messages__new-chip"> · New</span>}
              </span>
              {message.image_path && <MessageImage path={message.image_path} />}
              {message.body && <p className="table-messages__text">{message.body}</p>}
              {/* Under your newest message: who has seen it. */}
              {mine && message.id === myLatest?.id && receipt && (
                <span className="table-messages__receipt">{receipt.text}</span>
              )}
            </li>
          );
        })}
        <li ref={endRef} aria-hidden="true" />
      </ol>

      <form
        className={`table-messages__composer${isDragging ? " table-messages__composer--dragging" : ""}`}
        onSubmit={handleSend}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {error && (
          <p className="table-messages__error" role="alert">
            {error}
          </p>
        )}
        {file && (
          <p className="table-messages__attached">
            {preview && <img className="table-messages__attached-preview" src={preview} alt="" />}
            Picture: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB){" "}
            <button type="button" className="table-messages__link" onClick={() => setAttached(null)}>
              Remove
            </button>
          </p>
        )}
        <textarea
          className="table-messages__input"
          aria-label="Your message"
          placeholder="Write a secret message... (paste or drop a screenshot to add it)"
          rows={2}
          maxLength={2000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onPaste={handlePaste}
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
    <ImageLightbox className="table-messages__image" src={url} alt="Shared picture" />
  );
}

export default ConversationThread;
