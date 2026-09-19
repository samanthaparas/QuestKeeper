import { useEffect, useState } from "react";
import ResultCard from "../ResultCard/ResultCard";
import DetailPanel from "../DetailPanel/DetailPanel";
import "./PickerStep.css";
import Button from "../Button/Button";

function PickerStep({
  title,
  description,
  category,
  fetchList,
  fetchDetails,
  mapToDetailPanelResult,
  mapToSnapshot,
  initialSelectedRaw,
  emptyMessage,
  onChoose,
  onSkip,
  onBack,
  backLabel,
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

      {isLoading && <p className="picker-step__status">Loading options...</p>}
      {apiError && <p className="picker-step__error">{apiError}</p>}
      {showEmptyState && <p className="picker-step__status">{emptyMessage}</p>}

      {!isLoading && !apiError && !showEmptyState && (
        <div className="picker-step__layout">
          <div className="picker-step__list">
            {items.map((item) => (
              <ResultCard
                key={item.index}
                result={{ name: item.name, category, index: item.index }}
                isSelected={selectedIndex === item.index}
                onClick={() => handleSelect(item)}
              />
            ))}
          </div>

          <div className="picker-step__detail">
            {isDetailLoading && (
              <p className="picker-step__status">Loading details...</p>
            )}

            <DetailPanel
              selectedResult={selectedDetail}
              actions={
                selectedDetail && !isDetailLoading ? (
                  <Button
                    className="picker-step__confirm-position"
                    onClick={handleConfirm}
                  >
                    Choose {selectedDetail.name}
                  </Button>
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
