import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType, useSearchParams } from "react-router-dom";
import { getPageTitle } from "../utils/pageTitle";

// The page-address words a link uses to open one entry, e.g. quick-jump's
// "/races?open=elf" or "/classes?open=wizard&subclass=evocation". They're
// kept in the address while the entry is open (so it can be shared and
// reloaded) and removed together when it closes.
const OPEN_PARAMS = ["open", "edition", "subclass"];

// --- Browsing a list with a details panel (Races, Spells, Search...) --------------
//
// The open entry lives in the page address ("/spells?open=fireball", plus
// "&edition=2024" where an entry has more than one edition), so a selection
// can be shared, survives a reload, and works with the browser's Back and
// Forward: opening an entry adds a history step, and Back closes it again.
//
// It also takes care of the things people relying on a keyboard, a screen
// reader or a small screen need:
// - opening moves focus to the details' heading (and scrolls it into view),
//   and the tab title names the entry;
// - closing (Back to results, or the browser's Back) puts focus back on the
//   card that opened it, where the list was scrolled to;
// - an entry the filters no longer show is closed, so details never sit
//   beside a list that doesn't contain them.
//
// items: the whole list. visibleItems: the same list after search and
// filters (what the cards show). ready: true once the list has loaded.
// keyOf(item): its id in the address. label(item): its name for the tab.
// loadDetail(item): a promise of what the details panel shows.

const DETAIL_HEADING_ID = "browse-detail-heading";
export const browseCardKey = (key) => `browse-card-${String(key).replace(/[^\w-]/g, "_")}`;

// The id in the address: the entry's own id (ids are already unique per
// book: "elf", "toh_minotaur", "book_minotaur"); the edition goes in its
// own word when an entry has one, so 2014 and 2024 Fireball differ.
const defaultKey = (item) => item.index;

