import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { getMagicItemCatalog } from "../../utils/api";
import { useBrowseSelection } from "../../hooks/useOpenFromLink";
import BrowseLayout from "../../components/BrowseLayout/BrowseLayout";
import { dedupeEntries, entryKey } from "../../utils/browseList";
import { BOOK_MAGIC_ITEMS } from "../../utils/bookMagicItems";
import {
  filterMagicItems,
  filtersFromParams,
  filtersToParams,
  activeFilterCount,
} from "../../utils/magicItemFilters";
import Button from "../../components/Button/Button";
import MagicItemCard from "./MagicItemCard";
import MagicItemDetail from "./MagicItemDetail";
import MagicItemFilters from "./MagicItemFilters";
import "../SearchPage/SearchPage.css";
import "./MagicItemsPage.css";

const PAGE_SIZE = 60;

// Browse every magic item: SRD 5.1 and 5.2, Vault of Magic, and the official
// books (facts and a link). Filters live in the page address, so a filtered
// list can be bookmarked or shared.
function MagicItemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const [catalog, setCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Bumped by "Try again" after the catalog failed to load.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    getMagicItemCatalog()
      .then((items) => {
        if (ignore) return;
        setCatalog(items);
        setLoadError("");
      })
      .catch(
        () =>
          !ignore &&
          setLoadError("Couldn't load the SRD and Vault of Magic items right now. The official book items are still listed below."),
      )
      .finally(() => !ignore && setIsLoading(false));
    return () => {
      ignore = true;
    };
  }, [attempt]);

  // One list for the cards, the count and "no items match".
  const allItems = useMemo(() => dedupeEntries([...catalog, ...BOOK_MAGIC_ITEMS]), [catalog]);
  // Search text first, so the source buttons' counts follow the search.
  const searchMatches = useMemo(() => filterMagicItems(allItems, { q: filters.q }), [allItems, filters.q]);
  const results = useMemo(() => filterMagicItems(allItems, filters), [allItems, filters]);
  const visible = results.slice(0, visibleCount);
  const remaining = results.length - visible.length;

  // The open item lives in the address with the filters (?rarity=rare&open=
  // ...), so it can be shared and reloaded; a filter that hides it closes it.
  // The book items are there from the start; this waits for the catalog.
  const selection = useBrowseSelection({ items: allItems, visibleItems: results, ready: !isLoading });

  function updateFilters(next) {
    // Keeps the open item (if the new filters still show it).
    const params = filtersToParams(next);
    ["open", "edition"].forEach((name) => {
      if (searchParams.get(name)) params[name] = searchParams.get(name);
    });
    setSearchParams(params, { replace: true, state: location.state });
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <main className="search-page magic-items-page">
      <div className="search-page__content">
        <h1 className="search-page__title">Magic Items</h1>
        <p className="search-page__description">
          Browse every magic item by rarity, type, where it's worn, who can use
          it and what it's good for. SRD and Vault of Magic items include their
          full text; items from the official books list their facts and link to
          the full write-up.
        </p>

        <label className="magic-items-page__search" htmlFor="mi-search">
          <span className="magic-item-filters__label">Search by name</span>
          <input
            id="mi-search"
            className="magic-items-page__search-input"
            type="search"
            placeholder="e.g. cloak, ring of, healing"
            value={filters.q}
            onChange={(event) => updateFilters({ ...filters, q: event.target.value })}
          />
        </label>

        <MagicItemFilters filters={filters} onChange={updateFilters} items={searchMatches} />

        {loadError && (
          <div className="search-page__error browse-layout__error" role="alert">
            {loadError}{" "}
            <Button
              variant="secondary"
              onClick={() => {
                setIsLoading(true);
                setAttempt((count) => count + 1);
              }}
            >
              Try again
            </Button>
          </div>
        )}

        <BrowseLayout
          noun="item"
          isLoading={isLoading}
          total={allItems.length}
          shownCount={results.length}
          isFiltered={activeFilterCount(filters) > 0 || Boolean(filters.q)}
          emptyText="No items match. Try fewer filters."
          selection={selection}
          // Magic items have their own, richer details panel.
          renderDetail={(open) => <MagicItemDetail
              key={open.selectedKey}
              item={open.selected}
              headingId={open.headingId}
              describedBy={open.describedBy}
            />}
          footer={
            remaining > 0 && (
              <Button
                variant="secondary"
                className="search-page__show-more"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                {`Show ${Math.min(remaining, PAGE_SIZE)} more (${remaining.toLocaleString()} left)`}
              </Button>
            )
          }
        >
          {visible.map((item) => (
            <MagicItemCard
              key={entryKey(item)}
              id={selection.cardId(item)}
              item={item}
              isSelected={selection.selected === item}
              onSelect={selection.open}
            />
          ))}
        </BrowseLayout>
      </div>
    </main>
  );
}

export default MagicItemsPage;
