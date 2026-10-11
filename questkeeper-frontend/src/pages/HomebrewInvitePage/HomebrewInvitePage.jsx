import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getInvite, acceptInvite } from "../../utils/homebrewStore";
import Button from "../../components/Button/Button";
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
  const [error, setError] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    getInvite(code)
      .then(setInvite)
      .catch((loadError) => setError(loadError.message));
  }, [code]);

  async function handleAccept() {
    setError("");
    setIsAccepting(true);
    try {
      await acceptInvite(code);
      navigate("/homebrew");
    } catch (acceptError) {
      setError(acceptError.message ?? "Could not accept the invite.");
      setIsAccepting(false);
    }
  }

  return (
    <main className="homebrew-invite">
      <div className="homebrew-invite__card">
        <h1 className="homebrew-invite__title">Homebrew invite</h1>

        {!invite && !error && <p>Checking your invite...</p>}

        {invite?.status === "ok" && (
          <>
            <p className="homebrew-invite__text">
              <strong>{invite.sender_label}</strong> wants to share their homebrew
              with you. You'll see their shared races, subraces, backgrounds and
              subclasses in character creation, marked "Homebrew".
            </p>
            <p className="homebrew-invite__hint">
              You keep access until they stop sharing or you remove it on your My
              Homebrew page.
            </p>
            <div className="homebrew-invite__actions">
              <Button onClick={handleAccept} disabled={isAccepting}>
                Accept
              </Button>
              <Button variant="secondary" onClick={() => navigate("/")}>
                No thanks
              </Button>
            </div>
          </>
        )}

        {invite && invite.status !== "ok" && (
          <p className="homebrew-invite__text">{STATUS_MESSAGES[invite.status]}</p>
        )}

        {error && (
          <p className="homebrew-invite__error" role="alert">
            {error}
          </p>
        )}

        <p className="homebrew-invite__hint">
          <Link to="/homebrew">Go to My Homebrew</Link>
        </p>
      </div>
    </main>
  );
}

export default HomebrewInvitePage;