export function useBrowseSelection({
  items,
  visibleItems = items,
  ready,
  keyOf = defaultKey,
  label = (item) => item.name,
  loadDetail = null,
}) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // One entry's identity on this page (its id and edition), for focus.
  const idOf = (item) => (item.edition ? `${keyOf(item)}~${item.edition}` : keyOf(item));
  const openKey = searchParams.get("open");
  const edition = searchParams.get("edition");

  const selected = openKey
    ? (items.find((item) => keyOf(item) === openKey && (!edition || !item.edition || item.edition === edition)) ??
      null)
    : null;

  // The address without the open entry (keeping filters and anything else).
  function withoutOpen() {
    const next = new URLSearchParams(searchParams);
    // The link words that belong to the open entry (see OPEN_PARAMS).
    OPEN_PARAMS.forEach((name) => next.delete(name));
    const search = next.toString();
    return { pathname: location.pathname, search: search ? `?${search}` : "" };
  }

  // Where the list was, so closing can go back to it.
  const returnTo = useRef(null);

  function open(item) {
    const next = new URLSearchParams(searchParams);
    // A subclass from an earlier link belongs to that entry only.
    next.delete("subclass");
    next.set("open", keyOf(item));
    if (item.edition) next.set("edition", item.edition);
    else next.delete("edition");
    returnTo.current = { key: idOf(item), scrollY: window.scrollY };
    focusOnOpen.current = true;
    // A new history step only when coming from the list, so moving between
    // entries in the two-column layout doesn't pile up Back presses. The
    // list's address is remembered (browseFrom), so closing knows whether a
    // step back still leads to the same list.
    const switching = Boolean(openKey) && location.state?.browseOpened;
    navigate(
      { pathname: location.pathname, search: `?${next.toString()}` },
      {
        replace: Boolean(openKey),
        state: {
          ...(location.state ?? {}),
          browseOpened: true,
          browseFrom: switching ? location.state.browseFrom : location.search,
        },
      },
    );
  }

  // The page's own history state without this hook's notes.
  function listState() {
    const rest = { ...(location.state ?? {}) };
    delete rest.browseOpened;
    delete rest.browseFrom;
    return Object.keys(rest).length ? rest : null;
  }

  // Back to the list. Opened from this same list: a step back returns to
  // exactly that list (rather than adding a second copy of it, which would
  // make the next Back seem to do nothing). If the address changed while it
  // was open (Magic Items' filters live there), a step back would undo that,
  // so the entry is replaced instead.
  function close() {
    const target = withoutOpen();
    if (location.state?.browseOpened && (location.state.browseFrom ?? "") === target.search) navigate(-1);
    else navigate(target, { replace: true, state: listState() });
  }

  // A filter or search the player changes that hides the open entry closes
  // it, quietly: focus stays in the filter or search box they're using.
  //
  // Arriving by Back or Forward at an entry the current filters hide is
  // different: the player asked for that entry, and closing it would make
  // that Back or Forward seem to do nothing. It stays open, labelled as
  // outside the filters (isOutsideFilters), until they go back to results.
  const hidden = Boolean(ready && selected && !visibleItems.includes(selected));
  const navigationType = useNavigationType();
  const [arrival, setArrival] = useState({ key: location.key, hidden });
  if (arrival.key !== location.key) setArrival({ key: location.key, hidden });
  const keptByHistory = hidden && arrival.hidden && navigationType === "POP";
  const closedByFilter = useRef(false);
  useEffect(() => {
    if (!hidden || keptByHistory) return;
    closedByFilter.current = true;
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, keptByHistory]);

  // Focus and tab title follow the open entry. Opening by a click or a key
  // moves focus to the details; closing returns it to the card.
  const focusOnOpen = useRef(false);
  const previousKey = useRef(null);
  const selectedKey = selected ? idOf(selected) : null;
  const selectedLabel = selected ? label(selected) : "";
  useEffect(() => {
    const base = getPageTitle(location.pathname);
    document.title = selectedKey ? `${selectedLabel} · ${base}` : base;

    if (selectedKey && focusOnOpen.current) {
      focusOnOpen.current = false;
      const heading = document.getElementById(DETAIL_HEADING_ID);
      if (heading) {
        heading.focus({ preventScroll: true });
        heading.scrollIntoView?.({ block: "nearest" });
      }
    } else if (!selectedKey && previousKey.current && closedByFilter.current) {
      closedByFilter.current = false;
    } else if (!selectedKey && previousKey.current) {
      // Back to the list where it was, with focus on the card that opened it.
      const card = document.getElementById(browseCardKey(previousKey.current));
      const remembered = returnTo.current?.key === previousKey.current ? returnTo.current : null;
      if (remembered) window.scrollTo?.(0, remembered.scrollY);
      card?.focus({ preventScroll: Boolean(remembered) });
      if (!remembered) card?.scrollIntoView?.({ block: "center" });
    }
    previousKey.current = selectedKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, selectedLabel]);

  // The details for the open entry, loaded once per entry. Until they
  // arrive the panel shows what the card knows.
  const [detail, setDetail] = useState({ key: null, data: null, error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!selected || !loadDetail) return undefined;
    let ignore = false;
    Promise.resolve(loadDetail(selected))
      .then((data) => !ignore && setDetail({ key: selectedKey, data, error: "" }))
      .catch(() => !ignore && setDetail({ key: selectedKey, data: null, error: "failed" }));
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, attempt]);
  const current = detail.key === selectedKey ? detail : { data: null, error: "" };

  return {
    selected,
    selectedKey,
    open,
    close,
    detail: current.data,
    detailError: Boolean(selected && current.error),
    isDetailLoading: Boolean(selected && loadDetail && !current.data && !current.error),
    // Back to "loading" first, so a second failure is a fresh, announced one.
    retryDetail: () => {
      setDetail({ key: null, data: null, error: "" });
      setAttempt((count) => count + 1);
    },
    // Open, but not in the filtered list (reached by Back or Forward).
    isOutsideFilters: keptByHistory,
    // A link to an entry that isn't in the list (a typo, or removed).
    isMissing: Boolean(ready && openKey && !selected),
    headingId: DETAIL_HEADING_ID,
    cardId: (item) => browseCardKey(idOf(item)),
  };
}
