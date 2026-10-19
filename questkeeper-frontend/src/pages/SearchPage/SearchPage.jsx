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
import { getCardPreview } from "../../utils/beginnerGuidance";
import ResultCard from "../../components/ResultCard/ResultCard";
import SourceFilter from "../../components/SourceFilter/SourceFilter";
import { filterBySource } from "../../utils/sourceFilters";
import "./SearchPage.css";
import BrowseLayout from "../../components/BrowseLayout/BrowseLayout";
import { useBrowseSelection } from "../../hooks/useOpenFromLink";
import { dedupeEntries, entryKey } from "../../utils/browseList";

// Searches everything (classes, races, spells, backgrounds) by name. The
// open entry is in the address ("/search?q=fire&open=spell:fireball"), so a
// result can be shared and reloaded like on the list pages.
const DETAIL_LOADERS = {
  Class: (index) => loadClassDetails(index).then(mapClassToPanel),
  Race: (index) => loadRaceDetails(index).then(mapRaceToPanel),
  Spell: (index) => getSpellDetails(index).then(mapSpellToPanel),
  Background: (index) => getBackgroundDetails(index).then(mapBackgroundToPanel),
};

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [allResults, setAllResults] = useState([]);
  // "all" or one book name, picked with the SourceFilter buttons.
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState(query);
  // A new search from elsewhere (the header) puts its words in the box too.
  const [shownQuery, setShownQuery] = useState(query);
  if (shownQuery !== query) {
    setShownQuery(query);
    setSearchQuery(query);
  }
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    let ignore = false;
    Promise.all([getClasses(), getRaces(), getSpells(), getBackgrounds()])
      .then(([classesData, racesData, spellsData, backgroundsData]) => {
        if (ignore) return;
        const formattedClasses = classesData.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Class",
          source: item.source,
          sourceGroup: item.sourceGroup,
          preview: getCardPreview("Class", item),
          description: "Select this class to view more details.",
          url: item.url,
        }));

        const formattedRaces = racesData.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Race",
          source: item.source,
          sourceGroup: item.sourceGroup,
          preview: getCardPreview("Race", item),
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
          sourceGroup: item.sourceGroup,
          preview: getCardPreview("Background", item),
          description: "Select this background to view more details.",
          url: item.url,
        }));

        setAllResults(
          dedupeEntries([
            ...formattedClasses,
            ...formattedRaces,
            ...formattedSpells,
            ...formattedBackgrounds,
          ]),
        );
        setLoadError(false);
      })
      .catch(() => !ignore && setLoadError(true))
      .finally(() => !ignore && setIsLoading(false));
    return () => {
      ignore = true;
    };
  }, [attempt]);

  // One list for the cards, the counts, the source buttons and "nothing
  // found". Search text first, then the source buttons.
  const searchMatches = allResults.filter((result) =>
    result.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const filteredResults = filterBySource(searchMatches, sourceFilter);

  const selection = useBrowseSelection({
    items: allResults,
    visibleItems: filteredResults,
    ready: !isLoading,
    // "spell:fireball": the kind too, since a race and a class could share an id.
    keyOf: (item) => `${item.category.toLowerCase()}:${item.index}`,
    loadDetail: (item) => DETAIL_LOADERS[item.category](item.index),
  });

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  return (
    <main className="search-page">
      <div className="search-page__content">
        <SearchForm
          label="Search all of QuestKeeper"
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          onSearchSubmit={handleSearchSubmit}
        />

        <h1 className="search-page__title">
          {query ? <>Search results for &ldquo;{query}&rdquo;</> : "Search"}
        </h1>
        <p className="search-page__description search-page__scope">
          Looks through the names of classes, races, spells and backgrounds. Feats and magic items have their
          own pages under Explore.
        </p>

        <SourceFilter
          underSearch
          items={searchMatches}
          value={sourceFilter}
          onChange={setSourceFilter}
        />

        <BrowseLayout
          noun="result"
          isLoading={isLoading}
          loadError={loadError}
          onRetry={() => {
            setIsLoading(true);
            setAttempt((count) => count + 1);
          }}
          total={searchMatches.length}
          shownCount={filteredResults.length}
          isFiltered={sourceFilter !== "all"}
          emptyText={
            query
              ? `Nothing named like "${query}". Try a shorter word, or browse Races, Classes or Spells.`
              : "Type a word above to search."
          }
          selection={selection}
        >
          {filteredResults.map((result) => (
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

export default SearchPage;
