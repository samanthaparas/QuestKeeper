import { useEffect, useState } from "react";
import { getRaces, getRaceDetails } from "../utils/api";
import SearchForm from "../components/SearchForm/SearchForm";
import DetailPanel from "../components/DetailPanel/DetailPanel";
import ResultCard from "../components/ResultCard/ResultCard";
import "../pages/SearchPage/SearchPage.css";

function RacesPage() {
  const [raceResults, setRaceResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    getRaces()
      .then((data) => {
        const formattedRaces = data.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Race",
          description: "Select this race to view more details.",
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

  const filteredRaces = raceResults.filter((result) =>
    result.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  function handleSearchSubmit(e) {
    e.preventDefault();
  }

  function handleSearchChange(e) {
    setSearchQuery(e.target.value);
    setSelectedResult(null);
  }

  function handleResultClick(result) {
    setSelectedResult(result);

    getRaceDetails(result.index)
      .then((data) => {
        const abilityBonuses = data.ability_bonuses
          .map((ability) => `${ability.ability_score.name} +${ability.bonus}`)
          .join(", ");

        const formattedRace = {
          name: data.name,
          category: "Race",
          speed: data.speed,
          size: data.size,
          alignment: data.alignment,
          abilityBonuses,
        };

        setSelectedResult(formattedRace);
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
              <button
                className="search-page__back-button"
                type="button"
                onClick={() => setSelectedResult(null)}
              >
                Back to results
              </button>
            )}

            <DetailPanel selectedResult={selectedResult} />
          </div>
        </section>
      </div>
    </main>
  );
}

export default RacesPage;
