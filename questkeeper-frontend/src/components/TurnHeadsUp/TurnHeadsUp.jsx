import { useEffect } from "react";
import { getHeadsUpPreference } from "../../utils/turnHeadsUp";

// A quiet heads-up for a player in a fight, so nobody misses their turn while
// looking at another tab or app: when they're next (or it's their turn now),
// the phone gives one short buzz (if it can), and while this tab is hidden its
// title says so ("🎲 Your turn · QuestKeeper"). No sound and no pop-up
// permission. Each player can turn it off in Settings (kept on this device).
//
// Draws nothing. isMyTurn / isNext: from the table's turn order.

const TITLES = { turn: "🎲 Your turn", next: "🎲 You're up next" };

function TurnHeadsUp({ isMyTurn = false, isNext = false, enabled = true }) {
  const state = !enabled || !getHeadsUpPreference() ? "none" : isMyTurn ? "turn" : isNext ? "next" : "none";

  useEffect(() => {
    if (state === "none") return undefined;

    // One buzz when it becomes true: short for "next", two for "your turn".
    try {
      navigator.vibrate?.(state === "turn" ? [200, 100, 200] : [150]);
    } catch {
      // Not every device can; the banner still says it.
    }

    // While the tab is hidden, the title carries the message; it goes back
    // when the player returns, or when the state changes.
    const original = document.title;
    function paint() {
      document.title = document.hidden ? `${TITLES[state]} · ${original}` : original;
    }
    paint();
    document.addEventListener("visibilitychange", paint);
    return () => {
      document.removeEventListener("visibilitychange", paint);
      document.title = original;
    };
  }, [state]);

  return null;
}

export default TurnHeadsUp;
