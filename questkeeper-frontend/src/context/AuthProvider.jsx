import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { openedFromRecoveryLink, supabase } from "../utils/supabaseClient";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // They opened a reset-password link: the login page shows "Choose a new
  // password" until it's done (see AuthPage).
  const [isRecovering, setIsRecovering] = useState(openedFromRecoveryLink);
  const navigate = useNavigate();

  useEffect(() => {
    if (isRecovering) navigate("/login", { replace: true });
  }, [isRecovering, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") setIsRecovering(true);
        setUser(session?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isRecovering, finishRecovery: () => setIsRecovering(false) }}
    >
      {children}
    </AuthContext.Provider>
  );
}
