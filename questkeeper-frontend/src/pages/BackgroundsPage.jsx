import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBackgrounds, getBackgroundDetails } from "../utils/api";
import { mapBackgroundToPanel } from "../utils/srdDetails";
import { getCardPreview } from "../utils/beginnerGuidance";
import SearchForm from "../components/SearchForm/SearchForm";
import ResultCard from "../components/ResultCard/ResultCard";
import SourceFilter from "../components/SourceFilter/SourceFilter";
import { filterBySource } from "../utils/sourceFilters";
import "../pages/SearchPage/SearchPage.css";
import { useBrowseSelection } from "../hooks/useOpenFromLink";
import BrowseLayout from "../components/BrowseLayout/BrowseLayout";
import { dedupeEntries, entryKey } from "../utils/browseList";

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
    Promise.all([getBackgrounds(), getBackgrounds("2024")])
      .then(([legacy, updated]) => {
        const formattedBackgrounds = [...legacy, ...updated].map((item) => ({
          index: item.index,
          name: item.name,
          category: "Background",
          edition: item.edition,
          source: item.source,
          sourceGroup: item.sourceGroup,
          preview: getCardPreview("Background", item),
          description: "Select this background to view more details.",
          url: item.url,
        }));

        if (ignore) return;
        // 2014 and 2024 backgrounds can share an id; the edition tells them apart.
        setBackgroundResults(dedupeEntries(formattedBackgrounds));
        setLoadError(false);
      })
      .catch(() => !ignore && setLoadError(true))
      .finally(() => !ignore && setIsLoading(false));
    return () => {
      ignore = true;
    };
  }, [attempt]);

  // Search text first, then the source buttons (their counts follow the search).
  const searchMatches = backgroundResults.filter((result) =>
    result.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  const filteredBackgrounds = filterBySource(searchMatches, sourceFilter);

  // The open background lives in the address (?open=acolyte&edition=2024),
  // so it can be shared and reloaded.
  const selection = useBrowseSelection({
    items: backgroundResults,
    visibleItems: filteredBackgrounds,
    ready: !isLoading,
    loadDetail: (item) =>
      getBackgroundDetails(item.index, item.edition).then((data) => ({
        ...(item.edition === "2024" ? formatBackground2024(data) : mapBackgroundToPanel(data)),
        index: item.index,
      })),
  });

  return (
    <main className="search-page">
      <div className="search-page__content">
        <h1 className="search-page__title">Explore Backgrounds</h1>

        <p className="search-page__description">
          A background represents your character's life before adventuring,
          including skills, equipment, personality traits, and story hooks.
        </p>

        <p className="search-page__note">
          Includes the 2014 and 2024 SRD rulesets, backgrounds from Tome of
          Heroes, Open5e and the Tal'Dorei Campaign Setting, and the backgrounds
          from the official books (with a short summary and a link to their full
          rules). Each is labeled by its source. Character creation uses the
          2014-rules backgrounds.
        </p>

        <SearchForm
          scope="backgrounds"
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
          noun="background"
          isLoading={isLoading}
          loadError={loadError}
          onRetry={() => {
            setIsLoading(true);
            setAttempt((count) => count + 1);
          }}
          total={backgroundResults.length}
          shownCount={filteredBackgrounds.length}
          isFiltered={Boolean(searchQuery.trim()) || sourceFilter !== "all"}
          emptyText="No backgrounds match. Try another search or choose All sources."
          selection={selection}
        >
          {filteredBackgrounds.map((result) => (
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

export default BackgroundsPage;
