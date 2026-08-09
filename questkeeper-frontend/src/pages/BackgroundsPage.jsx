import { useEffect, useState } from "react";
import { getBackgrounds, getBackgroundDetails } from "../utils/api";
import SearchForm from "../components/SearchForm/SearchForm";
import DetailPanel from "../components/DetailPanel/DetailPanel";
import ResultCard from "../components/ResultCard/ResultCard";
import "../pages/SearchPage/SearchPage.css";

function BackgroundsPage() {
  const [backgroundResults, setBackgroundResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    getBackgrounds()
      .then((data) => {
        const formattedBackgrounds = data.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Background",
          description: "Select this background to view more details.",
          url: item.url,
        }));

        setBackgroundResults(formattedBackgrounds);
      })
      .catch(() => {
        setApiError("Unable to load backgrounds. Please try again later.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filteredBackgrounds = backgroundResults.filter((result) =>
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

    getBackgroundDetails(result.index)
      .then((data) => {
        const startingProficiencies = data.starting_proficiencies.map(
          (item) => item.name,
        );

        const startingEquipment = data.starting_equipment.map(
          (item) => `${item.equipment.name} x${item.quantity}`,
        );

        const featureDescription = data.feature.desc.join(" ");

        const formattedBackground = {
          name: data.name,
          category: "Background",
          startingProficiencies,
          languages: `Choose ${data.language_options.choose} languages`,
          startingEquipment,
          startingGold: `${data.starting_gold.quantity} ${data.starting_gold.unit}`,
          featureName: data.feature.name,
          featureDescription,
          personalityTraits: `Choose ${data.personality_traits.choose}`,
          ideals: `Choose ${data.ideals.choose}`,
          bonds: `Choose ${data.bonds.choose}`,
          flaws: `Choose ${data.flaws.choose}`,
        };

        setSelectedResult(formattedBackground);
        setApiError("");
      })
      .catch(() => {
        setApiError(
          "Unable to load background details. Please try again later.",
        );
      });
  }

  return (
    <main className="search-page">
      <div className="search-page__content">
        <h1 className="search-page__title">Explore Backgrounds</h1>

        <p className="search-page__description">
          A background represents your character's life before adventuring,
          including skills, equipment, personality traits, and story hooks.
        </p>

        <p className="search-page__note">
          More backgrounds may be added as the API expands.
        </p>

        <SearchForm
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
        />

        {isLoading && (
          <p className="search-page__status">Loading backgrounds...</p>
        )}
        {apiError && <p className="search-page__error">{apiError}</p>}

        <section
          className={`search-page__layout ${
            selectedResult ? "search-page__layout--detail-open" : ""
          }`}
        >
          <div className="search-page__results">
            {!isLoading && filteredBackgrounds.length === 0 && (
              <p className="search-page__empty">
                No backgrounds found. Try another search.
              </p>
            )}

            {filteredBackgrounds.map((result) => (
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

export default BackgroundsPage;
