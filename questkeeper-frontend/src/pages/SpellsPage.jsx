import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSpells, getSpellDetails } from "../utils/api";
import { useBrowseSelection } from "../hooks/useOpenFromLink";
import { dedupeEntries, entryKey } from "../utils/browseList";
import BrowseLayout from "../components/BrowseLayout/BrowseLayout";
import { mapSpellToPanel } from "../utils/srdDetails";
import {
  ALL,
  EMPTY_SPELL_FILTERS,
  SPELLS_PAGE_SIZE,
  describeSpellListing,
  filterSpells,
  getSpellFilterOptions,
  hasActiveSpellFilters,
} from "../utils/spellFilters";
import SearchForm from "../components/SearchForm/SearchForm";
import ResultCard from "../components/ResultCard/ResultCard";
import PageBanner from "../components/PageBanner/PageBanner";
import "../pages/SearchPage/SearchPage.css";
import Button from "../components/Button/Button";

function SpellFilterSelect({ id, label, allLabel, value, options, onChange }) {
  return (
    <div className="search-page__filter">
      <label className="search-page__filter-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="search-page__filter-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value={ALL}>{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SpellsPage() {
  const [spellResults, setSpellResults] = useState([]);
  const [filters, setFilters] = useState(EMPTY_SPELL_FILTERS);
  const [visibleCount, setVisibleCount] = useState(SPELLS_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Bumped by "Try again" after the list failed to load.
  const [attempt, setAttempt] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;
    getSpells()
      .then((data) => {
        if (ignore) return;
        const formattedSpells = dedupeEntries(
          data.map((item) => ({
            index: item.index,
            name: item.name,
            category: "Spell",
            description: "Select this spell to view more details.",
            tagline: describeSpellListing(item),
            url: item.url,
            level: item.level,
            school: item.school,
            classes: item.classes,
            // 2014 and 2024 versions share an id; the edition tells them apart.
            ...(item.edition ? { edition: item.edition } : {}),
          })),
        );
        setSpellResults(formattedSpells);
        setLoadError(false);
      })
      .catch((err) => {
        console.error("Unable to load spells:", err);
        if (!ignore) setLoadError(true);
      })
      .finally(() => !ignore && setIsLoading(false));
    return () => {
      ignore = true;
    };
  }, [attempt]);

  const filterOptions = getSpellFilterOptions(spellResults);
  // One list for the cards, the count and "nothing found".
  const filteredSpells = filterSpells(spellResults, filters);
  const visibleSpells = filteredSpells.slice(0, visibleCount);
  const remainingCount = filteredSpells.length - visibleSpells.length;

  // The open spell lives in the address (?open=fireball), so it can be
  // shared and reloaded; a filter that hides it closes it.
  const selection = useBrowseSelection({
    items: spellResults,
    visibleItems: filteredSpells,
    ready: !isLoading,
    loadDetail: (spell) => getSpellDetails(spell.index).then(mapSpellToPanel),
  });

  function updateFilters(changes) {
    setFilters((current) => ({ ...current, ...changes }));
    setVisibleCount(SPELLS_PAGE_SIZE);
  }

  function handleClearFilters() {
    updateFilters({ level: ALL, classIndex: ALL, school: ALL });
  }

  const showFilters = !isLoading && spellResults.length > 0;

  return (
    <main className="search-page">
      <div className="search-page__content">
        <PageBanner art="library" eyebrow="Reference" title="Explore Spells">
          <p className="page-banner__description search-page__description">
            Spells define the magical effects your character can cast in and out
          of combat.
        </p>
        </PageBanner>

        <SearchForm
          scope="spells"
          searchQuery={filters.query}
          onSearchChange={(e) => updateFilters({ query: e.target.value })}
          onSearchEverywhere={(query) => navigate(`/search?q=${encodeURIComponent(query)}`)}
        />

        {showFilters && (
          <div
            className="search-page__filters"
            role="group"
            aria-label="Filter spells"
          >
            <SpellFilterSelect
              id="spell-filter-level"
              label="Level"
              allLabel="All levels"
              value={filters.level}
              options={filterOptions.levels}
              onChange={(level) => updateFilters({ level })}
            />
            {filterOptions.classes.length > 0 && (
              <SpellFilterSelect
                id="spell-filter-class"
                label="Class"
                allLabel="All classes"
                value={filters.classIndex}
                options={filterOptions.classes}
                onChange={(classIndex) => updateFilters({ classIndex })}
              />
            )}
            {filterOptions.schools.length > 0 && (
              <SpellFilterSelect
                id="spell-filter-school"
                label="School"
                allLabel="All schools"
                value={filters.school}
                options={filterOptions.schools}
                onChange={(school) => updateFilters({ school })}
              />
            )}
            {hasActiveSpellFilters(filters) && (
              <Button
                variant="secondary"
                className="search-page__clear-filters"
                onClick={handleClearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        <BrowseLayout
          noun="spell"
          isLoading={isLoading}
          loadError={loadError}
          onRetry={() => {
            setIsLoading(true);
            setAttempt((count) => count + 1);
          }}
          total={spellResults.length}
          shownCount={filteredSpells.length}
          isFiltered={filteredSpells.length !== spellResults.length}
          emptyText={`No spells found. Try another search${hasActiveSpellFilters(filters) ? " or clear the filters" : ""}.`}
          selection={selection}
          footer={
            remainingCount > 0 && (
              <Button
                variant="secondary"
                className="search-page__show-more"
                onClick={() => setVisibleCount((count) => count + SPELLS_PAGE_SIZE)}
              >
                {`Show ${Math.min(remainingCount, SPELLS_PAGE_SIZE)} more (${remainingCount} left)`}
              </Button>
            )
          }
        >
          {visibleSpells.map((result) => (
            <ResultCard
              key={entryKey(result)}
              id={selection.cardId(result)}
              result={result}
              isSelected={selection.selected === result}
              onClick={() => selection.open(result)}
            />
          ))}
        </BrowseLayout>
      </div>
    </main>
  );
}

export default SpellsPage;
