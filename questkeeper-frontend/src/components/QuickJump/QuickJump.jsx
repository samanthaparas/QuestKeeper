import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { clearRecent, loadRecent, rankResults, saveRecent } from "../../utils/quickJump";
import { loadCharacterEntries, loadContentLists, pageEntries } from "../../utils/quickJumpIndex";
import "./QuickJump.css";

// Whether the player is typing somewhere, so "/" types a slash instead of
// opening the search.
function isTyping(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function SearchIcon() {
  return (
    <svg className="quick-jump__icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="m13 13 4.5 4.5" />
    </svg>
  );
}

// The header's Search button, plus the shortcuts: "/" anywhere you're not
// typing, or ⌘K (Ctrl+K on Windows) anywhere at all.
function QuickJump() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      const isShortcut =
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") ||
        (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping(event.target));
      if (!isShortcut) return;
      event.preventDefault();
      // ⌘K again closes it, like most apps.
      setIsOpen((open) => !open);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        className="quick-jump__button"
        aria-label="Search QuestKeeper"
        aria-keyshortcuts="/ Control+K Meta+K"
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        <SearchIcon />
        <span className="quick-jump__button-text">Search</span>
        <kbd className="quick-jump__kbd">/</kbd>
      </button>

      {/* Only exists while open, so every search starts fresh. */}
      {isOpen && <QuickJumpDialog onClose={() => setIsOpen(false)} />}
    </>
  );
}

