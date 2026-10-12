import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_GROUPS, activeGroupIndex } from "./navGroups";
import "./NavMenus.css";

// How long the pointer rests on a menu name before it opens, and how long it
// can wander off before the menu closes (so a shaky hand doesn't lose it).
const HOVER_OPEN_MS = 140;
const HOVER_CLOSE_MS = 260;
// A click right after hovering open keeps the menu open instead of closing it.
const HOVER_CLICK_GRACE_MS = 500;

// Wide screens: three menu names in the header. Each opens an open book: the
// menu's title and first pages on the left, the rest on the right.
//
// Opens on click (or Enter/Space), or by resting the mouse on it. Closes on
// Esc, a click elsewhere, picking a page, or moving to another page.
// Keyboard: ↓ opens and moves into the menu, ↑ ↓ Home End move between pages,
// ← → move between the three menus.
function NavMenus() {
  const { pathname } = useLocation();
  // Which menu is open, and on which page it was opened. Moving to another
  // page closes it without an effect: it only counts on the page it opened on.
  const [open, setOpen] = useState(null);
  const openId = open && open.path === pathname ? open.id : null;

  const rootRef = useRef(null);
  const triggerRefs = useRef({});
  const hoverTimer = useRef(0);
  const hoverOpenedAt = useRef(0);
  const focusFirstItem = useRef(false);
  const activeGroup = activeGroupIndex(pathname);

  function openMenu(id) {
    setOpen({ id, path: pathname });
  }

  function closeMenu() {
    setOpen(null);
  }

  // A click or tap anywhere outside the menus closes them.
  useEffect(() => {
    if (!openId) return undefined;
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openId]);

  // After ↓ on a menu name, focus its first page once the book is drawn.
  useEffect(() => {
    if (openId && focusFirstItem.current) {
      focusFirstItem.current = false;
      firstItem()?.focus();
    }
  }, [openId]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  function firstItem() {
    return rootRef.current?.querySelector(".nav-book__item");
  }

  // --- Mouse hover (touch and pen use taps instead) -------------------------

  function handleTriggerEnter(event, id) {
    if (event.pointerType !== "mouse") return;
    clearTimeout(hoverTimer.current);
    // Already browsing the menus: switch straight away.
    const delay = openId ? 0 : HOVER_OPEN_MS;
    hoverTimer.current = setTimeout(() => {
      hoverOpenedAt.current = Date.now();
      openMenu(id);
    }, delay);
  }

  function handleRootEnter() {
    clearTimeout(hoverTimer.current);
  }

  function handleRootLeave(event) {
    if (event.pointerType !== "mouse") return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(closeMenu, HOVER_CLOSE_MS);
  }

  // --- Clicks and keys --------------------------------------------------------

  function handleTriggerClick(id) {
    clearTimeout(hoverTimer.current);
    const justHovered = Date.now() - hoverOpenedAt.current < HOVER_CLICK_GRACE_MS;
    if (openId === id && !justHovered) closeMenu();
    else openMenu(id);
    hoverOpenedAt.current = 0;
  }

  function handleTriggerKeyDown(event, index) {
    const group = NAV_GROUPS[index];
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (openId === group.id) {
        firstItem()?.focus();
      } else {
        focusFirstItem.current = true;
        openMenu(group.id);
      }
    } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next = NAV_GROUPS[(index + step + NAV_GROUPS.length) % NAV_GROUPS.length];
      triggerRefs.current[next.id]?.focus();
      // Keep a menu open while moving along, like a menu bar.
      if (openId) openMenu(next.id);
    }
  }

  function handlePanelKeyDown(event) {
    // The book's pages in reading order: down the left page, then the right.
    const items = [...event.currentTarget.querySelectorAll(".nav-book__item")];
    const current = items.indexOf(document.activeElement);
    const last = items.length - 1;
    const next = {
      ArrowDown: current === last ? 0 : current + 1,
      ArrowUp: current <= 0 ? last : current - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    items[next]?.focus();
  }

  function handleRootKeyDown(event) {
    if (event.key !== "Escape" || !openId) return;
    triggerRefs.current[openId]?.focus();
    closeMenu();
  }

  // Tabbing out of the menus closes them.
  function handleRootBlur(event) {
    if (openId && !rootRef.current?.contains(event.relatedTarget)) closeMenu();
  }

  const openGroup = NAV_GROUPS.find((group) => group.id === openId);

  return (
    <div
      className="nav-menus"
      ref={rootRef}
      onPointerEnter={handleRootEnter}
      onPointerLeave={handleRootLeave}
      onKeyDown={handleRootKeyDown}
      onBlur={handleRootBlur}
    >
      {NAV_GROUPS.map((group, index) => (
        <button
          key={group.id}
          ref={(element) => {
            triggerRefs.current[group.id] = element;
          }}
          type="button"
          className={[
            "nav-menus__trigger",
            index === activeGroup && "nav-menus__trigger--active",
            openId === group.id && "nav-menus__trigger--open",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={openId === group.id}
          aria-controls={`nav-book-${group.id}`}
          onPointerEnter={(event) => handleTriggerEnter(event, group.id)}
          onClick={() => handleTriggerClick(group.id)}
          onKeyDown={(event) => handleTriggerKeyDown(event, index)}
        >
          {group.label}
          <svg className="nav-menus__chevron" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2.5 4.5 6 8l3.5-3.5" />
          </svg>
        </button>
      ))}

      {openGroup && (
        <NavBook
          // A fresh book per menu, so switching menus replays the opening.
          key={openGroup.id}
          group={openGroup}
          onKeyDown={handlePanelKeyDown}
          onPick={closeMenu}
        />
      )}
    </div>
  );
}

// One open book: title and the first pages on the left, the rest on the right
// (Explore's five pages sit two and three, so the pages come out even).
function NavBook({ group, onKeyDown, onPick }) {
  const split = Math.floor(group.items.length / 2);
  const pages = [group.items.slice(0, split), group.items.slice(split)];

  return (
    <div
      // A menu with only two pages gets a slimmer book.
      className={`nav-book${group.items.length <= 2 ? " nav-book--slim" : ""}`}
      id={`nav-book-${group.id}`}
      aria-label={group.label}
      role="group"
      onKeyDown={onKeyDown}
    >
      {pages.map((items, page) => (
        <div
          key={page}
          className={`nav-book__page nav-book__page--${page === 0 ? "left" : "right"}`}
        >
          {page === 0 && (
            <div className="nav-book__heading">
              <p className="nav-book__title">{group.label}</p>
              <p className="nav-book__blurb">{group.blurb}</p>
            </div>
          )}
          <ul className="nav-book__list">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  className="nav-book__item"
                  to={item.to}
                  onClick={onPick}
                >
                  {item.icon && (
                    <img className="nav-book__icon" src={item.icon} alt="" />
                  )}
                  <span className="nav-book__text">
                    <span className="nav-book__name">
                      {item.label}
                      {item.tag && <span className="nav-book__tag">{item.tag}</span>}
                    </span>
                    <span className="nav-book__hint">{item.hint}</span>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="nav-book__spine" aria-hidden="true" />
    </div>
  );
}

export default NavMenus;
