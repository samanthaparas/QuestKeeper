import { useEffect, useState } from "react";
import { getBackgrounds, getBackgroundDetails } from "../utils/api";
import { mapBackgroundToPanel } from "../utils/srdDetails";
import SearchForm from "../components/SearchForm/SearchForm";
import DetailPanel from "../components/DetailPanel/DetailPanel";
import ResultCard from "../components/ResultCard/ResultCard";
import "../pages/SearchPage/SearchPage.css";
import Button from "../components/Button/Button";

function formatBackground2024(data) {
  const abilityScoreNames = data.ability_scores.map((a) => a.name).join(", ");
  const startingProficiencies = data.proficiencies.map((item) => item.name);
  const equipmentChoices = data.equipment_options.map((option) => option.desc);

  return {
    name: data.name,
    category: "Background",
    edition: "2024",
    abilityScoreOptions: `Choose from ${abilityScoreNames} (+2/+1 split, or +1 to each)`,
    grantedFeatName: data.feat?.name,
    startingProficiencies,
    equipmentChoices,
  };
}

function BackgroundsPage() {
  const [backgroundResults, setBackgroundResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    Promise.all([getBackgrounds(), getBackgrounds("2024")])
      .then(([legacy, updated]) => {
        const formattedBackgrounds = [...legacy, ...updated].map((item) => ({
          index: item.index,
          name: item.name,
          category: "Background",
          edition: item.edition,
          source: item.source,
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

    getBackgroundDetails(result.index, result.edition)
      .then((data) => {
        const formattedBackground =
          result.edition === "2024"
            ? formatBackground2024(data)
            : mapBackgroundToPanel(data);

        setSelectedResult({
          ...formattedBackground,
          index: result.index,
        });
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
          Includes the 2014 and 2024 SRD rulesets plus backgrounds from Tome of
          Heroes, Open5e and the Tal'Dorei Campaign Setting, each labeled by
          its source. Character creation uses the 2014-rules backgrounds.
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
                key={`${result.edition}:${result.index}`}
                result={result}
                isSelected={
                  selectedResult?.index === result.index &&
                  selectedResult?.edition === result.edition
                }
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

export default BackgroundsPage;
