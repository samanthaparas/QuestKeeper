import { useEffect, useState } from "react";
import { getFeatsToBrowse, getFeatDetails } from "../utils/api";
import { mapFeatToPanel } from "../utils/srdDetails";
import SearchForm from "../components/SearchForm/SearchForm";
import DetailPanel from "../components/DetailPanel/DetailPanel";
import ResultCard from "../components/ResultCard/ResultCard";
import SourceFilter from "../components/SourceFilter/SourceFilter";
import { filterBySource } from "../utils/sourceFilters";
import "../pages/SearchPage/SearchPage.css";
import Button from "../components/Button/Button";
import { useOpenFromLink } from "../hooks/useOpenFromLink";

// Feats: the SRD ones (full text), homebrew ones, and the feats from the
// official books (a short summary and a link to their full rules).
function FeatsPage() {
  const [featResults, setFeatResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  // "all" or one book name, picked with the SourceFilter buttons.
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    getFeatsToBrowse()
      .then((data) => {
        setFeatResults(
          data.map((item) => ({
            index: item.index,
            name: item.name,
            category: "Feat",
            edition: item.edition,
            source: item.source,
            sourceGroup: item.sourceGroup,
            preview: item.preview ?? null,
            description: "Select this feat to view more details.",
          })),
        );
      })
      .catch(() => {
        setApiError("Unable to load feats. Please try again later.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Search text first, then the source buttons (their counts follow the search).
  const searchMatches = featResults.filter((result) =>
    result.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredFeats = filterBySource(searchMatches, sourceFilter);

  function handleSearchSubmit(e) {
    e.preventDefault();
  }

  function handleSearchChange(e) {
    setSearchQuery(e.target.value);
    setSelectedResult(null);
  }

  function handleResultClick(result) {
    setSelectedResult(result);

    getFeatDetails(result.index, result.edition)
      .then((data) => {
        setSelectedResult({ ...mapFeatToPanel(data), index: result.index, edition: result.edition });
        setApiError("");
      })
      .catch(() => {
        setApiError("Unable to load feat details. Please try again later.");
      });
  }

  // Links like quick-jump's "/feats?open=grappler&edition=2014" open that feat
  // (the same name can be in both rule sets).
  useOpenFromLink({
    items: featResults,
    ready: !isLoading,
    onOpen: handleResultClick,
    matches: (item, params) =>
      item.index === params.get("open") &&
      (params.get("edition") ? item.edition === params.get("edition") : true),
  });

  return (
    <main className="search-page">
      <div className="search-page__content">
        <h1 className="search-page__title">Explore Feats</h1>

        <p className="search-page__description">
          A feat is a special talent your character can learn, usually in place
          of an ability score increase when they level up.
        </p>

        <p className="search-page__note">
          Includes the 2014 and 2024 SRD feats, your own homebrew feats, and the
          feats from the official books (with a short summary and a link to
          their full rules). Each is labeled by its source. You can turn a book
          feat into homebrew to use it in level-up.
        </p>

        <SearchForm
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
        />

        {isLoading && <p className="search-page__status">Loading feats...</p>}
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
            {!isLoading && filteredFeats.length === 0 && (
              <p className="search-page__empty">No feats found. Try another search.</p>
            )}

            {filteredFeats.map((result) => (
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

export default FeatsPage;
