import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { rememberDestination } from "../../utils/continueAfterLogin";

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
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
