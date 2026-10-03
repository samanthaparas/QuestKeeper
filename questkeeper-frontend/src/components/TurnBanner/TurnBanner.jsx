import { useState } from "react";
import { resolveDamageRequest } from "../../utils/tableStore";
import Button from "../Button/Button";
import "./TurnBanner.css";

// Sits at the top of a player's character sheet while their table is in combat.
// `combat` comes from useTableTurn; `onApplyDamage` lowers this character's HP.
function TurnBanner({ combat, onApplyDamage }) {
  const [error, setError] = useState("");
  const [appliedNote, setAppliedNote] = useState("");

  if (!combat) return null;

  const { now, next, isMyTurn, latestEvent, damageRequests } = combat;
  const isNextMine = next && combat.myCombatant && next.id === combat.myCombatant.id;

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
        className={`turn-banner${isMyTurn ? " turn-banner--mine" : ""}`}
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
        {next && (
          <span className="turn-banner__next">
            {isNextMine ? "You're up next" : `Next: ${next.name}`}
          </span>
        )}
        {latestEvent && (
          <span className="turn-banner__event">{latestEvent.message}</span>
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
