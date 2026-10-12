import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import "./RulesText.css";

// How long the mouse rests on a word before its meaning shows, and how long
// it can wander off before it hides.
const OPEN_MS = 150;
const CLOSE_MS = 200;

// One rules word with its meaning on hover (mouse), focus (keyboard) or tap
// (phones). Esc or tapping elsewhere closes it.
//
// word: an entry from RULES_WORDS. children: the text as written.
function RuleTerm({ word, children }) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const rootRef = useRef(null);
  const tipRef = useRef(null);
  const timer = useRef(0);

  function later(next, delay) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  // Keep the tip on screen: nudge it left if it would run off the right edge.
  useLayoutEffect(() => {
    if (!open || !tipRef.current) return;
    const { right } = tipRef.current.getBoundingClientRect();
    const overflow = right - (window.innerWidth - 12);
    setShift(overflow > 0 ? -overflow : 0);
  }, [open]);

  // A tap anywhere else closes it.
  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <span
      ref={rootRef}
      className="rule-term"
      onPointerEnter={(event) => event.pointerType === "mouse" && later(true, OPEN_MS)}
      onPointerLeave={(event) => event.pointerType === "mouse" && later(false, CLOSE_MS)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="rule-term__word"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => {
          clearTimeout(timer.current);
          setOpen((value) => !value);
        }}
        onFocus={() => later(true, 0)}
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget)) later(false, CLOSE_MS);
        }}
      >
        {children}
      </button>
      {open && (
        <span
          ref={tipRef}
          id={tipId}
          role="tooltip"
          className="rule-term__tip"
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
        >
          <span className="rule-term__name">{word.name}</span>
          <span className="rule-term__meaning">{word.meaning}</span>
          <a className="rule-term__more" href="#/guide?section=rules-words">
            All rules words
          </a>
        </span>
      )}
    </span>
  );
}

export default RuleTerm;
