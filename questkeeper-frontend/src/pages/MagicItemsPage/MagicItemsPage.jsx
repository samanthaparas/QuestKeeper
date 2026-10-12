import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMagicItemCatalog } from "../../utils/api";
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
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const [catalog, setCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    getMagicItemCatalog()
      .then(setCatalog)
      .catch(() =>
        setLoadError("Couldn't load the SRD and Vault of Magic items right now. The official book items are still listed below."),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const allItems = useMemo(() => [...catalog, ...BOOK_MAGIC_ITEMS], [catalog]);
  // Search text first, so the source buttons' counts follow the search.
  const searchMatches = useMemo(() => filterMagicItems(allItems, { q: filters.q }), [allItems, filters.q]);
  const results = useMemo(() => filterMagicItems(allItems, filters), [allItems, filters]);
  const visible = results.slice(0, visibleCount);
  const remaining = results.length - visible.length;

  function updateFilters(next) {
    setSearchParams(filtersToParams(next), { replace: true });
    setVisibleCount(PAGE_SIZE);
    setSelected(null);
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

        {isLoading && <p className="search-page__status">Loading magic items...</p>}
        {loadError && <p className="search-page__error">{loadError}</p>}

        <p className="magic-items-page__count" aria-live="polite">
          {results.length.toLocaleString()} of {allItems.length.toLocaleString()} items
          {activeFilterCount(filters) > 0 || filters.q ? " match" : ""}
        </p>

        <section className={`search-page__layout ${selected ? "search-page__layout--detail-open" : ""}`}>
          <div className="search-page__results">
            {!isLoading && results.length === 0 && (
              <p className="search-page__empty">No items match. Try fewer filters.</p>
            )}

            {visible.map((item) => (
              <MagicItemCard
                key={item.index}
                item={item}
                isSelected={selected?.index === item.index}
                onSelect={setSelected}
              />
            ))}

            {remaining > 0 && (
              <Button
                variant="secondary"
                className="search-page__show-more"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                {`Show ${Math.min(remaining, PAGE_SIZE)} more (${remaining.toLocaleString()} left)`}
              </Button>
            )}
          </div>

          <div className="search-page__detail-wrapper">
            {selected ? (
              <>
                <Button variant="secondary" className="search-page__back-button" onClick={() => setSelected(null)}>
                  Back to results
                </Button>
                <MagicItemDetail item={selected} />
              </>
            ) : (
              <section className="detail-panel">
                <h2 className="detail-panel__title">Select an item</h2>
                <p>Choose an item from the list to see everything about it.</p>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default MagicItemsPage;
