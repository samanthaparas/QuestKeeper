import { useEffect, useId, useRef, useState } from "react";
import "./CalcHint.css";

// A small "worked out for you" mark beside a number the sheet calculates
// (AC from armor, Initiative from Dexterity), in place of the word "auto".
// Tap, click or press Enter on it to read how; Escape or a tap elsewhere
// closes it. It explains only: the number can still be typed over as before.
//
// <CalcHint label="How AC is worked out">Worked out from your armor...</CalcHint>
function CalcHint({ label, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointer(event) {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open]);

  return (
    <span
      className="calc-hint"
      ref={wrapRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="calc-hint__button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        {/* A tiny calculator. */}
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
          <rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
      <span id={id} role="note" className="calc-hint__note" hidden={!open}>
        {children}
      </span>
    </span>
  );
}

export default CalcHint;
