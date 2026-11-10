import { useEffect, useState } from "react";
import { resolveDamageRequest } from "../../utils/tableStore";
import { describeUpcoming } from "../../utils/initiative";
import { eventTone } from "../../utils/tableGuidance";
import Button from "../Button/Button";
import TurnHeadsUp from "../TurnHeadsUp/TurnHeadsUp";
import "./TurnBanner.css";

// How long the "Applied 14 damage" confirmation stays before it tidies itself away.
export const APPLIED_NOTE_MS = 15000;

// Sits at the top of a player's character sheet while their table is in combat.
// `combat` comes from useTableTurn; `onApplyDamage` lowers this character's HP.
function TurnBanner({ combat, onApplyDamage }) {
  const [error, setError] = useState("");
  const [appliedNote, setAppliedNote] = useState("");

  // The "Applied …" line is just a confirmation: it goes away by itself after
  // 15 seconds so it doesn't keep taking up space on the sheet.
  useEffect(() => {
    if (!appliedNote) return undefined;
    const timer = setTimeout(() => setAppliedNote(""), APPLIED_NOTE_MS);
    return () => clearTimeout(timer);
  }, [appliedNote]);

  if (!combat) return null;

  const { now, next, isMyTurn, latestEvent, damageRequests } = combat;
  const upcomingText = describeUpcoming(
    combat.upcoming ?? (next ? [next] : []),
    combat.myCombatant?.id,
  );
  // This player goes after whoever is going now: time to plan their move.
  const isNextUp = Boolean(combat.myCombatant && next && next.id === combat.myCombatant.id && !isMyTurn);

  async function handleEndTurn() {
    setError("");
    try {
      await combat.endTurn();
    } catch (endError) {
      setError(endError.message ?? "Could not end your turn.");
    }
  }

  async function handleDamageRequest(request, shouldApply) {
    setError("");
    try {
      // Mark it handled first, so tapping twice can never apply it twice.
      const amount = await resolveDamageRequest(request.id, shouldApply);
      setAppliedNote(shouldApply ? (onApplyDamage(amount) ?? "") : "");
      combat.refresh();
    } catch (requestError) {
      setError(requestError.message ?? "Could not update that.");
    }
  }

  return (
    <div className="turn-banner-wrap">
      <div
        className={`turn-banner${isMyTurn ? " turn-banner--mine" : ""}${isNextUp ? " turn-banner--soon" : ""}`}
        role="status"
        aria-live="polite"
      >
        {combat.tableName && (
          <span className="turn-banner__table">
            Playing at <strong>{combat.tableName}</strong>
          </span>
        )}
        {combat.activeTables?.length > 1 && (
          <label className="turn-banner__switch">
            <span className="turn-banner__switch-label">Switch table</span>
            <select
              value={combat.table.id}
              onChange={(event) => combat.switchTable(event.target.value)}
            >
              {combat.activeTables.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="turn-banner__round">Round {combat.round}</span>
        <span className="turn-banner__now">
          {isMyTurn ? "It's your turn!" : now ? `Now: ${now.name}` : "Combat has started"}
        </span>
        {now && now.kind === "player" && now.attacks_this_turn > 0 && (
          <span className="turn-banner__attacks">
            {isMyTurn ? "You have" : `${now.name} has`} attacked {now.attacks_this_turn}{" "}
            {now.attacks_this_turn === 1 ? "time" : "times"} this turn
          </span>
        )}
        {upcomingText && <span className="turn-banner__next">{upcomingText}</span>}
        {isNextUp && <span className="turn-banner__ready">Get ready: plan your move.</span>}
        <TurnHeadsUp isMyTurn={isMyTurn} isNext={isNextUp} />
        {isMyTurn && combat.endTurn && (
          <Button variant="secondary" className="turn-banner__end" onClick={handleEndTurn}>
            End my turn
          </Button>
        )}
        {/* The latest news: red for damage, green for healing. */}
        {latestEvent && (
          <span
            className={`turn-banner__event${eventTone(latestEvent) ? ` turn-banner__event--${eventTone(latestEvent)}` : ""}`}
          >
            {latestEvent.message}
          </span>
        )}
      </div>

      {damageRequests.map((request) => (
        <div className="turn-banner__damage" key={request.id} role="alert">
          <span>
            {request.source} hits you for <strong>{request.amount}</strong>!
          </span>
          <Button onClick={() => handleDamageRequest(request, true)}>
            Apply {request.amount} damage
          </Button>
          <Button variant="secondary" onClick={() => handleDamageRequest(request, false)}>
            Dismiss
          </Button>
        </div>
      ))}

      {appliedNote && (
        <p className="turn-banner__applied" role="status">
          {appliedNote}
        </p>
      )}

      {error && (
        <p className="turn-banner__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default TurnBanner;
