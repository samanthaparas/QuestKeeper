import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getInvite, acceptInvite } from "../../utils/homebrewStore";
import { refreshHomebrew } from "../../utils/homebrewCache";
import Button from "../../components/Button/Button";
import PageBanner from "../../components/PageBanner/PageBanner";
import StatusNote from "../../components/StatusNote/StatusNote";
import { useFocusAfterRetry } from "../../components/StatusNote/useFocusAfterRetry";
import sealedScroll from "../../assets/support/sealed-scroll.webp";
import "./HomebrewInvitePage.css";

// What each invite status means, in plain words.
const STATUS_MESSAGES = {
  used: "This invite link has already been used. Ask for a new one.",
  expired: "This invite link has expired. Ask for a new one.",
  own: "This is your own invite link. Send it to the person you made it for.",
  not_found: "We couldn't find that invite link. Check it was copied in full.",
};

// Opened from an invite link: "Sam wants to share their homebrew with you."
function HomebrewInvitePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  // Checking the invite failed (a retry can help), or accepting it failed (Accept can be pressed again).
  const [loadError, setLoadError] = useState(false);
  const [acceptError, setAcceptError] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [hasRetried, setHasRetried] = useState(false);
  const isChecking = !invite && !loadError;

  useEffect(() => {
    let ignore = false;
    getInvite(code)
      .then((found) => !ignore && setInvite(found))
      .catch(() => !ignore && setLoadError(true));
    return () => {
      ignore = true;
    };
  }, [code, attempt]);

  useFocusAfterRetry(hasRetried, isChecking);

  function retryChecking() {
    setLoadError(false);
    setHasRetried(true);
    setAttempt((count) => count + 1);
  }

  async function handleAccept() {
    if (isAccepting) return;
    setAcceptError("");
    setIsAccepting(true);
    try {
      await acceptInvite(code);
      // Their homebrew should show up in pickers straight away.
      refreshHomebrew();
      navigate("/homebrew");
    } catch (acceptFailure) {
      setAcceptError(acceptFailure.message ?? "Could not accept the invite.");
      setIsAccepting(false);
    }
  }

  return (
    <main className="homebrew-invite">
      <PageBanner art="bestiary" title="Homebrew invite" />

      <div className="homebrew-invite__card">
        {isChecking && (
          <StatusNote variant="loading" focusOnShow={hasRetried}>
            Checking your invite...
          </StatusNote>
        )}

        {loadError && (
          <StatusNote variant="error" onRetry={retryChecking}>
            Couldn&apos;t check this invite. Check your connection and try again.
          </StatusNote>
        )}

        {invite?.status === "ok" && (
          <>
            <img className="homebrew-invite__thumb" src={sealedScroll} alt="" aria-hidden="true" />
            <h2 className="homebrew-invite__heading">Homebrew shared with you</h2>
            <p className="homebrew-invite__text">
              <strong>{invite.sender_label}</strong> wants to share their homebrew
              with you. You'll see their shared races, subraces, backgrounds and
              subclasses in character creation, marked "Homebrew".
            </p>
            <p className="homebrew-invite__hint">
              You keep access until they stop sharing or you remove it on your My
              Homebrew page.
            </p>
            {acceptError && <StatusNote variant="error">{acceptError}</StatusNote>}
            <div className="homebrew-invite__actions">
              <Button onClick={handleAccept} disabled={isAccepting}>
                {isAccepting ? "Accepting..." : "Accept"}
              </Button>
              <Button variant="secondary" onClick={() => navigate("/")}>
                No thanks
              </Button>
            </div>
          </>
        )}

        {/* A link that can't be used: just said plainly, with nothing to retry. */}
        {invite && invite.status !== "ok" && (
          <StatusNote>{STATUS_MESSAGES[invite.status]}</StatusNote>
        )}

        <p className="homebrew-invite__hint">
          <Link to="/homebrew">Go to My Homebrew</Link>
        </p>
      </div>
    </main>
  );
}

export default HomebrewInvitePage;
