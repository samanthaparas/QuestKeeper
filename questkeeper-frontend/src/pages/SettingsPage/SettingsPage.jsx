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
import { getThemePreference, setThemePreference } from "../../utils/themePreference";
import { getHeadsUpPreference, setHeadsUpPreference } from "../../utils/turnHeadsUp";
import { getBeginnerTips, setBeginnerTips } from "../../utils/beginnerTips";
import { runDbChecks } from "../../utils/dbCheck";
import {
  TEXT_SIZES,
  getHighContrast,
  getTextSize,
  setHighContrast as saveHighContrast,
  setTextSize as saveTextSize,
} from "../../utils/displayPreference";
import PageBanner from "../../components/PageBanner/PageBanner";
import YourDataCard from "../../components/YourDataCard/YourDataCard";
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

// Your account and this device's preferences: display name, Appearance,
// Reduce Motion, email and password.
function SettingsPage() {
  const { user } = useAuth();

  const [name, setName] = useState(() => getDisplayName(user));
  const [nameState, saveName] = useSaveState();

  const [motion, setMotion] = useState(getMotionPreference);
  const [theme, setTheme] = useState(getThemePreference);
  const [headsUp, setHeadsUp] = useState(getHeadsUpPreference);
  const [tips, setTips] = useState(getBeginnerTips);
  const [textSize, setTextSize] = useState(getTextSize);
  const [highContrast, setHighContrast] = useState(getHighContrast);
  // "Database check": null until run, then [{ file, what, status }].
  const [dbResults, setDbResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  async function handleDbCheck() {
    setIsChecking(true);
    setDbResults(await runDbChecks());
    setIsChecking(false);
  }

  const missingFiles = (dbResults ?? []).filter((result) => result.status === "missing");
  const unsureFiles = (dbResults ?? []).filter((result) => result.status === "unknown");

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

  function handleTips(event) {
    setTips(event.target.checked);
    setBeginnerTips(event.target.checked);
  }

  function handleHeadsUp(event) {
    setHeadsUp(event.target.checked);
    setHeadsUpPreference(event.target.checked);
  }

  function handleTheme(value) {
    setTheme(value);
    setThemePreference(value);
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
      <PageBanner art="hearth" eyebrow="Your account" title="Settings" />

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

      <section className="settings-page__card" aria-labelledby="settings-theme-heading">
        <h2 className="settings-page__heading" id="settings-theme-heading">
          Appearance
        </h2>
        <p className="settings-page__hint">
          Light or dark. &ldquo;Match my device&rdquo; follows your phone's or computer's own setting.
          Saved on this device.
        </p>
        <div className="settings-page__choices" role="radiogroup" aria-labelledby="settings-theme-heading">
          {[
            ["device", "Match my device"],
            ["light", "Light"],
            ["dark", "Dark"],
          ].map(([value, label]) => (
            <label key={value} className="settings-page__switch">
              <input
                type="radio"
                name="theme"
                checked={theme === value}
                onChange={() => handleTheme(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-page__card" aria-labelledby="settings-reading-heading">
        <h2 className="settings-page__heading" id="settings-reading-heading">
          Easier reading
        </h2>
        <p className="settings-page__hint">
          Make everything bigger (buttons and boxes grow with the words), or make quiet grey text and
          lines stand out more. Saved on this device.
        </p>
        <p className="settings-page__hint" id="settings-text-size-label">
          Text size
        </p>
        <div className="settings-page__choices" role="radiogroup" aria-labelledby="settings-text-size-label">
          {TEXT_SIZES.map(({ value, label }) => (
            <label key={value} className="settings-page__switch">
              <input
                type="radio"
                name="text-size"
                checked={textSize === value}
                onChange={() => {
                  setTextSize(value);
                  saveTextSize(value);
                }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <label className="settings-page__switch">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(event) => {
              setHighContrast(event.target.checked);
              saveHighContrast(event.target.checked);
            }}
          />
          <span>High contrast</span>
        </label>
      </section>

      <section className="settings-page__card" aria-labelledby="settings-tips-heading">
        <h2 className="settings-page__heading" id="settings-tips-heading">
          Beginner tips
        </h2>
        <p className="settings-page__hint">
          The extra explanations for new players: &ldquo;What does this mean?&rdquo; on a roll, &ldquo;New to
          dice?&rdquo; on the sheet, &ldquo;How a fight works&rdquo;, the Tips cards in character creation and the
          tip on your game page. Know the game well? Turn them off. Rules words still explain themselves when
          you point at them. Saved on this device.
        </p>
        <label className="settings-page__switch">
          <input type="checkbox" checked={tips} onChange={handleTips} />
          <span>Show beginner tips</span>
        </label>
      </section>

      <section className="settings-page__card" aria-labelledby="settings-headsup-heading">
        <h2 className="settings-page__heading" id="settings-headsup-heading">
          Turn heads-up
        </h2>
        <p className="settings-page__hint">
          In a fight, when you&apos;re next to go (and when it&apos;s your turn), your phone gives one short buzz and
          this tab&apos;s title says so while you&apos;re looking at something else. No sound. Saved on this device.
        </p>
        <label className="settings-page__switch">
          <input type="checkbox" checked={headsUp} onChange={handleHeadsUp} />
          <span>Give me a heads-up</span>
        </label>
      </section>

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

      {/* For whoever runs QuestKeeper: have the newest SQL files been run? */}
      <section className="settings-page__card" aria-labelledby="settings-db-heading">
        <h2 className="settings-page__heading" id="settings-db-heading">
          Database check
        </h2>
        <p className="settings-page__hint">
          For whoever runs QuestKeeper: checks that the newest SQL files have been run in Supabase, so a
          new feature isn&apos;t waiting on one (for example after the SQL editor timed out). It only looks;
          nothing is changed.
        </p>
        <div>
          <Button variant="secondary" disabled={isChecking} onClick={handleDbCheck}>
            {isChecking ? "Checking…" : "Check the database"}
          </Button>
        </div>
        {dbResults && (
          <div role="status">
            <p className="settings-page__hint">
              {missingFiles.length === 0 && unsureFiles.length === 0
                ? "✓ Everything is up to date."
                : missingFiles.length > 0
                  ? `${missingFiles.length} SQL ${missingFiles.length === 1 ? "file needs" : "files need"} running in the Supabase SQL editor.`
                  : "Couldn't check everything just now. Try again in a moment."}
            </p>
            <ul className="settings-page__db-list">
              {dbResults.map((result) => (
                <li key={result.file} className={`settings-page__db-row settings-page__db-row--${result.status}`}>
                  <span aria-hidden="true">{result.status === "ok" ? "✓" : result.status === "missing" ? "✗" : "?"}</span>{" "}
                  {result.what}{" "}
                  <span className="settings-page__db-file">
                    {result.status === "ok" ? "" : result.status === "missing" ? "Not run yet: " : "Couldn't check: "}
                    <code>{result.file}</code>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
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

      <YourDataCard />
    </main>
  );
}

export default SettingsPage;
