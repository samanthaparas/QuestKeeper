import { useEffect, useRef } from "react";
import "./StatusNote.css";

// One calm look for the "waiting", "nothing here yet" and "couldn't load"
// lines on a page: a soft card with a small wax seal.
//
// variant: "loading" (read out politely), "empty" (plain note), "error"
// (read out at once, with an optional Try again button when onRetry is given).
// as: the tag to use ("li" inside a list). focusOnShow: take keyboard focus when
// it appears, for when the button that was just pressed has gone away (a retry).
function StatusNote({
  variant = "empty",
  as,
  children,
  onRetry,
  retryLabel = "Try again",
  retryRef,
  focusOnShow = false,
  className = "",
}) {
  const noteRef = useRef(null);
  useEffect(() => {
    if (focusOnShow) noteRef.current?.focus();
  }, [focusOnShow]);

  const Tag = as ?? (variant === "error" ? "div" : "p");
  const role = variant === "loading" ? "status" : variant === "error" ? "alert" : undefined;
  const classes = `status-note${variant === "empty" ? "" : ` status-note--${variant}`} ${className}`.trim();

  return (
    <Tag className={classes} role={role} ref={noteRef} tabIndex={focusOnShow ? -1 : undefined}>
      {variant === "error" ? <p>{children}</p> : children}
      {variant === "error" && onRetry && (
        <button type="button" className="status-note__retry" onClick={onRetry} ref={retryRef}>
          {retryLabel}
        </button>
      )}
    </Tag>
  );
}

export default StatusNote;
