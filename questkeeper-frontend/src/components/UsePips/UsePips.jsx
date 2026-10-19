import { useState } from "react";
import "./UsePips.css";

// Above this many uses, pips get hard to count, so a number box is better.
export const MAX_PIPS = 12;

// Limited uses as a row of pips: lit ones are left, dim ones are used. Tap
// a lit pip to spend one, a dim one to get one back. When several come back
// at once (a long rest), they light up one after another.
//
// label: what they are, for screen readers ("Level 1 spell slots").
// onChange(newCurrent)
// compact: pips and a short "3/4" count on one line (spell slot chips).
function UsePips({ label, current, max, onChange, compact = false }) {
  const left = Math.max(0, Math.min(current ?? 0, max));
  // The count before this change, so newly lit pips can sweep in order.
  const [seen, setSeen] = useState({ left, from: left });
  if (seen.left !== left) setSeen({ left, from: seen.left });
  const from = seen.from;

  return (
    <div className={`use-pips${compact ? " use-pips--compact" : ""}`}>
      <div className="use-pips__row" role="group" aria-label={`${label}: ${left} of ${max} left`}>
        {Array.from({ length: max }, (_, index) => {
          const lit = index < left;
          // Only pips that just changed move: newly lit ones light up in
          // turn, 50ms apart; just-spent ones puff out.
          const fresh = lit && index >= from;
          const spent = !lit && index < from;
          const delay = fresh ? (index - from) * 50 : 0;
          return (
            <button
              key={index}
              type="button"
              className={`use-pips__pip${lit ? " use-pips__pip--lit" : " use-pips__pip--used"}${
                fresh ? " use-pips__pip--fresh" : ""
              }${spent ? " use-pips__pip--spent" : ""}`}
              style={delay ? { "--pip-delay": `${delay}ms` } : undefined}
              aria-label={lit ? `Spend one (${left} of ${max} left)` : `Get one back (${left} of ${max} left)`}
              onClick={() => onChange(lit ? left - 1 : left + 1)}
            />
          );
        })}
      </div>
      <span className="use-pips__count">
        {compact ? `${left}/${max}` : `${left} of ${max} left`}
      </span>
    </div>
  );
}

export default UsePips;
