import "./SaveStatus.css";

// A short, calm line at the top of a character sheet whenever something other
// than "everything is saved" is going on. It says nothing at all when all is
// well, so it never adds noise.
//
// status: from useSaveQueue ("saved" | "saving" | "waiting" | "signed-out" |
// "not-allowed").
// isOfflineCopy: the sheet shown is the copy kept on this device, because
// QuestKeeper couldn't be reached. recovered: changes from an earlier visit
// that hadn't saved were brought back. onRetry(): try saving now.
// onReload(): try opening the real sheet again (offline copy).
// conflict: the sheet changed on another device while edits were waiting;
// onKeepMine() / onUseSaved() choose which version to keep.
function SaveStatus({ status = "saved", isOfflineCopy = false, recovered = false, conflict = false, onRetry, onReload, onKeepMine, onUseSaved }) {
  if (conflict) {
    return (
      <div className="save-status save-status--warning" role="alert">
        <p className="save-status__text">
          This sheet was changed on another device while your edits were waiting to save. Which version do you want to keep?
        </p>
        <button type="button" className="save-status__button" onClick={onKeepMine}>
          Keep my changes
        </button>
        <button type="button" className="save-status__button" onClick={onUseSaved}>
          Use the saved version
        </button>
      </div>
    );
  }

  const lines = [];
  if (isOfflineCopy) {
    lines.push(
      "Can't reach QuestKeeper right now, so this is the copy saved on this device. Keep playing: your changes are kept and save once you're back online.",
    );
  } else if (recovered && status !== "saved") {
    lines.push("Changes from last time hadn't saved. They're back, and saving now.");
  }

  if (status === "waiting") {
    lines.push("Not saved yet. Your changes are kept on this device and will save as soon as the connection is back.");
  } else if (status === "signed-out") {
    lines.push("You're signed out, so changes can't save yet. Log in again and they will. They're kept on this device.");
  } else if (status === "not-allowed") {
    lines.push("This change can't be saved: only the player who owns this character can change it.");
  }

  if (lines.length === 0 && !(status === "saving" && recovered)) return null;

  const isWarning = status === "waiting" || status === "signed-out" || status === "not-allowed" || isOfflineCopy;
  return (
    <div className={`save-status${isWarning ? " save-status--warning" : ""}`} role="status" aria-live="polite">
      <p className="save-status__text">{lines.join(" ")}</p>
      {status === "waiting" && onRetry && (
        <button type="button" className="save-status__button" onClick={onRetry}>
          Try now
        </button>
      )}
      {isOfflineCopy && status === "saved" && onReload && (
        <button type="button" className="save-status__button" onClick={onReload}>
          Try again
        </button>
      )}
    </div>
  );
}

export default SaveStatus;
