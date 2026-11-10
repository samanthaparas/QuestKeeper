import { useState } from "react";
import { REACTIONS, describeNames } from "../../utils/journalReactions";

// The reactions under one journal note: a small chip per reaction given
// ("❤️ 2"), and a "React" button that opens the five choices. Tap a chip or a
// choice to add yours; tap your own again to take it back.
//
// summary: from summarizeReactions(). canReact: false on your own note (you
// can still see who reacted, but not react). onToggle(emoji): add or take back.
function JournalReactions({ summary, canReact, onToggle }) {
  const [isPicking, setIsPicking] = useState(false);
  if (summary.length === 0 && !canReact) return null;

  return (
    <div className="journal-reactions">
      {summary.length > 0 && (
        <ul className="journal-reactions__list" aria-label="Reactions">
          {summary.map(({ emoji, label, count, mine, names }) => {
            const who = describeNames(names);
            const text = `${label}: ${count}, from ${who}`;
            return (
              <li key={emoji}>
                {canReact ? (
                  <button
                    type="button"
                    className={`journal-reactions__chip${mine ? " journal-reactions__chip--mine" : ""}`}
                    aria-pressed={mine}
                    aria-label={`${text}. ${mine ? "Tap to take yours back" : "Tap to add yours"}`}
                    title={who}
                    onClick={() => onToggle(emoji)}
                  >
                    <span aria-hidden="true">{emoji}</span> {count}
                  </button>
                ) : (
                  <span className="journal-reactions__chip" title={who} aria-label={text}>
                    <span aria-hidden="true">{emoji}</span> {count}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canReact && (
        <>
          <button
            type="button"
            className="journal-reactions__add"
            aria-expanded={isPicking}
            onClick={() => setIsPicking((open) => !open)}
          >
            {isPicking ? "Close" : "React"}
          </button>
          {isPicking && (
            <span className="journal-reactions__picker" role="group" aria-label="Pick a reaction">
              {REACTIONS.map(({ emoji, label }) => {
                const mine = summary.some((given) => given.emoji === emoji && given.mine);
                return (
                  <button
                    key={emoji}
                    type="button"
                    className={`journal-reactions__choice${mine ? " journal-reactions__choice--mine" : ""}`}
                    aria-pressed={mine}
                    aria-label={label}
                    title={label}
                    onClick={() => {
                      onToggle(emoji);
                      setIsPicking(false);
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export default JournalReactions;
