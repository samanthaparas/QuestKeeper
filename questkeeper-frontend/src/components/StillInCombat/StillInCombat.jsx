import { Link } from "react-router-dom";
import Button from "../Button/Button";
import "./StillInCombat.css";

// "⏳ Still in combat?": reminds the DM about a fight left open after the
// session. Shown on the DM Screen list (with a link to the table) and on the
// table's own DM screen (with Keep fighting).
//
// tableName: shown on the list, where there may be several tables.
// quiet: how long nothing has happened, like "6 days".
// onEnd(): ends the fight. openTo: the table's link (list only).
// onKeep(): hides the reminder for this visit (table screen only).
function StillInCombat({ tableName, quiet, onEnd, openTo, onKeep, isBusy = false }) {
  return (
    <section className="still-in-combat" aria-label="Still in combat?">
      <p className="still-in-combat__title">
        <span aria-hidden="true">⏳</span> Still in combat?
      </p>
      <p className="still-in-combat__text">
        {tableName ? <strong>{tableName}</strong> : "This table"} has a fight open, and nothing has happened in
        it for {quiet}. If the session is over, end it so everyone&apos;s screens go back to normal.
      </p>
      <div className="still-in-combat__buttons">
        <Button onClick={onEnd} disabled={isBusy}>
          {isBusy ? "Ending…" : "End combat"}
        </Button>
        {openTo && (
          <Link className="qk-button qk-button--secondary" to={openTo}>
            Open table
          </Link>
        )}
        {onKeep && (
          <Button variant="secondary" onClick={onKeep}>
            Keep fighting
          </Button>
        )}
      </div>
    </section>
  );
}

export default StillInCombat;
