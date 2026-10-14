import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import NavWheel from "../NavWheel/NavWheel";
import NavMenus from "./NavMenus";
import { NAV_GROUPS, activeGroupIndex, isUnder } from "./navGroups";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import "./Navigation.css";

// Matches the header's collapse point in Header.css.
const NARROW_QUERY = "(max-width: 1040px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function linkClass({ isActive }) {
  return `navigation__link${isActive ? " navigation__link--active" : ""}`;
}

// The phone menu: the wheel shows the three menus; picking one spins in its
// pages, with "All menus" at the top to go back. It only exists while the
// menu is open, so it always starts on the three menus.
function MenuWheel({ onNavigate }) {
  const { pathname } = useLocation();
  // Which menu's pages are showing. null: just opened. "": came back up from
  // a menu (so keyboard focus stays on the wheel).
  const [groupId, setGroupId] = useState(null);
  const group = NAV_GROUPS.find((entry) => entry.id === groupId);
  const activeGroup = activeGroupIndex(pathname);

  if (!group) {
    return (
      <NavWheel
        // A new wheel per level, so each one opens centred.
        key="menus"
        links={NAV_GROUPS.map((entry, index) => ({
          id: entry.id,
          label: `${entry.label} ›`,
          current: index === activeGroup,
          onSelect: () => setGroupId(entry.id),
        }))}
        activeIndex={Math.max(0, activeGroup)}
        focusOnOpen={groupId !== null}
      />
    );
  }

  const activeItem = group.items.findIndex((item) => isUnder(pathname, item.to));
  return (
    <NavWheel
      key={group.id}
      links={[
        { id: "back", label: "‹ All menus", onSelect: () => setGroupId("") },
        ...group.items,
      ]}
      // The page you're on, or the menu's first page.
      activeIndex={activeItem === -1 ? 1 : activeItem + 1}
      onNavigate={onNavigate}
      onBack={() => setGroupId("")}
      focusOnOpen
    />
  );
}

// Wide screens: the three menus with their open-book panels. Narrow screens,
// with the menu open: the wheel (or a plain list, grouped by menu, for people
// who ask their device for less motion).
function Navigation({ isMenuOpen = false, onNavigate }) {
  const isNarrow = useMediaQuery(NARROW_QUERY);
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  if (!isNarrow) {
    return (
      <nav className="navigation" aria-label="Main">
        <NavMenus />
      </nav>
    );
  }

  if (isMenuOpen && !reduceMotion) {
    return (
      <nav className="navigation navigation--wheel" aria-label="Main">
        <MenuWheel onNavigate={onNavigate} />
      </nav>
    );
  }

  return (
    <nav className="navigation navigation--list" aria-label="Main">
      {NAV_GROUPS.map((group) => (
        <section key={group.id} className="navigation__group" aria-label={group.label}>
          <p className="navigation__group-title">{group.label}</p>
          {group.items.map((item) => (
            <NavLink key={item.to} className={linkClass} to={item.to} onClick={onNavigate}>
              {item.label}
            </NavLink>
          ))}
        </section>
      ))}
    </nav>
  );
}

export default Navigation;
