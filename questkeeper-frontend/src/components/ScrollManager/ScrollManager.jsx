import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Where each page in the history was scrolled to, by its history entry.
const positions = new Map();

// How long to keep trying to restore a position while the page is still
// loading its content (and so isn't tall enough yet).
const RESTORE_FOR_MS = 1500;

function restoreScroll(top) {
  const started = Date.now();
  function attempt() {
    window.scrollTo?.(0, top);
    const reached = Math.abs(window.scrollY - top) < 2;
    if (!reached && Date.now() - started < RESTORE_FOR_MS) {
      requestAnimationFrame(attempt);
    }
  }
  attempt();
}

// The app is one page as far as the browser is concerned, so it never resets
// the scroll position on its own: tapping a link from halfway down Home used
// to open the next page halfway down too. This puts every new page at the
// top, and Back or Forward returns you to where you were on that page.
//
// Changes within one page (opening an entry, the quiz results, a Guide
// section link) are left to that page, so only a new page path counts.
function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const lastPath = useRef(location.pathname);

  // Keep note of where this page is scrolled to while you're on it.
  useEffect(() => {
    const key = location.key;
    function remember() {
      positions.set(key, window.scrollY);
    }
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, [location.key]);

  // Before the new page is painted, so it never flashes at the old position.
  useLayoutEffect(() => {
    if (location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;

    const saved = positions.get(location.key);
    if (navigationType === "POP" && saved != null) {
      restoreScroll(saved);
    } else {
      window.scrollTo?.(0, 0);
    }
  }, [location, navigationType]);

  return null;
}

export default ScrollManager;
