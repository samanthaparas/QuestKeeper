import { useState } from "react";
import "./RollHistory.css";

const FILTERS = [
  ["all", "All rolls"],
  ["check", "d20 rolls"],
  ["damage", "Damage"],
];

// "3:42 PM" today, "Oct 17, 3:42 PM" on another day.
function formatWhen(at, now = new Date()) {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return time;
  const day = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${day}, ${time}`;
}

// The Rolls tab: every roll made on this sheet (the last 100, newest first),
// so a roll that flashed by can be looked at again, with its dice and any extra
// damage added to it.
//
// history: [{ id, at, kind, label, total, detail, isNatural20, isNatural1,
//             isCrit, extras: [{ label, total }] }]
// onClear(): forget them all.
function RollHistory({ history = [], onClear }) {
  const [filter, setFilter] = useState("all");
  const shown = filter === "all" ? history : history.filter((roll) => roll.kind === filter);

  function handleClear() {
    if (window.confirm("Clear your roll history? This can't be undone.")) onClear();
  }

  return (
    <section className="roll-history" aria-labelledby="roll-history-title">
      <div className="roll-history__head">
        <h2 id="roll-history-title" className="roll-history__title">
          Your rolls
        </h2>
        {history.length > 0 && (
          <button type="button" className="roll-history__clear" onClick={handleClear}>
            Clear history
          </button>
        )}
      </div>

      <p className="roll-history__note">
        The last 100 rolls you made on this sheet, newest first. They&apos;re saved on this device.
      </p>

      {history.length === 0 ? (
        <p className="roll-history__empty">
          No rolls yet. Tap any underlined number on your sheet to roll it, and it shows up here.
        </p>
      ) : (
        <>
          <div className="roll-history__filters" role="group" aria-label="Show">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="roll-history__filter"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="roll-history__empty">Nothing here for that filter yet.</p>
          ) : (
            <ol className="roll-history__list">
              {shown.map((roll) => (
                <li className="roll-history__item" key={roll.id}>
                  <div className="roll-history__main">
                    <p className="roll-history__label">
                      {roll.label}
                      {roll.isNatural20 && <span className="roll-history__chip roll-history__chip--good">Natural 20</span>}
                      {roll.isNatural1 && <span className="roll-history__chip roll-history__chip--bad">Natural 1</span>}
                      {roll.isCrit && <span className="roll-history__chip roll-history__chip--good">Critical</span>}
                    </p>
                    <p className="roll-history__detail">{roll.detail}</p>
                    {roll.extras?.map((extra, index) => (
                      <p className="roll-history__extra" key={index}>
                        ✓ {extra.label} added: +{extra.total}
                      </p>
                    ))}
                    <p className="roll-history__when">{formatWhen(roll.at)}</p>
                  </div>
                  <p className="roll-history__total" aria-label={`Total ${roll.total}`}>
                    {roll.total}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

export default RollHistory;
