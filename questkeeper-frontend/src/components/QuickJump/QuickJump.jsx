import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import {
  aiResultLink,
  clearRecent,
  loadRecent,
  OPEN_SEARCH_EVENT,
  rankResults,
  saveRecent,
} from "../../utils/quickJump";
import { searchByMeaning } from "../../utils/api";
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
  // Words another page asked it to open with (see openQuickSearch).
  const [request, setRequest] = useState(null);

  useEffect(() => {
    function handleOpen(event) {
      setRequest(event.detail ?? null);
      setIsOpen(true);
    }
    window.addEventListener(OPEN_SEARCH_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, handleOpen);
  }, []);

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
      {isOpen && (
        <QuickJumpDialog
          initialQuery={request?.query ?? ""}
          startMeaning={Boolean(request?.meaning)}
          onClose={() => {
            setIsOpen(false);
            setRequest(null);
          }}
        />
      )}
    </>
  );
}

// The "✨ Search by meaning" row: what it will do, then "Thinking...", then
// a short note if nothing came back.
function AskAiRow({ query, search }) {
  if (search?.status === "loading") {
    return (
      <span className="quick-jump__label quick-jump__ai" aria-live="polite">
        ✨ Looking for things that mean &ldquo;{query}&rdquo;...
      </span>
    );
  }
  return (
    <>
      <span className="quick-jump__label quick-jump__ai">✨ Search by meaning: &ldquo;{query}&rdquo;</span>
      <span className="quick-jump__hint" aria-live="polite">
        {search?.status === "done"
          ? search.message || "Nothing fits that. Try other words."
          : "Finds spells, items, classes and more that match what you mean, using AI"}
      </span>
    </>
  );
}

// The search box and its results. ↑ ↓ move, Enter opens, Esc closes.
//
// Below the name matches there's always "✨ Search by meaning": it asks the
// backend (Claude) for entries that match what the words mean ("heal",
// "sneak past guards"), each with a short reason. It only runs when picked,
// never on every keystroke, so it doesn't cost anything until it's used.
function QuickJumpDialog({ onClose, initialQuery = "", startMeaning = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const listId = useId();
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  const [query, setQuery] = useState(initialQuery);
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
  // The latest search by meaning: { query, status: "loading" | "done",
  // results, message }. It belongs to the words it was asked for, so typing
  // something new puts the "Search by meaning" row back.
  const [aiSearch, setAiSearch] = useState(null);

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
    const byName = rankResults([...content, ...(userId ? characters : [])], query, expanded).map((section) => ({
      ...section,
      // A last row that shows the rest of a cut-short group.
      entries:
        section.total > section.entries.length
          ? [...section.entries, { id: `more:${section.category}`, showAll: section }]
          : section.entries,
    }));
    if (query.trim().length < 2) return byName;

    const asked = aiSearch?.query === query.trim() ? aiSearch : null;
    const aiEntries =
      asked?.status === "done" && asked.results.length > 0
        ? asked.results.map((result) => ({
            id: `ai:${result.id}`,
            label: result.name,
            hint: result.why,
            category: result.category,
            to: aiResultLink(result, content),
            fromAi: true,
          }))
        : [{ id: "ai:ask", askAi: true }];
    return [...byName, { category: "Search by meaning", entries: aiEntries }];
  }, [query, content, characters, recent, userId, expanded, aiSearch]);
  const nameMatchCount = sections
    .filter((section) => section.category !== "Search by meaning")
    .reduce((count, section) => count + section.entries.length, 0);

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

  // Opened with a description to search by meaning: ask straight away, and
  // only once (each search by meaning is a paid request, so a remount in
  // development mode must not ask twice).
  const askedOnOpen = useRef(false);
  useEffect(() => {
    if (askedOnOpen.current || !startMeaning || initialQuery.trim().length < 2) return;
    askedOnOpen.current = true;
    askAi();
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function askAi() {
    const asked = query.trim();
    if (aiSearch?.query === asked && aiSearch.status === "loading") return;
    setAiSearch({ query: asked, status: "loading", results: [], message: "" });
    const { results, message } = await searchByMeaning(asked);
    // Only if the box still says the same thing.
    setAiSearch((current) =>
      current?.query === asked ? { query: asked, status: "done", results, message: message ?? "" } : current,
    );
  }

  function pick(entry) {
    if (entry.showAll) {
      setExpanded((open) => [...open, entry.showAll.category]);
      return;
    }
    if (entry.askAi) {
      askAi();
      return;
    }
    if (!entry.to) return;
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
                    ) : entry.askAi ? (
                      <AskAiRow query={query.trim()} search={aiSearch?.query === query.trim() ? aiSearch : null} />
                    ) : (
                      <>
                        <span className="quick-jump__label">{entry.label}</span>
                        {entry.hint && <span className="quick-jump__hint">{entry.hint}</span>}
                      </>
                    )}
                    {/* Recent picks and AI results keep their kind, since they're mixed. */}
                    {(section.category === "Recent" || entry.fromAi) && (
                      <span className="quick-jump__kind">{entry.category}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {query.trim() && nameMatchCount === 0 && (
            <p className="quick-jump__status">
              {isLoading
                ? "Still loading races, spells and more..."
                : `No names match "${query.trim()}".${query.trim().length >= 2 ? " Try Search by meaning above." : ""}`}
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
