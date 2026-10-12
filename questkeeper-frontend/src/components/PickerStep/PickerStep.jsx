import { useEffect, useState } from "react";
import ResultCard from "../ResultCard/ResultCard";
import DetailPanel from "../DetailPanel/DetailPanel";
import "./PickerStep.css";
import Button from "../Button/Button";
import StartFromButton from "../HomebrewStart/StartFromButton";
import SourceFilter from "../SourceFilter/SourceFilter";
import { filterBySource } from "../../utils/sourceFilters";
import { getCardPreview } from "../../utils/beginnerGuidance";

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
  // Book entries with no way to pick them here (like Artificer: homebrew
  // can't build whole classes yet) are read-only. They go last, so the
  // choosable options come first.
  const isReadOnly = (item) =>
    String(item?.index ?? "").startsWith("book_") && !onMakeHomebrewFrom;
  const visibleItems = [...filterBySource(items, sourceFilter)].sort(
    (a, b) => Number(isReadOnly(a)) - Number(isReadOnly(b)),
  );
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

  function handleConfirm() {
    onChoose(mapToSnapshot(selectedRaw), selectedRaw);
  }

  const showEmptyState =
    !isLoading && !apiError && items.length === 0 && Boolean(emptyMessage);

  return (
    <div className="picker-step">
      <h2 className="picker-step__title">{title}</h2>
      <p className="picker-step__description">{description}</p>

      {onMakeOwn && (
        <p className="picker-step__make-own">
          Can't find what you want?{" "}
          <Button variant="secondary" onClick={onMakeOwn}>
            {makeOwnLabel}
          </Button>
        </p>
      )}

      {isLoading && <p className="picker-step__status">Loading options...</p>}
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
            {visibleItems.map((item) => (
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
                }}
                isSelected={selectedIndex === item.index}
                onClick={() => handleSelect(item)}
              />
            ))}
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

            {isDetailLoading && (
              <p className="picker-step__status">Loading details...</p>
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
                  selectedRaw?.is_book_entry ? (
                    onMakeHomebrewFrom && (
                      <Button
                        className="picker-step__confirm-position"
                        onClick={() => onMakeHomebrewFrom(selectedRaw)}
                      >
                        Make it as homebrew
                      </Button>
                    )
                  ) : (
                    <>
                      <Button
                        className="picker-step__confirm-position"
                        onClick={handleConfirm}
                      >
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
                  )
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
