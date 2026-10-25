import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getClasses } from "../utils/api";
import { loadClassDetails, mapClassToPanel } from "../utils/srdDetails";
import { getClassGuidance, getCardPreview } from "../utils/beginnerGuidance";
import SearchForm from "../components/SearchForm/SearchForm";
import DetailPanel from "../components/DetailPanel/DetailPanel";
import ResultCard from "../components/ResultCard/ResultCard";
import PageBanner from "../components/PageBanner/PageBanner";
import "../pages/SearchPage/SearchPage.css";
import SourceFilter from "../components/SourceFilter/SourceFilter";
import { filterBySource } from "../utils/sourceFilters";
import { useBrowseSelection } from "../hooks/useOpenFromLink";
import BrowseLayout from "../components/BrowseLayout/BrowseLayout";
import { dedupeEntries, entryKey } from "../utils/browseList";

function ClassesPage() {
  const [classResults, setClassResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Bumped by "Try again" after the list failed to load.
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // "all" or one book name, picked with the SourceFilter buttons.
  const [sourceFilter, setSourceFilter] = useState("all");

  useEffect(() => {
    let ignore = false;
    getClasses()
      .then((data) => {
        const formattedClasses = data.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Class",
          source: item.source,
          sourceGroup: item.sourceGroup,
          description: "Select this class to view more details.",
          // Book classes (Artificer, Blood Hunter) bring their own tagline.
          tagline: getClassGuidance(item.index)?.tagline ?? item.tagline,
          preview: getCardPreview("Class", item),
          url: item.url,
        }));

        if (ignore) return;
        setClassResults(dedupeEntries(formattedClasses));
        setLoadError(false);
      })
      .catch(() => !ignore && setLoadError(true))
      .finally(() => !ignore && setIsLoading(false));
    return () => {
      ignore = true;
    };
  }, [attempt]);

  // Search text first, then the source buttons (their counts follow the search).
  const searchMatches = classResults.filter((result) =>
    result.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  const filteredClasses = filterBySource(searchMatches, sourceFilter);

  // The open class lives in the address (?open=wizard, and &subclass=
  // evocation to open at that subclass), so it can be shared and reloaded.
  const selection = useBrowseSelection({
    items: classResults,
    visibleItems: filteredClasses,
    ready: !isLoading,
    loadDetail: (item) => loadClassDetails(item.index).then(mapClassToPanel),
  });
  const subclass = searchParams.get("subclass") ?? undefined;

  return (
    <main className="search-page">
      <div className="search-page__content">
        <PageBanner art="library" eyebrow="Reference" title="Explore Classes">
          <p className="page-banner__description search-page__description">
            A class represents what your character does best, like casting spells,
          fighting, healing, sneaking, or protecting the party.
        </p>
        </PageBanner>

        <SearchForm
          scope="classes"
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
          noun="class"
          isLoading={isLoading}
          loadError={loadError}
          onRetry={() => {
            setIsLoading(true);
            setAttempt((count) => count + 1);
          }}
          total={classResults.length}
          shownCount={filteredClasses.length}
          isFiltered={Boolean(searchQuery.trim()) || sourceFilter !== "all"}
          emptyText="No classes match. Try another search or choose All sources."
          selection={selection}
          // The subclass a link points to opens on its own tab.
          renderDetail={(open) => (
            <DetailPanel
              selectedResult={open.detail ? { ...open.detail, initialSubclass: subclass } : open.selected}
              headingId={open.headingId}
              describedBy={open.describedBy}
            />
          )}
        >
          {filteredClasses.map((result) => (
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

export default ClassesPage;
