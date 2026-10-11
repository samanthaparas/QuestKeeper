import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getClasses,
  getRaces,
  getSpells,
  getBackgrounds,
  getSpellDetails,
  getBackgroundDetails,
} from "../../utils/api";
import {
  loadClassDetails,
  loadRaceDetails,
  mapClassToPanel,
  mapRaceToPanel,
  mapBackgroundToPanel,
  mapSpellToPanel,
} from "../../utils/srdDetails";
import SearchForm from "../../components/SearchForm/SearchForm";
import DetailPanel from "../../components/DetailPanel/DetailPanel";
import ResultCard from "../../components/ResultCard/ResultCard";
import SourceFilter from "../../components/SourceFilter/SourceFilter";
import { filterBySource } from "../../utils/sourceFilters";
import "./SearchPage.css";
import Button from "../../components/Button/Button";

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [allResults, setAllResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  // "all" or one book name, picked with the SourceFilter buttons.
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState(query);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getClasses(), getRaces(), getSpells(), getBackgrounds()])
      .then(([classesData, racesData, spellsData, backgroundsData]) => {
        const formattedClasses = classesData.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Class",
          description: "Select this class to view more details.",
          url: item.url,
        }));

        const formattedRaces = racesData.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Race",
          source: item.source,
          description: "Select this race to view more details.",
          url: item.url,
        }));

        const formattedSpells = spellsData.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Spell",
          description: "Select this spell to view more details.",
          url: item.url,
        }));

        const formattedBackgrounds = backgroundsData.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Background",
          source: item.source,
          description: "Select this background to view more details.",
          url: item.url,
        }));

        setAllResults([
          ...formattedClasses,
          ...formattedRaces,
          ...formattedSpells,
          ...formattedBackgrounds,
        ]);
      })
      .catch(() => {
        setApiError("Unable to load search results. Please try again later.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Search text first, then the source buttons (their counts follow the search).
  const searchMatches = allResults.filter((result) =>
    result.name.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredResults = filterBySource(searchMatches, sourceFilter);

  function handleSearchSubmit(e) {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    setSelectedResult(null);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  function formatDetailedResult(data, category) {
    if (category === "Race") return mapRaceToPanel(data);

    if (category === "Class") return mapClassToPanel(data);

    if (category === "Background") return mapBackgroundToPanel(data);

    if (category === "Spell") return mapSpellToPanel(data);

    return {
      name: data.name,
      category,
      description: "No details available.",
    };
  }

  function handleResultClick(result) {
    setSelectedResult(result);

    const detailRequests = {
      Class: loadClassDetails,
      Race: loadRaceDetails,
      Spell: getSpellDetails,
      Background: getBackgroundDetails,
    };

    detailRequests[result.category](result.index)
      .then((data) => {
        setSelectedResult(formatDetailedResult(data, result.category));
        setApiError("");
      })
      .catch(() => {
        setApiError("Unable to load result details. Please try again later.");
      });
  }

  return (
    <main className="search-page">
      <div className="search-page__content">
        <SearchForm
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          onSearchSubmit={handleSearchSubmit}
        />

        <h1 className="search-page__title">Search Results for "{query}"</h1>

        {isLoading && <p className="search-page__status">Loading results...</p>}
        {apiError && <p className="search-page__error">{apiError}</p>}

        <SourceFilter
          underSearch
          items={searchMatches}
          value={sourceFilter}
          onChange={(source) => {
            setSourceFilter(source);
            setSelectedResult(null);
          }}
        />

        <section
          className={`search-page__layout ${
            selectedResult ? "search-page__layout--detail-open" : ""
          }`}
        >
          <div className="search-page__results">
            {!isLoading && !apiError && filteredResults.length === 0 && (
              <p className="search-page__empty">
                No results found. Try another search.
              </p>
            )}

            {filteredResults.map((result) => (
              <ResultCard
                key={`${result.category}-${result.name}`}
                result={result}
                isSelected={selectedResult?.name === result.name}
                onClick={() => handleResultClick(result)}
              />
            ))}
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

export default SearchPage;
