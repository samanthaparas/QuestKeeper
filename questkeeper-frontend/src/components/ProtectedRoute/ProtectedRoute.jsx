import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { rememberDestination } from "../../utils/continueAfterLogin";
import StatusNote from "../StatusNote/StatusNote";

// How long the sign-in check can take before we say so. Most checks finish
// well inside this, and a note that flashes up and vanishes is worse than none.
const SHOW_WAITING_AFTER_MS = 250;

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [showWaiting, setShowWaiting] = useState(false);

  useEffect(() => {
    if (!isLoading) return undefined;
    const timer = setTimeout(() => setShowWaiting(true), SHOW_WAITING_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setShowWaiting(false);
    };
  }, [isLoading]);

  if (isLoading) {
    // Nothing at first; a calm note only if the check is taking a moment.
    return showWaiting ? (
      <main className="status-note-page">
        <StatusNote variant="loading">Checking your sign-in…</StatusNote>
      </main>
    ) : null;
  }
  // Remember where they were going (e.g. an invite link, with its ?code=),
  // and anything it carried (a character quiz build), for after login: in
  // this tab's history, and on this device in case they reload or confirm
  // their email in a new tab (see continueAfterLogin.js).
  if (!user) {
    const destination = { from: `${location.pathname}${location.search}`, fromState: location.state ?? null };
    rememberDestination(destination);
    return <Navigate to="/login" replace state={destination} />;
  }

  return children;
}

export default ProtectedRoute;
