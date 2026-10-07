import { useSyncExternalStore } from "react";
import { NavLink, useLocation } from "react-router-dom";
import NavWheel from "../NavWheel/NavWheel";
import "./Navigation.css";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/guide", label: "Guide" },
  { to: "/races", label: "Races" },
  { to: "/classes", label: "Classes" },
  { to: "/backgrounds", label: "Backgrounds" },
  { to: "/spells", label: "Spells" },
  { to: "/characters", label: "My Characters" },
  { to: "/tables", label: "Tables" },
  { to: "/library", label: "Monster Library" },
  { to: "/about", label: "About" },
];

// Matches the header's collapse point in Header.css.
const NARROW_QUERY = "(max-width: 1240px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener?.("change", onChange);
      return () => list?.removeEventListener?.("change", onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
  );
}

function linkClass({ isActive }) {
  return `navigation__link${isActive ? " navigation__link--active" : ""}`;
}

// Which link the current page belongs to ("/tables/abc" is under Tables).
function activeLinkIndex(pathname) {
  const index = NAV_LINKS.findIndex((link) =>
    link.end
      ? pathname === link.to
      : pathname === link.to || pathname.startsWith(`${link.to}/`),
  );
  return Math.max(0, index);
}

// Wide screens: one row of links. Narrow screens, with the menu open: the
// links on a spinning wheel (or a plain list for people who ask their device
// for less motion).
function Navigation({ isMenuOpen = false, onNavigate }) {
  const isNarrow = useMediaQuery(NARROW_QUERY);
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const { pathname } = useLocation();

  if (isNarrow && isMenuOpen && !reduceMotion) {
    return (
      <nav className="navigation navigation--wheel" aria-label="Main">
        <NavWheel
          links={NAV_LINKS}
          activeIndex={activeLinkIndex(pathname)}
          onNavigate={onNavigate}
        />
      </nav>
    );
  }

  return (
    <nav className="navigation" aria-label="Main">
      {NAV_LINKS.map((link) => (
        <NavLink
          key={link.to}
          className={linkClass}
          to={link.to}
          end={link.end}
          onClick={onNavigate}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default Navigation;
