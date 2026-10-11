import { useEffect, useState } from "react";
import { getRaces } from "../utils/api";
import { loadRaceDetails, mapRaceToPanel } from "../utils/srdDetails";
import { getRaceGuidance } from "../utils/beginnerGuidance";
import SearchForm from "../components/SearchForm/SearchForm";
import DetailPanel from "../components/DetailPanel/DetailPanel";
import ResultCard from "../components/ResultCard/ResultCard";
import SourceFilter from "../components/SourceFilter/SourceFilter";
import { filterBySource } from "../utils/sourceFilters";
import "../pages/SearchPage/SearchPage.css";
import Button from "../components/Button/Button";

function RacesPage() {
  const [raceResults, setRaceResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  // "all" or one book name, picked with the SourceFilter buttons.
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    getRaces()
      .then((data) => {
        const formattedRaces = data.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Race",
          source: item.source,
          description: "Select this race to view more details.",
          tagline: getRaceGuidance(item.index)?.tagline,
          url: item.url,
        }));

        setRaceResults(formattedRaces);
      })
      .catch(() => {
        setApiError("Unable to load races. Please try again later.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Search text first, then the source buttons (their counts follow the search).
  const searchMatches = raceResults.filter((result) =>
    result.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredRaces = filterBySource(searchMatches, sourceFilter);

  function handleSearchSubmit(e) {
    e.preventDefault();
  }

  function handleSearchChange(e) {
    setSearchQuery(e.target.value);
    setSelectedResult(null);
  }

  function handleResultClick(result) {
    setSelectedResult(result);

    loadRaceDetails(result.index)
      .then((data) => {
        setSelectedResult(mapRaceToPanel(data));
        setApiError("");
      })
      .catch(() => {
        setApiError("Unable to load race details. Please try again later.");
      });
  }

  return (
    <main className="search-page">
      <div className="search-page__content">
        <h1 className="search-page__title">Explore Races</h1>

        <p className="search-page__description">
          A race represents your character's ancestry and natural traits. Choose
          this first when creating a character.
        </p>

        <SearchForm
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
        />

        {isLoading && <p className="search-page__status">Loading races...</p>}
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
            {!isLoading && filteredRaces.length === 0 && (
              <p className="search-page__empty">
                No races found. Try another search.
              </p>
            )}

            {filteredRaces.map((result) => (
              <ResultCard
                key={result.name}
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

export default RacesPage;
