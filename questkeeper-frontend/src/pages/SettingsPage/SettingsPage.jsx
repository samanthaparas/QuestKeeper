import { useState } from "react";
import { useAuth } from "../../context/useAuth";
import Button from "../../components/Button/Button";
import {
  DISPLAY_NAME_MAX,
  getDisplayName,
  updateDisplayName,
  updateEmail,
  updatePassword,
} from "../../utils/account";
import { getMotionPreference, setMotionPreference } from "../../utils/motionPreference";
import "./SettingsPage.css";

const MIN_PASSWORD = 6; // Supabase's own minimum

// One card's save state: "" | "saving" | { ok: text } | { error: text }.
function useSaveState() {
  const [state, setState] = useState("");
  async function run(action, okText) {
    setState("saving");
    try {
      await action();
      setState({ ok: okText });
      return true;
    } catch (error) {
      setState({ error: error.message });
      return false;
    }
  }
  return [state, run, setState];
}

// The message under each card's button. Read out by screen readers too.
function SaveMessage({ state }) {
  return (
    <p className={`settings-page__message${state?.error ? " settings-page__message--error" : ""}`} role="status">
      {state?.ok ?? state?.error ?? ""}
    </p>
  );
}

// Your account and this device's preferences: display name, Reduce Motion,
// email and password.
function SettingsPage() {
  const { user } = useAuth();

  const [name, setName] = useState(() => getDisplayName(user));
  const [nameState, saveName] = useSaveState();

  const [motion, setMotion] = useState(getMotionPreference);

  const [email, setEmail] = useState("");
  const [emailState, saveEmail] = useSaveState();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordState, savePassword, setPasswordState] = useSaveState();

  function handleMotion(event) {
    const value = event.target.checked ? "reduce" : "device";
    setMotion(value);
    setMotionPreference(value);
  }

  async function handleEmail(event) {
    event.preventDefault();
    const sent = await saveEmail(
      () => updateEmail(email),
      `Check ${email.trim()} for a link to confirm the change. Your email changes once you click it. (You may also get a note at your current email.)`,
    );
    if (sent) setEmail("");
  }

  async function handlePassword(event) {
    event.preventDefault();
    if (password !== confirm) {
      setPasswordState({ error: "The two passwords don't match." });
      return;
    }
    const saved = await savePassword(() => updatePassword(password), "Password changed.");
    if (saved) {
      setPassword("");
      setConfirm("");
    }
  }

  return (
    <main className="settings-page">
      <p className="settings-page__eyebrow">Your account</p>
      <h1 className="settings-page__title">Settings</h1>

      <form
        className="settings-page__card"
        onSubmit={(event) => {
          event.preventDefault();
          saveName(() => updateDisplayName(name), "Display name saved.");
        }}
      >
        <h2 className="settings-page__heading">Display name</h2>
        <p className="settings-page__hint">What QuestKeeper calls you. Your characters keep their own names.</p>
        <label className="settings-page__label" htmlFor="settings-name">
          Display name
        </label>
        <input
          id="settings-name"
          className="settings-page__input"
          value={name}
          maxLength={DISPLAY_NAME_MAX}
          onChange={(event) => setName(event.target.value)}
          autoComplete="nickname"
        />
        <div className="settings-page__actions">
          <Button type="submit" disabled={nameState === "saving"}>
            {nameState === "saving" ? "Saving..." : "Save name"}
          </Button>
          <SaveMessage state={nameState} />
        </div>
      </form>

      <section className="settings-page__card" aria-labelledby="settings-motion-heading">
        <h2 className="settings-page__heading" id="settings-motion-heading">
          Motion
        </h2>
        <p className="settings-page__hint">
          QuestKeeper already follows your device's Reduce Motion setting. Turn this on to switch off
          the little movements (rocking icons, sliding bars, the spinning menu) here even when your
          device allows them. Saved on this device.
        </p>
        <label className="settings-page__switch">
          <input type="checkbox" checked={motion === "reduce"} onChange={handleMotion} />
          <span>Reduce motion</span>
        </label>
      </section>

      <form className="settings-page__card" onSubmit={handleEmail}>
        <h2 className="settings-page__heading">Email</h2>
        <p className="settings-page__hint">
          You sign in with <strong>{user?.email}</strong>.
        </p>
        <label className="settings-page__label" htmlFor="settings-email">
          New email
        </label>
        <input
          id="settings-email"
          className="settings-page__input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
        <div className="settings-page__actions">
          <Button type="submit" disabled={emailState === "saving"}>
            {emailState === "saving" ? "Sending..." : "Change email"}
          </Button>
          <SaveMessage state={emailState} />
        </div>
      </form>

      <form className="settings-page__card" onSubmit={handlePassword}>
        <h2 className="settings-page__heading">Password</h2>
        <label className="settings-page__label" htmlFor="settings-password">
          New password
        </label>
        <input
          id="settings-password"
          className="settings-page__input"
          type="password"
          value={password}
          minLength={MIN_PASSWORD}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <label className="settings-page__label" htmlFor="settings-confirm">
          Type it again
        </label>
        <input
          id="settings-confirm"
          className="settings-page__input"
          type="password"
          value={confirm}
          minLength={MIN_PASSWORD}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          required
        />
        <p className="settings-page__hint">At least {MIN_PASSWORD} characters.</p>
        <div className="settings-page__actions">
          <Button type="submit" disabled={passwordState === "saving"}>
            {passwordState === "saving" ? "Saving..." : "Change password"}
          </Button>
          <SaveMessage state={passwordState} />
        </div>
      </form>
    </main>
  );
}

export default SettingsPage;
