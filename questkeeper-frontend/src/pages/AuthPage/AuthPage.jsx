import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signIn, signUp } from "../../utils/auth";
import {
  clearDestination,
  describeDestination,
  readDestination,
  rememberDestination,
  safeDestination,
} from "../../utils/continueAfterLogin";
import Button from "../../components/Button/Button";
import "./AuthPage.css";

// Log in or sign up. It says why an account is needed and what happens
// next, and takes the player back to where they were headed (with their
// quiz build) once they're in, even after a reload or after confirming
// their email in another tab (see continueAfterLogin.js).
function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // After signing up when the account still needs its email confirmed.
  const [confirmSent, setConfirmSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // "Start fresh" removes the button that had focus, so focus moves to the
  // heading it changed, rather than back to the top of the page.
  const whyTitleRef = useRef(null);
  const [startedFresh, setStartedFresh] = useState(false);
  useEffect(() => {
    if (startedFresh) whyTitleRef.current?.focus();
  }, [startedFresh]);
  const passwordHintId = useId();
  const errorId = useId();

  // Where they were going: this tab's history first, then this device's note.
  const destination = safeDestination(location.state) ?? readDestination();
  const reason = describeDestination(destination);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const action = mode === "login" ? signIn : signUp;
    const { data, error: authError } = await action(email, password);

    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // A new account that has to confirm its email first: no session yet.
    // The destination is kept on this device for when they sign in.
    if (mode === "signup" && !data?.session) {
      if (destination) rememberDestination(destination);
      setConfirmSent(true);
      return;
    }

    clearDestination();
    navigate(destination ? destination.from : "/characters", {
      state: destination ? destination.fromState : null,
    });
  }

  if (confirmSent) {
    return (
      <main className="auth-page">
        <h1 className="auth-page__title">Check your email</h1>
        <div className="auth-page__notice" role="status">
          <p>
            We sent a link to <strong>{email}</strong>. Open it to confirm your account, then log in.
          </p>
          {reason && (
            <p>
              <strong>Your place is saved on this device.</strong> When you log in here, we&apos;ll take you
              straight on: {reason.action.charAt(0).toLowerCase() + reason.action.slice(1)}.
            </p>
          )}
        </div>
        <Button
          large
          onClick={() => {
            setConfirmSent(false);
            setMode("login");
            setPassword("");
          }}
        >
          I&apos;ve confirmed it, log in
        </Button>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <h1 className="auth-page__title">{mode === "login" ? "Log In" : "Sign Up"}</h1>

      {/* Why an account, and what happens once you're in. */}
      <section className="auth-page__why" aria-labelledby="auth-why-title">
        <h2 id="auth-why-title" className="auth-page__why-title" ref={whyTitleRef} tabIndex={-1}>
          {reason ? reason.title : "Why sign in?"}
        </h2>
        {reason && <p className="auth-page__why-next">{reason.next}</p>}
        {/* Someone else's unfinished step on a shared device: let them drop it. */}
        {reason && (
          <p>
            Not what you came to do?{" "}
            <button
              type="button"
              className="auth-page__fresh"
              onClick={() => {
                clearDestination();
                navigate("/login", { replace: true, state: null });
                setStartedFresh(true);
              }}
            >
              Start fresh instead
            </button>
          </p>
        )}
        <p>
          An account saves your characters, game tables and homebrew so they&apos;re there on any device.
          Browsing the rules, the character quiz and the samples never need one.
        </p>
      </section>

      <form className="auth-page__form" onSubmit={handleSubmit} aria-describedby={error ? errorId : undefined}>
        <label className="auth-page__label" htmlFor="auth-email">
          Email
        </label>
        <input
          id="auth-email"
          className="auth-page__input"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          required
        />

        <label className="auth-page__label" htmlFor="auth-password">
          Password
        </label>
        <input
          id="auth-password"
          className="auth-page__input"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          aria-invalid={error ? true : undefined}
          aria-describedby={[passwordHintId, error ? errorId : null].filter(Boolean).join(" ")}
          required
        />
        <p className="auth-page__hint" id={passwordHintId}>
          At least 6 characters.
        </p>

        {error && (
          <p className="auth-page__error" id={errorId} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" large disabled={isSubmitting}>
          {isSubmitting ? "Please wait..." : mode === "login" ? "Log In" : "Sign Up"}
        </Button>
      </form>

      <button
        type="button"
        className="auth-page__toggle"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError("");
        }}
      >
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
      </button>

      <p className="auth-page__sample">
        Not ready yet? <Link to="/sample/character">See a sample character sheet</Link> or{" "}
        <Link to="/sample/table">a sample DM table</Link>.
      </p>
    </main>
  );
}

export default AuthPage;
