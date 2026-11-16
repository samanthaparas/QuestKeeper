import { useState } from "react";
import { addJournalEntry } from "../../utils/journalStore";
import Button from "../Button/Button";
import "./FightSummaryCard.css";

// DM only, after a fight ends: a short summary built from the activity log
// (see utils/fightSummary.js). The DM can change the words, then post it to
// the table's journal for everyone, or skip it. Nothing is posted by itself.
//
// summary: the starting text. onDone(): hides the card.
// tableName: shown in the title on the DM Screen list, where there can be
// several tables.
function FightSummaryCard({ tableId, summary, onDone, tableName = "" }) {
  const [text, setText] = useState(summary);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function post() {
    setError("");
    setIsBusy(true);
    try {
      await addJournalEntry(tableId, { body: text, visibility: "table" });
      onDone();
    } catch (postError) {
      setError(postError.message ?? "Could not post that.");
      setIsBusy(false);
    }
  }

  return (
    <section className="fight-summary" aria-labelledby={`fight-summary-title-${tableId}`}>
      <h3 id={`fight-summary-title-${tableId}`} className="fight-summary__title">
        Fight summary{tableName ? ` · ${tableName}` : ""}
      </h3>
      <p className="fight-summary__note">
        Made from the activity log. Change anything you like, then post it to the journal for the whole table.
      </p>
      <textarea
        className="fight-summary__text"
        aria-label="Fight summary"
        rows={Math.min(10, text.split("\n").length + 1)}
        maxLength={4000}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {error && (
        <p className="fight-summary__error" role="alert">
          {error}
        </p>
      )}
      <div className="fight-summary__buttons">
        <Button disabled={isBusy || !text.trim()} onClick={post}>
          {isBusy ? "Posting…" : "Post to the journal"}
        </Button>
        <Button variant="secondary" disabled={isBusy} onClick={onDone}>
          Skip
        </Button>
      </div>
    </section>
  );
}

export default FightSummaryCard;
