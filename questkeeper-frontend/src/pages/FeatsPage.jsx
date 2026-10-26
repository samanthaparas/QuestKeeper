import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFeatsToBrowse, getFeatDetails } from "../utils/api";
import { mapFeatToPanel } from "../utils/srdDetails";
import SearchForm from "../components/SearchForm/SearchForm";
import ResultCard from "../components/ResultCard/ResultCard";
import SourceFilter from "../components/SourceFilter/SourceFilter";
import { filterBySource } from "../utils/sourceFilters";
import PageBanner from "../components/PageBanner/PageBanner";
import "../pages/SearchPage/SearchPage.css";
import { useBrowseSelection } from "../hooks/useOpenFromLink";
import BrowseLayout from "../components/BrowseLayout/BrowseLayout";
import { dedupeEntries, entryKey } from "../utils/browseList";

// Feats: the SRD ones (full text), homebrew ones, and the feats from the
// official books (a short summary and a link to their full rules).
// "You gain +1 Str. Also more." -> "You gain +1 Str."
function firstSentence(text) {
  if (!text) return null;
  const match = String(text).trim().match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0] : String(text).trim();
}

function FeatsPage() {
  const [featResults, setFeatResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  // "all" or one book name, picked with the SourceFilter buttons.
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Bumped by "Try again" after the list failed to load.
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;
    getFeatsToBrowse()
      .then((data) => {
        if (ignore) return;
        setLoadError(false);
        setFeatResults(
          dedupeEntries(data.map((item) => ({
            index: item.index,
            name: item.name,
            category: "Feat",
            edition: item.edition,
            source: item.source,
            sourceGroup: item.sourceGroup,
            preview: item.preview ?? null,
            // Phones can't hover, so the card shows the summary's first sentence.
            tagline: firstSentence(item.preview),
            description: "Select this feat to view more details.",
          }))),
        );
      })
      .catch(() => !ignore && setLoadError(true))
      .finally(() => !ignore && setIsLoading(false));
    return () => {
      ignore = true;
    };
  }, [attempt]);

  // Search text first, then the source buttons (their counts follow the search).
  const searchMatches = featResults.filter((result) =>
    result.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  const filteredFeats = filterBySource(searchMatches, sourceFilter);

  // The open feat lives in the address (?open=grappler&edition=2014), so it
  // can be shared and reloaded.
  const selection = useBrowseSelection({
    items: featResults,
    visibleItems: filteredFeats,
    ready: !isLoading,
    loadDetail: (item) =>
      getFeatDetails(item.index, item.edition).then((data) => ({
        ...mapFeatToPanel(data),
        index: item.index,
        edition: item.edition,
      })),
  });

  return (
    <main className="search-page">
      <div className="search-page__content">
        <PageBanner art="library" eyebrow="Reference" title="Explore Feats">
          <p className="page-banner__description search-page__description">
            A feat is a special talent your character can learn, usually in place
          of an ability score increase when they level up.
        </p>
        </PageBanner>

        <p className="search-page__note">
          Includes the 2014 and 2024 SRD feats, your own homebrew feats, and the
          feats from the official books (with a short summary and a link to
          their full rules). Each is labeled by its source. You can turn a book
          feat into homebrew to use it in level-up.
        </p>

        <SearchForm
          scope="feats"
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          onSearchEverywhere={(query) => navigate(`/search?q=${encodeURIComponent(query)}`)}
        />

        <SourceFilter
          underSearch
          items={searchMatches}
          value={sourceFilter}
          onChange={setSourceFilter}
        />

        <BrowseLayout
          noun="feat"
          isLoading={isLoading}
          loadError={loadError}
          onRetry={() => {
            setIsLoading(true);
            setAttempt((count) => count + 1);
          }}
          total={featResults.length}
          shownCount={filteredFeats.length}
          isFiltered={Boolean(searchQuery.trim()) || sourceFilter !== "all"}
          emptyText="No feats match. Try another search or choose All sources."
          selection={selection}
        >
          {filteredFeats.map((result) => (
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

export default FeatsPage;
