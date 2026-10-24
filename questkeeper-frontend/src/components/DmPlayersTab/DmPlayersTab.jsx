import { useEffect, useRef, useState } from "react";
import CharacterAvatar from "../CharacterAvatar/CharacterAvatar";
import CharacterSummaryCard, { AcShield } from "../CharacterSummaryCard/CharacterSummaryCard";
import { toPartyRow } from "../../utils/partyStrip";
import "./DmPlayersTab.css";

// True while the element actually has more to scroll than fits. A scroll area
// only joins the Tab order then (so a keyboard can scroll it with the arrow keys);
// at narrow widths and high zoom the page scrolls instead and it stays out of the way.
function useScrollable(ref) {
  const [scrollable, setScrollable] = useState(typeof ResizeObserver === "undefined");
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    function measure() {
      setScrollable(element.scrollHeight > element.clientHeight + 1);
    }
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(element);
    Array.from(element.children).forEach((child) => watcher.observe(child));
    return () => watcher.disconnect();
  });
  return scrollable;
}

// The DM screen's Players tab: "Your players" on the left (one card each) and
// the picked player's read-only overview on the right (or every player's, with
// "Show all"). Read-only on purpose: players manage their own sheets, so nothing
// here changes anyone's HP, stats, spells or choices.
//
// characters: the full sheets the DM can read.
// selectedId: a character's id, "all", or "" (the first character).
// onSelect(id): called with a character's id or "all".
// bannedFor(sheet): what that character uses that the table doesn't allow.
// shareControl: the "let players see the party's HP" checkbox, shown folded
// away under the list. partyShared says which way it is set right now.
// children: anything the page wants under the list (players removed for good).
function DmPlayersTab({
  characters,
  selectedId,
  onSelect,
  bannedFor = () => [],
  shareControl = null,
  partyShared = false,
  sectionRef = null,
  children = null,
}) {
  // On narrow screens the list folds to one line (wide screens always show it).
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const sideRef = useRef(null);
  const sheetRef = useRef(null);
  const sideScrolls = useScrollable(sideRef);
  const sheetScrolls = useScrollable(sheetRef);

  const count = characters.length;
  const showAll = selectedId === "all" && count > 1;
  const selected = characters.find((sheet) => sheet.id === selectedId) ?? characters[0];
  const glance = showAll ? "All players" : selected?.name;

  function pick(id) {
    onSelect(id);
    // Folded away on a narrow screen: close the list so the overview is right
    // there, and keep the keyboard on the button that reopens it.
    if (open) {
      setOpen(false);
      toggleRef.current?.focus();
    }
  }

  return (
    <div className="dm-players" ref={sectionRef}>
      <section className="dm-players__list-panel table-page__section--panel" aria-labelledby="players-title">
        <header className="table-page__slim-head table-page__slim-head--bar">
          <h2 id="players-title" className="table-page__slim-title">
            Your players{count > 0 ? ` · ${count}` : ""}
          </h2>
          {count > 1 && (
            <button
              type="button"
              className={`dm-players__all${showAll ? " dm-players__all--active" : ""}`}
              aria-pressed={showAll}
              onClick={() => pick("all")}
            >
              Show all
            </button>
          )}
        </header>

        {count === 0 ? (
          <p className="dm-players__empty">
            Characters appear here when players join. You can read everything but cannot edit any sheet.
          </p>
        ) : (
          <>
            <button
              type="button"
              ref={toggleRef}
              className="dm-players__toggle"
              aria-expanded={open}
              aria-controls="players-list"
              onClick={() => setOpen((value) => !value)}
            >
              <span>{glance}</span>
              <span className="dm-players__toggle-word">{open ? "Hide players" : "Choose a player"}</span>
            </button>
            <div id="players-list" className={`dm-players__side${open ? " dm-players__side--open" : ""}`} ref={sideRef} tabIndex={sideScrolls ? 0 : undefined} role="group" aria-label="Player list">
              <ul className="dm-players__picker" aria-label="Players">
                {characters.map((sheet) => {
                  const row = toPartyRow(sheet);
                  const flagged = bannedFor(sheet).length > 0;
                  const active = !showAll && sheet.id === selected.id;
                  return (
                    <li key={sheet.id}>
                      <button
                        type="button"
                        className={`dm-players__pick${active ? " dm-players__pick--active" : ""}`}
                        aria-pressed={active}
                        onClick={() => pick(sheet.id)}
                      >
                        <span className="dm-players__avatar" aria-hidden="true">
                          <CharacterAvatar character={row} />
                        </span>
                        <span className="dm-players__pick-text">
                          <span className="dm-players__pick-name">{row.name}</span>
                          <span className="dm-players__pick-sub">{row.summary || "Adventurer"}</span>
                          <span
                            className={`dm-players__bar${row.health === "bloodied" || row.health === "down" ? " dm-players__bar--low" : ""}`}
                            aria-hidden="true"
                          >
                            <span style={{ width: `${row.hpPercent}%` }} />
                          </span>
                          <span className="dm-players__pick-hp">
                            {row.hp.current}/{row.hp.max} HP
                          </span>
                          {flagged && (
                            <span className="dm-players__flag">
                              <span aria-hidden="true">⚠ </span>Uses options not allowed here
                            </span>
                          )}
                        </span>
                        <AcShield value={row.armorClass} />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {shareControl && (
                <details className="dm-players__share">
                  <summary>{partyShared ? "Players can see party stats" : "Party stats hidden from players"}</summary>
                  {shareControl}
                </details>
              )}
              {children}
            </div>
          </>
        )}
      </section>

      {count > 0 && (
        <section className="dm-players__sheet-panel table-page__section--panel" aria-label="Character overview">
          <header className="table-page__slim-head table-page__slim-head--bar">
            <h2 className="table-page__slim-title">{showAll ? "All players" : selected.name}</h2>
            <span className="dm-players__readonly">Read-only · Players manage their own sheets</span>
          </header>
          <div className="dm-players__sheet" ref={sheetRef} tabIndex={sheetScrolls ? 0 : undefined} role="region" aria-label={showAll ? "All players, overviews" : `${selected.name}, overview`}>
            {(showAll ? characters : [selected]).map((sheet) => (
              <CharacterSummaryCard key={sheet.id} sheet={sheet} bannedChoices={bannedFor(sheet)} />
            ))}
          </div>
        </section>
      )}
      {count === 0 && children}
    </div>
  );
}

export default DmPlayersTab;
