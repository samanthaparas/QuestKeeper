import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSpells, getSpellDetails } from "../utils/api";
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
import DetailPanel from "../components/DetailPanel/DetailPanel";
import ResultCard from "../components/ResultCard/ResultCard";
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
  const [selectedResult, setSelectedResult] = useState(null);
  const [filters, setFilters] = useState(EMPTY_SPELL_FILTERS);
  const [visibleCount, setVisibleCount] = useState(SPELLS_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    getSpells()
      .then((data) => {
        const formattedSpells = data.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Spell",
          description: "Select this spell to view more details.",
          tagline: describeSpellListing(item),
          url: item.url,
          level: item.level,
          school: item.school,
          classes: item.classes,
        }));

        setSpellResults(formattedSpells);
      })
      .catch((err) => {
        console.error("Unable to load spells:", err);
        setApiError("Unable to load spells. Please try again later.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filterOptions = getSpellFilterOptions(spellResults);
  const filteredSpells = filterSpells(spellResults, filters);
  const visibleSpells = filteredSpells.slice(0, visibleCount);
  const remainingCount = filteredSpells.length - visibleSpells.length;

  function updateFilters(changes) {
    setFilters((current) => ({ ...current, ...changes }));
    setVisibleCount(SPELLS_PAGE_SIZE);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();

    if (!filters.query.trim()) return;

    navigate(`/search?q=${encodeURIComponent(filters.query.trim())}`);
  }

  function handleSearchChange(e) {
    updateFilters({ query: e.target.value });
    setSelectedResult(null);
  }

  function handleClearFilters() {
    updateFilters({ level: ALL, classIndex: ALL, school: ALL });
  }

  function handleResultClick(result) {
    setSelectedResult(result);

    getSpellDetails(result.index)
      .then((data) => {
        setSelectedResult(mapSpellToPanel(data));
        setApiError("");
      })
      .catch(() => {
        setApiError("Unable to load spell details. Please try again.");
      });
  }

  const showFilters = !isLoading && spellResults.length > 0;

  return (
    <main className="search-page">
      <div className="search-page__content">
        <h1 className="search-page__title">Explore Spells</h1>

        <p className="search-page__description">
          Spells define the magical effects your character can cast in and out
          of combat.
        </p>

        <SearchForm
          searchQuery={filters.query}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
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

        {isLoading && <p className="search-page__status">Loading spells...</p>}
        {apiError && <p className="search-page__error">{apiError}</p>}

        {showFilters && (
          <p className="search-page__count" aria-live="polite">
            {filteredSpells.length === spellResults.length
              ? `${spellResults.length} spells`
              : `${filteredSpells.length} of ${spellResults.length} spells match`}
          </p>
        )}

        <section
          className={`search-page__layout ${
            selectedResult ? "search-page__layout--detail-open" : ""
          }`}
        >
          <div className="search-page__results">
            {!isLoading && !apiError && filteredSpells.length === 0 && (
              <p className="search-page__empty">
                No spells found. Try another search
                {hasActiveSpellFilters(filters) && " or clear the filters"}.
              </p>
            )}

            {visibleSpells.map((result) => (
              <ResultCard
                key={result.index}
                result={result}
                isSelected={selectedResult?.index === result.index}
                onClick={() => handleResultClick(result)}
              />
            ))}

            {remainingCount > 0 && (
              <Button
                variant="secondary"
                className="search-page__show-more"
                onClick={() =>
                  setVisibleCount((count) => count + SPELLS_PAGE_SIZE)
                }
              >
                {`Show ${Math.min(remainingCount, SPELLS_PAGE_SIZE)} more (${remainingCount} left)`}
              </Button>
            )}
          </div>

          <div className="search-page__detail-wrapper">
            {selectedResult && (
              <Button
                variant="secondary"
                className="search-page__back-button"
                onClick={() => setSelectedResult(null)}
              >
                Back to results
              </Button>
            )}

            <DetailPanel selectedResult={selectedResult} />
          </div>
        </section>
      </div>
    </main>
  );
}

export default SpellsPage;
