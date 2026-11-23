import { useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../Button/Button";
import { countTablesIRun, deleteMyAccount, downloadMyData } from "../../utils/account";
import "./YourDataCard.css";

// Settings > Your data: download everything, or delete the account for good.
// Deleting asks first, and says what goes with it (including tables the person
// runs, which disappear for their players too).
function YourDataCard() {
  const navigate = useNavigate();
  const confirmId = useId();
  const [downloadState, setDownloadState] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [tablesRun, setTablesRun] = useState(null);
  const [typed, setTyped] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setDownloadState("working");
    try {
      await downloadMyData();
      setDownloadState("done");
    } catch (failure) {
      setDownloadState({ error: failure.message || "The download didn't work. Try again." });
    }
  }

  async function startAsking() {
    setIsAsking(true);
    setError("");
    try {
      setTablesRun(await countTablesIRun());
    } catch {
      setTablesRun(null); // Not a reason to stop: the warning just says "any tables".
    }
  }

  function cancel() {
    setIsAsking(false);
    setTyped("");
    setError("");
  }

  async function handleDelete(event) {
    event.preventDefault();
    if (typed.trim() !== "DELETE") return;
    setIsDeleting(true);
    setError("");
    try {
      await deleteMyAccount();
      navigate("/", { replace: true });
    } catch (failure) {
      setError(failure.message);
      setIsDeleting(false);
    }
  }

  return (
    <section className="your-data" aria-labelledby="your-data-heading">
      <h2 className="your-data__heading" id="your-data-heading">
        Your data
      </h2>
      <p className="your-data__hint">
        What we keep, and why, is on the <Link to="/privacy">privacy page</Link>.
      </p>

      <div className="your-data__block">
        <h3 className="your-data__subheading">Download my data</h3>
        <p className="your-data__hint">
          A file with your characters, homebrew, journal notes, messages you sent and your tables.
        </p>
        <Button variant="secondary" onClick={handleDownload} disabled={downloadState === "working"}>
          {downloadState === "working" ? "Gathering…" : "Download my data"}
        </Button>
        <p className={`your-data__message${downloadState?.error ? " your-data__message--error" : ""}`} role="status">
          {downloadState === "done" ? "Downloaded." : (downloadState?.error ?? "")}
        </p>
      </div>

      <div className="your-data__block">
        <h3 className="your-data__subheading">Delete my account</h3>
        <p className="your-data__hint">
          This deletes your login and everything in your account for good: your characters, homebrew,
          journal notes, messages and pictures. It can&apos;t be undone.
        </p>
        {!isAsking ? (
          <Button variant="danger" onClick={startAsking}>
            Delete my account…
          </Button>
        ) : (
          <form className="your-data__confirm" onSubmit={handleDelete}>
            {tablesRun > 0 && (
              <p className="your-data__warning" role="alert">
                You run {tablesRun === 1 ? "1 table" : `${tablesRun} tables`}. Deleting your account deletes{" "}
                {tablesRun === 1 ? "it" : "them"} for your players too.
              </p>
            )}
            <label className="your-data__label" htmlFor={confirmId}>
              Type DELETE to confirm
            </label>
            <input
              id={confirmId}
              className="your-data__input"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <div className="your-data__actions">
              <Button type="submit" variant="danger" disabled={typed.trim() !== "DELETE" || isDeleting}>
                {isDeleting ? "Deleting…" : "Delete everything for good"}
              </Button>
              <Button type="button" variant="secondary" onClick={cancel} disabled={isDeleting}>
                Keep my account
              </Button>
            </div>
            {error && (
              <p className="your-data__message your-data__message--error" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

export default YourDataCard;
