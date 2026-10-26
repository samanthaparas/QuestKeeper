import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import lostPath from "../../assets/illustrations/lost-path.webp";
import "./NotFoundPage.css";

// An address that isn't a page: a small card with a lost-path picture, one
// clear way home, and the beginner guide for anyone who's new.
function NotFoundPage() {
  // The title list only knows real pages, so this one names itself (again
  // after each move between two unknown addresses).
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = "Page Not Found · QuestKeeper";
  }, [pathname]);

  return (
    <main className="not-found">
      <div className="not-found__card">
        {/* Decorative: the words are real text beside it, never baked into the picture. */}
        <img className="not-found__art" src={lostPath} alt="" width="720" height="480" />
        <p className="not-found__eyebrow">404</p>
        <h1 className="not-found__title">We couldn&apos;t find that page</h1>
        <p className="not-found__text">Check the address, or head back to your adventure.</p>
        <Link className="qk-button qk-button--primary not-found__home" to="/">
          Go home
        </Link>
        <p className="not-found__guide">
          New here? <Link to="/guide">Start with the beginner guide</Link>.
        </p>
      </div>
    </main>
  );
}

export default NotFoundPage;
