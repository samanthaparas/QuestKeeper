import { useLayoutEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./NavWheel.css";

// Each link's row height, and how far a link may sit from the centre before
// it stops shrinking and fading (in rows).
const ROW_HEIGHT = 48;
const MAX_DISTANCE = 2.6;
// How long the spin to an off-centre link takes before following it.
const SPIN_MS = 280;

// The narrow-screen menu as a spinning wheel: the links sit on a drum, the one
// in the middle band is large and bold, and the rest tilt away and fade the
// further they are from it. Swipe, scroll or use the arrow keys to spin; each
// link snaps into the band. Tapping the centred link opens it; tapping one
// above or below spins it to the centre first, then opens it.
//
// The links stay ordinary links in order, so screen readers and the Tab key
// see a normal list. The tilt is set straight on each link's style while
// scrolling (no React state), so spinning never re-renders.
function NavWheel({ links, activeIndex = 0, onNavigate }) {
  const viewportRef = useRef(null);
  const itemRefs = useRef([]);
  const frame = useRef(0);
  const navigate = useNavigate();

  // Which link sits nearest the middle band right now.
  function nearestIndex() {
    const viewport = viewportRef.current;
    if (!viewport) return 0;
    const middle = viewport.scrollTop + viewport.clientHeight / 2;
    let nearest = 0;
    let best = Infinity;
    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      const distance = Math.abs(
        item.offsetTop + item.offsetHeight / 2 - middle,
      );
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    return nearest;
  }

  // Tilt, shrink and fade each link by how far it is from the centre.
  function paint() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const middle = viewport.scrollTop + viewport.clientHeight / 2;
    const centre = nearestIndex();

    itemRefs.current.forEach((item, index) => {
      if (!item) return;
      const offset =
        (item.offsetTop + item.offsetHeight / 2 - middle) / ROW_HEIGHT;
      const away = Math.min(Math.abs(offset), MAX_DISTANCE);
      item.style.transform = `rotateX(${-offset * 22}deg) scale(${1 - away * 0.12})`;
      item.style.opacity = String(1 - away * 0.22);
      item.dataset.centred = index === centre ? "true" : "false";
    });
  }

  function scrollToIndex(index, smooth) {
    const viewport = viewportRef.current;
    const item = itemRefs.current[index];
    if (!viewport || !item) return;
    const top =
      item.offsetTop + item.offsetHeight / 2 - viewport.clientHeight / 2;
    if (typeof viewport.scrollTo === "function") {
      viewport.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
    } else {
      viewport.scrollTop = top;
    }
  }

  // Open with the current page in the middle band.
  // If the wheel appears mid-resize (a phone rotating, a window narrowing
  // with the menu open), its height isn't settled yet, so centre again once
  // the browser reports its real size.
  useLayoutEffect(() => {
    function centreOnCurrentPage() {
      scrollToIndex(activeIndex, false);
      paint();
    }

    centreOnCurrentPage();
    const viewport = viewportRef.current;
    let lastHeight = viewport?.clientHeight ?? 0;
    const observer =
      typeof ResizeObserver === "function" && viewport
        ? new ResizeObserver(() => {
            if (viewport.clientHeight !== lastHeight) {
              lastHeight = viewport.clientHeight;
              centreOnCurrentPage();
            }
          })
        : null;
    observer?.observe(viewport);

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame.current);
    };
    // Only when the wheel first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
  }

  function handleClick(event, index, to) {
    if (index === nearestIndex()) {
      onNavigate?.();
      return;
    }
    // Spin the tapped link into the band, then follow it.
    event.preventDefault();
    scrollToIndex(index, true);
    setTimeout(() => {
      navigate(to);
      onNavigate?.();
    }, SPIN_MS);
  }

  function handleKeyDown(event) {
    const keys = { ArrowDown: 1, ArrowUp: -1 };
    if (!(event.key in keys) && event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    const current = itemRefs.current.indexOf(document.activeElement);
    const from = current === -1 ? nearestIndex() : current;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? links.length - 1
          : Math.max(0, Math.min(links.length - 1, from + keys[event.key]));
    // Spin here rather than relying on the focus event, and skip the
    // browser's instant scroll-into-view so it can't cut the spin short.
    itemRefs.current[next]?.focus({ preventScroll: true });
    scrollToIndex(next, true);
  }

  return (
    <div className="nav-wheel">
      <div className="nav-wheel__band" aria-hidden="true" />
      <div
        className="nav-wheel__viewport"
        ref={viewportRef}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        style={{ "--nav-wheel-row": `${ROW_HEIGHT}px` }}
      >
        <ul className="nav-wheel__list">
          {links.map((link, index) => (
            <li key={link.to} className="nav-wheel__row">
              <NavLink
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                className="nav-wheel__link"
                to={link.to}
                end={link.end}
                onClick={(event) => handleClick(event, index, link.to)}
                // Next frame, so the browser's own focus scroll (Tab key)
                // doesn't cancel the smooth spin.
                onFocus={() =>
                  requestAnimationFrame(() => scrollToIndex(index, true))
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
      <p className="nav-wheel__hint">Swipe or use ↑ ↓ to spin</p>
    </div>
  );
}

export default NavWheel;
