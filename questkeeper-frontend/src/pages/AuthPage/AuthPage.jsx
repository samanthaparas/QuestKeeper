import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn, signUp } from "../../utils/auth";
import Button from "../../components/Button/Button";
import "./AuthPage.css";

function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const action = mode === "login" ? signIn : signUp;
    const { error: authError } = await action(email, password);

    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    navigate("/characters");
  }

  return (
    <main className="auth-page">
      <h1 className="auth-page__title">
        {mode === "login" ? "Log In" : "Sign Up"}
      </h1>

      <form className="auth-page__form" onSubmit={handleSubmit}>
        <label className="auth-page__label" htmlFor="auth-email">
          Email
        </label>
        <input
          id="auth-email"
          className="auth-page__input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="auth-page__label" htmlFor="auth-password">
          Password
        </label>
        <input
          id="auth-password"
          className="auth-page__input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        {error && <p className="auth-page__error">{error}</p>}

        <Button type="submit" large disabled={isSubmitting}>
          {isSubmitting
            ? "Please wait..."
            : mode === "login"
              ? "Log In"
              : "Sign Up"}
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
        {mode === "login"
          ? "Need an account? Sign up"
          : "Already have an account? Log in"}
      </button>
    </main>
  );
}

export default AuthPage;
