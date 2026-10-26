import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRaces } from "../utils/api";
import { loadRaceDetails, mapRaceToPanel } from "../utils/srdDetails";
import { getRaceGuidance, getCardPreview } from "../utils/beginnerGuidance";
import SearchForm from "../components/SearchForm/SearchForm";
import ResultCard from "../components/ResultCard/ResultCard";
import SourceFilter from "../components/SourceFilter/SourceFilter";
import BrowseLayout from "../components/BrowseLayout/BrowseLayout";
import { filterBySource } from "../utils/sourceFilters";
import { dedupeEntries, entryKey } from "../utils/browseList";
import PageBanner from "../components/PageBanner/PageBanner";
import "../pages/SearchPage/SearchPage.css";
import { useBrowseSelection } from "../hooks/useOpenFromLink";

function RacesPage() {
  const [raceResults, setRaceResults] = useState([]);
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
    getRaces()
      .then((data) => {
        if (ignore) return;
        // Each race once (the same race can arrive twice, e.g. a shared
        // homebrew that's also your own), each with its own id.
        const formattedRaces = dedupeEntries(
          data.map((item) => ({
            index: item.index,
            name: item.name,
            category: "Race",
            source: item.source,
            sourceGroup: item.sourceGroup,
            preview: getCardPreview("Race", item),
            description: "Select this race to view more details.",
            // Book races bring their own tagline.
            tagline: getRaceGuidance(item.index)?.tagline ?? item.tagline,
            url: item.url,
          })),
        );
        setRaceResults(formattedRaces);
        setLoadError(false);
      })
      .catch(() => !ignore && setLoadError(true))
      .finally(() => !ignore && setIsLoading(false));
    return () => {
      ignore = true;
    };
  }, [attempt]);

  // One list for everything below: the cards, the counts, the source
  // buttons and the "nothing found" message all come from it, so they can
  // never disagree. Search first, then the source buttons (their counts
  // follow the search).
  const searchMatches = raceResults.filter((result) =>
    result.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  const filteredRaces = filterBySource(searchMatches, sourceFilter);

  // The open race lives in the address (?open=elf), so it can be shared and
  // reloaded; a filter that hides it closes it.
  const selection = useBrowseSelection({
    items: raceResults,
    visibleItems: filteredRaces,
    ready: !isLoading,
    loadDetail: (race) => loadRaceDetails(race.index).then(mapRaceToPanel),
  });

  return (
    <main className="search-page">
      <div className="search-page__content">
        <PageBanner art="library" eyebrow="Reference" title="Explore Races">
          <p className="page-banner__description search-page__description">
            A race represents your character's ancestry and natural traits. Choose
          this first when creating a character. Races from the official books
          have a short summary and a link to their full rules.
        </p>
        </PageBanner>

        <SearchForm
          scope="races"
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
          noun="race"
          isLoading={isLoading}
          loadError={loadError}
          onRetry={() => {
            setIsLoading(true);
            setAttempt((count) => count + 1);
          }}
          total={raceResults.length}
          shownCount={filteredRaces.length}
          isFiltered={Boolean(searchQuery.trim()) || sourceFilter !== "all"}
          emptyText="No races match. Try another search or choose All sources."
          selection={selection}
        >
          {filteredRaces.map((result) => (
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

export default RacesPage;