// The search box and its results. ↑ ↓ move, Enter opens, Esc closes.
function QuickJumpDialog({ onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const listId = useId();
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  const [query, setQuery] = useState("");
  // Groups opened with "Show all" (reset with each new search).
  const [expanded, setExpanded] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  // Races, spells and the rest: one loading list each, fetched the first
  // time the search opens and then kept for the visit.
  const [lists] = useState(loadContentLists);
  // Pages are built in, so they're searchable before anything loads.
  const [content, setContent] = useState(pageEntries);
  const [pending, setPending] = useState(lists.length); // lists still loading
  const isLoading = pending > 0;
  const [characters, setCharacters] = useState([]);
  const [recent, setRecent] = useState(loadRecent);

  // Each list joins the results as soon as it arrives.
  useEffect(() => {
    let ignore = false;
    const arrived = lists.map(() => []);
    lists.forEach((list, position) =>
      list.then((entries) => {
        if (ignore) return;
        arrived[position] = entries;
        setContent(arrived.flat());
        setPending((count) => count - 1);
      }),
    );
    return () => {
      ignore = true;
    };
  }, [lists]);

  // The signed-in player's own characters.
  useEffect(() => {
    if (!userId) return undefined;
    let ignore = false;
    loadCharacterEntries().then((entries) => !ignore && setCharacters(entries));
    return () => {
      ignore = true;
    };
  }, [userId]);

  // While open: the page behind doesn't scroll, and closing puts focus back
  // where it was (usually the Search button).
  useEffect(() => {
    const returnFocusTo = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (returnFocusTo instanceof HTMLElement) returnFocusTo.focus();
    };
  }, []);

  // Empty box: recent picks, then every page. Otherwise: the best matches.
  const sections = useMemo(() => {
    if (!query.trim()) {
      return [
        ...(recent.length > 0 ? [{ category: "Recent", entries: recent }] : []),
        { category: "Pages", entries: pageEntries() },
      ];
    }
    return rankResults([...content, ...(userId ? characters : [])], query, expanded).map((section) => ({
      ...section,
      // A last row that shows the rest of a cut-short group.
      entries:
        section.total > section.entries.length
          ? [...section.entries, { id: `more:${section.category}`, showAll: section }]
          : section.entries,
    }));
  }, [query, content, characters, recent, userId, expanded]);

  const options = sections.flatMap((section) => section.entries);
  // Where each section's results start in that one flat list.
  const sectionStarts = [];
  for (let i = 0, start = 0; i < sections.length; i += 1) {
    sectionStarts.push(start);
    start += sections[i].entries.length;
  }
  const active = Math.min(activeIndex, options.length - 1);
  const optionId = (index) => `${listId}-option-${index}`;

  // Keep the highlighted result in view while arrowing through a long list.
  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView?.({ block: "nearest" });
    // optionId only changes with listId, which never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function pick(entry) {
    if (entry.showAll) {
      setExpanded((open) => [...open, entry.showAll.category]);
      return;
    }
    setRecent(saveRecent(entry));
    onClose();
    navigate(entry.to);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((active + step + options.length) % options.length);
    } else if (event.key === "Enter" && options[active]) {
      event.preventDefault();
      pick(options[active]);
    } else if (event.key === "Tab") {
      // Keep Tab inside the dialog (the box and the Clear button).
      const focusable = [...dialogRef.current.querySelectorAll("input, button")];
      const current = focusable.indexOf(document.activeElement);
      const next = (current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      event.preventDefault();
      focusable[next]?.focus();
    }
  }

  return (
    <div className="quick-jump__overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="quick-jump__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search QuestKeeper"
        onKeyDown={handleKeyDown}
      >
        <div className="quick-jump__field">
          <SearchIcon />
          <input
            ref={inputRef}
            className="quick-jump__input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={options[active] ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-label="Search pages, races, classes, spells, items and more"
            placeholder="Jump to a page, race, class, spell, item..."
            autoComplete="off"
            spellCheck="false"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
              setExpanded([]);
            }}
          />
          <kbd className="quick-jump__kbd">Esc</kbd>
        </div>

        <div className="quick-jump__results" id={listId} role="listbox" aria-label="Results">
          {sections.map((section, sectionIndex) => (
            <div key={section.category} className="quick-jump__section" role="group" aria-label={section.category}>
              <div className="quick-jump__section-title" role="presentation">
                {section.category}
                {section.category === "Recent" && (
                  <button type="button" className="quick-jump__clear" onClick={() => setRecent(clearRecent())}>
                    Clear
                  </button>
                )}
              </div>
              {section.entries.map((entry, entryIndex) => {
                const index = sectionStarts[sectionIndex] + entryIndex;
                return (
                  <div
                    key={`${section.category}:${entry.id}`}
                    id={optionId(index)}
                    role="option"
                    aria-selected={index === active}
                    className={`quick-jump__option${index === active ? " quick-jump__option--active" : ""}`}
                    onPointerMove={() => index !== active && setActiveIndex(index)}
                    onClick={() => pick(entry)}
                  >
                    {entry.showAll ? (
                      <span className="quick-jump__more">
                        Show all {entry.showAll.total} {entry.showAll.category.toLowerCase()}
                      </span>
                    ) : (
                      <>
                        <span className="quick-jump__label">{entry.label}</span>
                        {entry.hint && <span className="quick-jump__hint">{entry.hint}</span>}
                      </>
                    )}
                    {/* Recent picks keep their kind, since they're mixed. */}
                    {section.category === "Recent" && <span className="quick-jump__kind">{entry.category}</span>}
                  </div>
                );
              })}
            </div>
          ))}

          {query.trim() && options.length === 0 && (
            <p className="quick-jump__status">
              {isLoading ? "Still loading races, spells and more..." : `Nothing matches "${query.trim()}".`}
            </p>
          )}
        </div>

        <p className="quick-jump__footer" aria-hidden="true">
          <span><kbd className="quick-jump__kbd">↑</kbd> <kbd className="quick-jump__kbd">↓</kbd> move</span>
          <span><kbd className="quick-jump__kbd">Enter</kbd> open</span>
          <span><kbd className="quick-jump__kbd">Esc</kbd> close</span>
          {isLoading && <span className="quick-jump__loading">Loading more results...</span>}
        </p>
      </div>
    </div>
  );
}

export default QuickJump;
