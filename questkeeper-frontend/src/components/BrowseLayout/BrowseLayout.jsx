import { useEffect, useRef, useState } from "react";
import Button from "../Button/Button";
import DetailPanel from "../DetailPanel/DetailPanel";
import { getSourceLabel } from "../../utils/sourceFilters";
import "../../pages/SearchPage/SearchPage.css";
import "./BrowseLayout.css";

// The shared shape of every browse page (Races, Spells, Classes, Search...):
// how many entries match, loading and error messages, the cards, and the
// open entry's details beside them (or, on narrow screens, instead of them,
// with "Back to results").
//
// The page owns its own filters and cards (Magic Items' rarity chips,
// Classes' subclasses), so they stay as rich as each page needs; this only
// lays them out and keeps the messages consistent.
//
// selection: from useBrowseSelection (the open entry, its details, open and
// close). renderDetail(selection): a page's own details panel; the plain
// DetailPanel otherwise. children: the cards. footer: under the cards
// (Show more).
//
// Screen readers hear the count only after the player changes something,
// and only once they pause, never on every keystroke or on page load.
function BrowseLayout({
  noun,
  nounPlural = `${noun}s`,
  isLoading,
  loadError = false,
  onRetry,
  total,
  shownCount,
  isFiltered,
  emptyText,
  selection,
  renderDetail = null,
  footer = null,
  children,
}) {
  const countText = isFiltered
    ? `${shownCount.toLocaleString()} of ${total.toLocaleString()} ${nounPlural} match`
    : `${total.toLocaleString()} ${total === 1 ? noun : nounPlural}`;

  // The quiet announcement: set a moment after the count stops changing.
  const [announcement, setAnnouncement] = useState("");
  const firstCount = useRef(null);
  const ready = !isLoading && !loadError;
  useEffect(() => {
    if (!ready) return undefined;
    if (firstCount.current === null) {
      // The page just loaded: the count is on screen; nothing to announce.
      firstCount.current = countText;
      return undefined;
    }
    const timer = setTimeout(
      () => setAnnouncement(shownCount === 0 ? `No ${nounPlural} match.` : `${countText}.`),
      700,
    );
    return () => clearTimeout(timer);
  }, [ready, countText, shownCount, nounPlural]);

  // After the player presses "Try again", that button goes away; focus
  // moves to the count when the list arrives (a screen reader reads the
  // focused count, so nothing is announced on top of it), or back to Try
  // again if it failed again, so keyboard users never land at the page top.
  // Only a pressed Try again moves focus: the first load, or any load the
  // player didn't ask for, never does.
  const retrying = useRef(false);
  const countRef = useRef(null);
  const retryRef = useRef(null);
  function retry() {
    retrying.current = true;
    onRetry?.();
  }
  useEffect(() => {
    if (!retrying.current || isLoading) return undefined;
    retrying.current = false;
    if (loadError) {
      retryRef.current?.focus();
      return undefined;
    }
    countRef.current?.focus();
    return undefined;
  }, [isLoading, loadError]);

  const { selected } = selection;
  const detailOpen = Boolean(selected);
  // The "isn't in the list" line describes the details region (its
  // aria-describedby), so it's tied to the entry, not just placed near it.
  const outsideId = "browse-detail-outside";
  const describedBy = selection.isOutsideFilters ? outsideId : undefined;
  const detailSelection = { ...selection, describedBy };

  // The same for the details' own Try again: focus goes to the entry's
  // name once they arrive, or stays on Try again if they failed again.
  const retryingDetail = useRef(false);
  const detailRetryRef = useRef(null);
  useEffect(() => {
    if (!retryingDetail.current || selection.isDetailLoading) return;
    retryingDetail.current = false;
    if (selection.detailError) detailRetryRef.current?.focus();
    else if (selection.headingId) document.getElementById(selection.headingId)?.focus();
  }, [selection.isDetailLoading, selection.detailError, selection.headingId]);

  return (
    <>
      {isLoading && (
        <p className="search-page__status" role="status">
          Loading {nounPlural}…
        </p>
      )}
      {loadError && (
        <div className="search-page__error browse-layout__error" role="alert">
          Couldn&apos;t load the {nounPlural}. The rules server may be waking up.{" "}
          <Button variant="secondary" onClick={retry} ref={retryRef}>
            Try again
          </Button>
        </div>
      )}
      {ready && (
        <p className="search-page__count" ref={countRef} tabIndex={-1}>
          {countText}
        </p>
      )}
      <p className="browse-layout__announcer" role="status">
        {announcement}
      </p>
      {selection.isMissing && (
        <p className="search-page__status" role="status">
          That link&apos;s {noun} isn&apos;t in this list any more. Pick one below.
        </p>
      )}

      <section className={`search-page__layout${detailOpen ? " search-page__layout--detail-open" : ""}`}>
        <div className="search-page__results" aria-label={`${nounPlural} list`} role="region">
          {ready && shownCount === 0 && <p className="search-page__empty">{emptyText}</p>}
          {children}
          {footer}
        </div>

        {detailOpen && (
          <div className="search-page__detail-wrapper">
            <Button variant="secondary" className="search-page__back-button" onClick={selection.close}>
              ← Back to results
            </Button>
            {/* Reached by Back or Forward, but the current search or
                filters leave it out: said plainly, so it isn't mistaken for
                part of the list beside it. */}
            {selection.isOutsideFilters && (
              <p className="search-page__status browse-layout__outside" id={outsideId}>
                {selected.name} isn&apos;t in the list with your current search or filters.
              </p>
            )}
            {selection.isDetailLoading && (
              <p className="search-page__status" role="status">
                Loading {selected.name}…
              </p>
            )}
            {selection.detailError && (
              <div className="search-page__error browse-layout__error" role="alert">
                Couldn&apos;t load more about {selected.name}.{" "}
                <Button
                  variant="secondary"
                  ref={detailRetryRef}
                  onClick={() => {
                    retryingDetail.current = true;
                    selection.retryDetail();
                  }}
                >
                  Try again
                </Button>
              </div>
            )}
            {/* Until the details arrive (or if they didn't), just the name and
                where it's from: never a panel of empty "Speed:" lines. */}
            {!selection.detail && (selection.isDetailLoading || selection.detailError) ? (
              <section className="detail-panel" aria-labelledby={selection.headingId} aria-describedby={describedBy}>
                <div className="flex-header-row detail-panel__header">
                  <h2 className="detail-panel__title" id={selection.headingId} tabIndex={-1}>
                    {selected.name}
                  </h2>
                </div>
                <p className="detail-panel__type">
                  {selected.category}
                  {getSourceLabel(selected) !== "SRD" || selected.source ? ` · ${getSourceLabel(selected)}` : ""}
                  {selected.edition ? ` · ${selected.edition} rules` : ""}
                </p>
              </section>
            ) : renderDetail ? (
              renderDetail(detailSelection)
            ) : (
              <DetailPanel
                selectedResult={selection.detail ?? selected}
                headingId={selection.headingId}
                describedBy={describedBy}
              />
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default BrowseLayout;
