import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  // Remember where they were going (e.g. an invite link), and anything it
  // carried (a character quiz build), for after login.
  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname, fromState: location.state ?? null }} />
    );
  }

  return children;
}

export default ProtectedRoute;
