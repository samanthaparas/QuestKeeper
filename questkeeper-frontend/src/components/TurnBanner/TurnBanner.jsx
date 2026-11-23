import { useEffect, useRef, useState } from "react";
import { useStickyHeight } from "../../hooks/useStickyHeight";
import { resolveDamageRequest, setMyAway } from "../../utils/tableStore";
import { describeUpcoming } from "../../utils/initiative";
import { eventTone } from "../../utils/tableGuidance";
import Button from "../Button/Button";
import TurnHeadsUp from "../TurnHeadsUp/TurnHeadsUp";
import "./TurnBanner.css";

// How long the "Applied 14 damage" confirmation stays before it tidies itself away.
export const APPLIED_NOTE_MS = 15000;

// Sits at the top of a player's character sheet while their table is in combat.
// `combat` comes from useTableTurn; `onApplyDamage` lowers this character's HP.
//
// One quiet row at every size: the round and whose turn it is, "You're
// next" when it's true, End my turn on your turn, Step away, and Details.
// The table name, the turn order, the attack count and the latest news open
// under Details (the news is still read out while it's closed). Anything
// that needs you stays in view: being away (with Return to play) and damage
// to apply.
function TurnBanner({ combat, onApplyDamage }) {
  const [error, setError] = useState("");
  const [appliedNote, setAppliedNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  // Its height, for the page's scroll padding (see useStickyHeight).
  const wrapRef = useRef(null);
  useStickyHeight(wrapRef, "--qk-sticky-top", Boolean(combat));

  // The "Applied …" line is just a confirmation: it goes away by itself after
  // 15 seconds so it doesn't keep taking up space on the sheet.
  useEffect(() => {
    if (!appliedNote) return undefined;
    const timer = setTimeout(() => setAppliedNote(""), APPLIED_NOTE_MS);
    return () => clearTimeout(timer);
  }, [appliedNote]);

  if (!combat) return null;

  const { now, next, isMyTurn, latestEvent, damageRequests } = combat;
  const tone = latestEvent ? eventTone(latestEvent, combat.combatants) : "";
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

  // "Step away" / "Return to play": away players' turns are skipped.
  async function handleAway(away) {
    setError("");
    try {
      await setMyAway(combat.table.id, away);
      combat.refresh();
    } catch (awayError) {
      setError(awayError.message ?? "Could not change that.");
    }
  }

  const isAway = Boolean(combat.myCombatant?.away);

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

  // "Your turn, Pippa" / "Ash's turn".
  const turnText = isMyTurn
    ? `Your turn${combat.myCombatant?.name ? `, ${combat.myCombatant.name}` : ""}`
    : now
      ? `${now.name}'s turn`
      : "Combat has started";

  return (
    <div className="turn-banner-wrap" ref={wrapRef}>
      <div
        id="turn-banner"
        className={`turn-banner${isMyTurn ? " turn-banner--mine" : ""}${isNextUp ? " turn-banner--soon" : ""}${
          showDetails ? " turn-banner--details-open" : ""
        }`}
        role="status"
        aria-live="polite"
      >
        {/* The one row that's always there: where the fight is, whether
            you're up next, and what you can do. */}
        <div className="turn-banner__main">
          <span className="turn-banner__where">
            <span className="turn-banner__round">Round {combat.round}</span>
            <span className="turn-banner__dot" aria-hidden="true">
              ·
            </span>
            <span className="turn-banner__now">{turnText}</span>
          </span>
          {isNextUp && <span className="turn-banner__ready">You&apos;re next</span>}
          <TurnHeadsUp isMyTurn={isMyTurn} isNext={isNextUp} />
          <span className="turn-banner__actions">
            {isMyTurn && combat.endTurn && (
              <Button variant="secondary" className="turn-banner__end" onClick={handleEndTurn}>
                End my turn
              </Button>
            )}
            {combat.myCombatant && !isAway && (
              <Button
                variant="secondary"
                className="turn-banner__end"
                aria-describedby="turn-banner-away-help"
                onClick={() => handleAway(true)}
              >
                Step away
              </Button>
            )}
            <button
              type="button"
              className="turn-banner__details-toggle"
              aria-expanded={showDetails}
              aria-controls="turn-banner-details"
              onClick={() => setShowDetails((open) => !open)}
            >
              {showDetails ? "Hide details" : "Details"}
              <span aria-hidden="true">{showDetails ? " ▴" : " ▾"}</span>
            </button>
          </span>
        </div>

        {/* Away: always in view, with the way back. */}
        {isAway && (
          <div className="turn-banner__away-row">
            <span className="turn-banner__away">You&apos;re away: your turns are skipped until you return.</span>
            {combat.myCombatant && (
              <Button variant="secondary" className="turn-banner__end" onClick={() => handleAway(false)}>
                Return to play
              </Button>
            )}
          </div>
        )}

        {/* Details: the table, the turn order, the attack count and the news. */}
        <div className="turn-banner__details" id="turn-banner-details" hidden={!showDetails}>
          {combat.tableName && (
            <span className="turn-banner__table">
              Playing at <strong>{combat.tableName}</strong>
            </span>
          )}
          {combat.activeTables?.length > 1 && (
            <label className="turn-banner__switch">
              <span className="turn-banner__switch-label">Switch table</span>
              <select value={combat.table.id} onChange={(event) => combat.switchTable(event.target.value)}>
                {combat.activeTables.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {upcomingText && <span className="turn-banner__next">{upcomingText}</span>}
          {now && now.kind === "player" && now.attacks_this_turn > 0 && (
            <span className="turn-banner__attacks">
              {isMyTurn ? "You have" : `${now.name} has`} attacked {now.attacks_this_turn}{" "}
              {now.attacks_this_turn === 1 ? "time" : "times"} this turn
            </span>
          )}
          {combat.myCombatant && (
            <span className="turn-banner__help" id="turn-banner-away-help">
              Step away skips your turns until you return to play.
            </span>
          )}
        </div>

        {/* The latest news: red for damage, green for healing or a fallen
            enemy. Shown with Details; while Details is closed it's hidden
            from view but still read out, so it's never silent. */}
        {latestEvent && (
          <span
            className={`turn-banner__event${tone ? ` turn-banner__event--${tone}` : ""}${
              showDetails ? "" : " turn-banner__event--quiet"
            }`}
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
