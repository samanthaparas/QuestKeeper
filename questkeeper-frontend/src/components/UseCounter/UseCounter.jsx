import { useEffect, useRef, useState } from "react";
import "./UseCounter.css";

// Limited uses or charges as a plain count with − and + beside it:
//   Charges  [−] 7 / 10 [+]
// The first number is what's left, the second the most there can be.
// − spends exactly one, + gives one back (to fix a slip; it isn't a rest
// and rolls nothing). − stops at 0 and + at the most; at 0 a quiet
// "Depleted" says so. Holding a button or scrolling never changes it.
//
// name: whose uses ("Staff of Flowers"); unit / units: "charge" /
// "charges". title: a short word shown before it ("Charges"), optional.
// onChange(newCurrent) saves through the sheet's own handler, so the same
// resource stays in step everywhere it shows (Inventory and Resources).
// editable: a big pool (Lay on Hands) keeps its typed number box as the
// count, so a large amount can still be set in one go.
// spendLabel / restoreLabel / countLabel: other words for screen readers
// (spell slots say "Spend one level 1 spell slot").
// compact: a little tighter, for the spell slot chips.
// aligned: uses the shared sizes (label and count widths), so trackers in
// a list (Resources, Inventory) line up in one column.
// showDepleted: false when the list shows "Depleted" in its own status
// area instead, so reaching 0 never moves the buttons.
function UseCounter({
  name,
  unit = "use",
  units = `${unit}s`,
  title = null,
  current,
  max,
  onChange,
  editable = false,
  spendLabel = null,
  restoreLabel = null,
  countLabel = null,
  compact = false,
  aligned = false,
  showDepleted = true,
}) {
  const most = Math.max(0, Number(max) || 0);
  const left = Math.max(0, Math.min(Number(current) || 0, most));
  const countWords = countLabel ?? `${left} of ${most} ${most === 1 ? unit : units} remaining`;
  // Read out only after a press here, once, so a rest that refills
  // everything doesn't read every count on the page.
  const [announcement, setAnnouncement] = useState("");
  const spendRef = useRef(null);
  const restoreRef = useRef(null);
  // Which button should take focus once the new count shows (see change).
  const pendingFocus = useRef(null);
  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target === "restore" && left === 0) restoreRef.current?.focus();
    if (target === "spend" && left === most) spendRef.current?.focus();
  }, [left, most]);

  function change(next) {
    const value = Math.max(0, Math.min(next, most));
    if (value === left) return;
    onChange(value);
    setAnnouncement(countLabel ? "" : `${value} of ${most} ${most === 1 ? unit : units} remaining`);
    // The pressed button turns off at 0 or at the most; keep the keyboard's
    // place on the other one instead of losing it.
    if (value === 0) pendingFocus.current = "restore";
    if (value === most) pendingFocus.current = "spend";
  }

  return (
    <span
      className={`use-counter${compact ? " use-counter--compact" : ""}${aligned ? " use-counter--aligned" : ""}${
        left === 0 ? " use-counter--depleted" : ""
      }`}
      role="group"
      aria-label={`${name}: ${countWords}`}
      // Keeps the count's width the same whatever the number, so the
      // buttons never move.
      style={{ "--use-counter-digits": String(most).length }}
    >
      {title && <span className="use-counter__title">{title}</span>}
      <button
        type="button"
        ref={spendRef}
        className="use-counter__button"
        aria-label={spendLabel ?? `Spend one ${unit} from ${name}`}
        disabled={left <= 0}
        onClick={() => change(left - 1)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
          <path d="M3 8h10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <span className="use-counter__count">
        {editable ? (
          <input
            type="number"
            className="use-counter__input"
            aria-label={`${name} ${units} remaining`}
            value={current}
            min={0}
            max={most}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <span className="use-counter__left" aria-hidden="true">
            {left}
          </span>
        )}
        <span className="use-counter__of" aria-hidden="true">
          {" "}
          / {most}
        </span>
      </span>
      <button
        type="button"
        ref={restoreRef}
        className="use-counter__button"
        aria-label={restoreLabel ?? `Restore one ${unit} to ${name}`}
        disabled={left >= most}
        onClick={() => change(left + 1)}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
          <path d="M3 8h10M8 3v10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {showDepleted && left === 0 && <span className="use-counter__depleted">Depleted</span>}
      <span className="use-counter__announce" aria-live="polite">
        {announcement}
      </span>
    </span>
  );
}

export default UseCounter;
