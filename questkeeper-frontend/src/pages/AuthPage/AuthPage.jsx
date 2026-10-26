import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  getRememberedEmail,
  requestPasswordReset,
  setRememberedEmail,
  signIn,
  signUp,
} from "../../utils/auth";
import { useAuth } from "../../context/useAuth";
import { updatePassword } from "../../utils/account";
import {
  clearDestination,
  describeDestination,
  readDestination,
  rememberDestination,
  safeDestination,
} from "../../utils/continueAfterLogin";
import Button from "../../components/Button/Button";
import PageBanner from "../../components/PageBanner/PageBanner";
import "./AuthPage.css";

// Every view of this page shares one frame: the hearth banner (whose heading is
// the page's h1) above a warm card holding the form or the message.
function AuthFrame({ title, children }) {
  return (
    <main className="auth-page">
      <PageBanner art="hearth" eyebrow="Your account" title={title} />
      <div className="auth-page__card">{children}</div>
    </main>
  );
}

// Log in, sign up, or get back in when the password is forgotten (an emailed
// link, then "Choose a new password" here). It says why an account is needed and what happens
// next, and takes the player back to where they were headed (with their
// quiz build) once they're in, even after a reload or after confirming
// their email in another tab (see continueAfterLogin.js).
function AuthPage() {
  // "login" | "signup" | "forgot" (ask for the reset email)
  const [mode, setMode] = useState("login");
  // "Remember my email" fills the email box next time (never the password).
  const [email, setEmail] = useState(getRememberedEmail);
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(getRememberedEmail()));
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  // The reset email has been sent.
  const [resetSent, setResetSent] = useState(false);
  // Opened from a reset-password email link: choose a new password.
  const { isRecovering = false, finishRecovery } = useAuth();
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
  // Switching between log in, sign up, forgot password and the "check your
  // email" screens removes the button you pressed, so focus moves to the new
  // heading (not on the first view).
  const view = isRecovering ? "recovery" : resetSent ? "reset-sent" : confirmSent ? "confirm-sent" : mode;
  const shownView = useRef(view);
  useEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    const title = document.querySelector(".auth-page .page-banner__title");
    title?.setAttribute("tabindex", "-1");
    title?.focus();
  }, [view]);
  const passwordHintId = useId();
  const errorId = useId();

  // Where they were going: this tab's history first, then this device's note.
  const destination = safeDestination(location.state) ?? readDestination();
  const reason = describeDestination(destination);

  async function handleForgot(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    const { error: resetError } = await requestPasswordReset(email);
    setIsSubmitting(false);
    if (resetError) {
      setError(
        resetError.status === 429 || /rate limit/i.test(resetError.message ?? "")
          ? "Too many emails were sent just now. Wait a few minutes and try again."
          : resetError.message,
      );
      return;
    }
    setResetSent(true);
  }

  async function handleNewPassword(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== repeatPassword) {
      setError("The two passwords don't match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await updatePassword(newPassword);
    } catch (updateError) {
      setIsSubmitting(false);
      setError(updateError.message);
      return;
    }
    setIsSubmitting(false);
    finishRecovery?.();
    navigate(destination ? destination.from : "/characters", {
      state: destination ? destination.fromState : null,
    });
  }

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

    if (mode === "login") setRememberedEmail(rememberEmail ? email : "");

    clearDestination();
    navigate(destination ? destination.from : "/characters", {
      state: destination ? destination.fromState : null,
    });
  }

  // They came from the reset email: just the new password, nothing else.
  if (isRecovering) {
    return (
      <AuthFrame title="Choose a new password">
        <form className="auth-page__form" onSubmit={handleNewPassword} aria-describedby={error ? errorId : undefined}>
          <label className="auth-page__label" htmlFor="auth-new-password">
            New password
          </label>
          <input
            id="auth-new-password"
            className="auth-page__input"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
          <p className="auth-page__hint">At least 6 characters.</p>
          <label className="auth-page__label" htmlFor="auth-repeat-password">
            Type it again
          </label>
          <input
            id="auth-repeat-password"
            className="auth-page__input"
            type="password"
            autoComplete="new-password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            minLength={6}
            required
          />
          {error && (
            <p className="auth-page__error" id={errorId} role="alert">
              {error}
            </p>
          )}
          <Button type="submit" large disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : "Save new password"}
          </Button>
        </form>
      </AuthFrame>
    );
  }

  if (resetSent) {
    return (
      <AuthFrame title="Check your email">
        <div className="auth-page__notice" role="status">
          <p>
            If there&apos;s an account for <strong>{email}</strong>, we&apos;ve sent a link to choose a new
            password. It can take a minute, and it may land in spam.
          </p>
        </div>
        <Button
          large
          onClick={() => {
            setResetSent(false);
            setMode("login");
          }}
        >
          Back to log in
        </Button>
      </AuthFrame>
    );
  }

  if (confirmSent) {
    return (
      <AuthFrame title="Check your email">
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
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title={mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Forgot your password?"}>
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

      <form
        className="auth-page__form"
        onSubmit={mode === "forgot" ? handleForgot : handleSubmit}
        aria-describedby={error ? errorId : undefined}
      >
        {mode === "forgot" && (
          <p className="auth-page__hint">
            Type the email you signed up with and we&apos;ll send you a link to choose a new password.
          </p>
        )}
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

        {mode !== "forgot" && (
          <>
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

            {mode === "login" && (
              <>
                <label className="auth-page__remember">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                  />
                  Remember my email on this device
                </label>
                <button
                  type="button"
                  className="auth-page__forgot"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                  }}
                >
                  Forgot your password?
                </button>
              </>
            )}
          </>
        )}

        {error && (
          <p className="auth-page__error" id={errorId} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" large disabled={isSubmitting}>
          {isSubmitting
            ? "Please wait..."
            : mode === "login"
              ? "Log In"
              : mode === "signup"
                ? "Sign Up"
                : "Send reset link"}
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
        {mode === "login" ? "Need an account? Sign up" : mode === "signup" ? "Already have an account? Log in" : "Back to log in"}
      </button>

      <p className="auth-page__sample">
        Not ready yet? <Link to="/sample/character">See a sample character sheet</Link> or{" "}
        <Link to="/sample/table">a sample DM table</Link>.
      </p>
    </AuthFrame>
  );
}

export default AuthPage;
