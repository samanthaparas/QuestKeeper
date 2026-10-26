import { useEffect, useState } from "react";
import ResultCard from "../ResultCard/ResultCard";
import DetailPanel from "../DetailPanel/DetailPanel";
import "./PickerStep.css";
import Button from "../Button/Button";
import StartFromButton from "../HomebrewStart/StartFromButton";
import SourceFilter from "../SourceFilter/SourceFilter";
import { filterBySource } from "../../utils/sourceFilters";
import { getCardPreview } from "../../utils/beginnerGuidance";
import { toHomebrewIndex } from "../../utils/homebrewMappers";
import InlineLoading from "../StatusNote/InlineLoading";

function PickerStep({
  title,
  description,
  category,
  fetchList,
  fetchDetails,
  mapToDetailPanelResult,
  mapToSnapshot,
  getTagline,
  initialSelectedRaw,
  emptyMessage,
  onChoose,
  onSkip,
  onBack,
  backLabel,
  // Optional "Can't find it? Make your own" button (opens the homebrew form).
  onMakeOwn,
  makeOwnLabel = "Make your own",
  // Published-book entries can't be chosen directly; this rebuilds one as
  // homebrew instead (gets the selected entry).
  onMakeHomebrewFrom,
  // "Pick it now, add details later": saves a bare draft homebrew of a book
  // entry (name, book and link only) and chooses it straight away. Gets the
  // book entry; returns the saved homebrew row. The player fills in the
  // details later (the sheet reminds them).
  onDraftFrom,
  // Free (SRD/Open5e) entries can be copied into a homebrew form to make
  // your own version (gets the filled-in form values).
  onStartFrom,
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(
    () => initialSelectedRaw?.index ?? null,
  );
  const [selectedDetail, setSelectedDetail] = useState(() =>
    initialSelectedRaw ? mapToDetailPanelResult(initialSelectedRaw) : null,
  );
  const [selectedRaw, setSelectedRaw] = useState(
    () => initialSelectedRaw ?? null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  // "all" or one book name, picked with the SourceFilter buttons.
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isDrafting, setIsDrafting] = useState(false);
  // Shown beside the details, so a failed draft never hides the list.
  const [draftError, setDraftError] = useState("");
  // Book entries with no way to pick them here (like Artificer: homebrew
  // can't build whole classes yet) are read-only. They go last, so the
  // choosable options come first.
  const isReadOnly = (item) =>
    String(item?.index ?? "").startsWith("book_") && !onMakeHomebrewFrom;
  const isBookItem = (item) => String(item?.index ?? "").startsWith("book_");
  const visibleItems = [...filterBySource(items, sourceFilter)].sort(
    (a, b) => Number(isReadOnly(a)) - Number(isReadOnly(b)),
  );
  // When a list holds both pickable options and book ones that need a
  // homebrew version, they get their own labelled sections (nothing is
  // hidden), pickable ones first.
  const readyItems = visibleItems.filter((item) => !isBookItem(item));
  const bookItems = visibleItems.filter(isBookItem);
  const isSectioned = Boolean(onMakeHomebrewFrom) && readyItems.length > 0 && bookItems.length > 0;
  const showChips = Boolean(onMakeHomebrewFrom) && items.some(isBookItem) && items.some((item) => !isBookItem(item));
  const selectedIsReadOnly = Boolean(selectedRaw?.is_book_entry) && !onMakeHomebrewFrom;

  useEffect(() => {
    fetchList()
      .then((data) => setItems(data))
      .catch(() => {
        setApiError("Unable to load options. Please try again later.");
      })
      .finally(() => setIsLoading(false));
  }, [fetchList]);

  function handleSelect(item) {
    setDraftError("");
    setSelectedIndex(item.index);
    setSelectedDetail(null);
    setIsDetailLoading(true);

    fetchDetails(item.index)
      .then((data) => {
        setSelectedRaw(data);
        setSelectedDetail(mapToDetailPanelResult(data));
        setApiError("");
      })
      .catch(() => {
        setApiError("Unable to load details. Please try again later.");
      })
      .finally(() => setIsDetailLoading(false));
  }

  async function handleDraft() {
    setIsDrafting(true);
    setDraftError("");
    try {
      const saved = await onDraftFrom(selectedRaw);
      const raw = await fetchDetails(toHomebrewIndex(saved.id));
      onChoose(mapToSnapshot(raw), raw);
    } catch {
      setDraftError("Couldn't save that as a draft. Please try again, or use Make it as homebrew.");
    } finally {
      setIsDrafting(false);
    }
  }

  function handleConfirm() {
    onChoose(mapToSnapshot(selectedRaw), selectedRaw);
  }

  function renderCard(item) {
    return (
      <ResultCard
        key={item.index}
        result={{
          name: item.name,
          category,
          index: item.index,
          source: item.source,
          sourceGroup: item.sourceGroup,
          preview: getCardPreview(category, item),
          // Read-only entries say so right on the card.
          tagline: isReadOnly(item)
            ? "Read only: can't be picked yet"
            : getTagline?.(item),
          chip: showChips && !isReadOnly(item) ? (isBookItem(item) ? "Make it yours" : "Ready to pick") : null,
        }}
        isSelected={selectedIndex === item.index}
        onClick={() => handleSelect(item)}
        picker
      />
    );
  }

  const showEmptyState =
    !isLoading && !apiError && items.length === 0 && Boolean(emptyMessage);

  return (
    <div className="picker-step">
      <h1 className="picker-step__title">{title}</h1>
      <p className="picker-step__description">{description}</p>

      {onMakeOwn && (
        <p className="picker-step__make-own">
          Can't find what you want?{" "}
          <Button variant="secondary" onClick={onMakeOwn}>
            {makeOwnLabel}
          </Button>
        </p>
      )}

      {isLoading && <InlineLoading className="picker-step__status">Loading options...</InlineLoading>}
      {apiError && <p className="picker-step__error">{apiError}</p>}
      {showEmptyState && <p className="picker-step__status">{emptyMessage}</p>}

      {!isLoading && !apiError && !showEmptyState && (
        <SourceFilter
          items={items}
          value={sourceFilter}
          onChange={setSourceFilter}
        />
      )}

      {!isLoading && !apiError && !showEmptyState && (
        <div className="picker-step__layout">
          <div className="picker-step__list">
            {isSectioned && (
              <h3 className="picker-step__section">Ready to pick</h3>
            )}
            {(isSectioned ? readyItems : visibleItems).map(renderCard)}
            {isSectioned && (
              <>
                <h3 className="picker-step__section">From the books</h3>
                <p className="picker-step__section-note">
                  These need a quick homebrew version before you can play them.
                  Open one, then choose <b>Pick it now, add details later</b>
                  {onDraftFrom ? "" : " or Make it as homebrew"} to start in
                  seconds.
                </p>
                {bookItems.map(renderCard)}
              </>
            )}
          </div>

          <div className="picker-step__detail">
            {selectedIsReadOnly && !isDetailLoading && (
              <p className="picker-step__read-only" role="note">
                <strong>Can&apos;t be picked yet.</strong> QuestKeeper
                doesn&apos;t have this {category.toLowerCase()}&apos;s rules
                (the book&apos;s text is copyrighted), so it&apos;s here to read
                about for now.
              </p>
            )}

            {draftError && (
              <p className="picker-step__error" role="alert">
                {draftError}
              </p>
            )}

            {isDetailLoading && (
              <InlineLoading className="picker-step__status">Loading details...</InlineLoading>
            )}

            <DetailPanel
              inPicker
              selectedResult={
                // In a picker, the book panel's own "go to My Homebrew" link is
                // swapped for the button below, so progress isn't lost.
                selectedDetail?.bookEntry
                  ? {
                      ...selectedDetail,
                      bookEntry: {
                        ...selectedDetail.bookEntry,
                        inPicker: true,
                      },
                    }
                  : selectedDetail
              }
              actions={
                selectedDetail && !isDetailLoading ? (
                  // One row of buttons under the title, main choice first.
                  <div className="picker-step__actions">
                    {selectedRaw?.is_book_entry ? (
                      onMakeHomebrewFrom && (
                        <>
                          {onDraftFrom && (
                            <Button disabled={isDrafting} onClick={handleDraft}>
                              {isDrafting ? "Saving..." : "Pick it now, add details later"}
                            </Button>
                          )}
                          <Button
                            variant={onDraftFrom ? "secondary" : "primary"}
                            onClick={() => onMakeHomebrewFrom(selectedRaw)}
                          >
                            Make it as homebrew
                          </Button>
                        </>
                      )
                    ) : (
                      <>
                        <Button onClick={handleConfirm}>
                          Choose {selectedDetail.name}
                        </Button>
                        {onStartFrom && selectedDetail.startFrom && (
                          <StartFromButton
                            startFrom={selectedDetail.startFrom}
                            onStart={onStartFrom}
                            label="Make my own version"
                          />
                        )}
                      </>
                    )}
                  </div>
                ) : null
              }
            />
          </div>
        </div>
      )}

      {showEmptyState && (
        <Button className="picker-step__skip-position" onClick={onSkip}>
          Next
        </Button>
      )}

      <Button
        variant="secondary"
        className="picker-step__back-position"
        onClick={onBack}
      >
        {backLabel}
      </Button>
    </div>
  );
}

export default PickerStep;
