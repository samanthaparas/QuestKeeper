import { useEffect, useState } from "react";
import ResultCard from "../ResultCard/ResultCard";
import DetailPanel from "../DetailPanel/DetailPanel";
import "./PickerStep.css";

function PickerStep({
  title,
  description,
  category,
  fetchList,
  fetchDetails,
  mapToDetailPanelResult,
  mapToSnapshot,
  onChoose,
  onBack,
  backLabel,
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedRaw, setSelectedRaw] = useState(null);
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
    onChoose(mapToSnapshot(selectedRaw));
  }

  return (
    <div className="picker-step">
      <h2 className="picker-step__title">{title}</h2>
      <p className="picker-step__description">{description}</p>

      {isLoading && <p className="picker-step__status">Loading options...</p>}
      {apiError && <p className="picker-step__error">{apiError}</p>}

      <div className="picker-step__layout">
        <div className="picker-step__list">
          {items.map((item) => (
            <ResultCard
              key={item.index}
              result={{ name: item.name, category }}
              isSelected={selectedIndex === item.index}
              onClick={() => handleSelect(item)}
            />
          ))}
        </div>

        <div className="picker-step__detail">
          {isDetailLoading && (
            <p className="picker-step__status">Loading details...</p>
          )}

          <DetailPanel selectedResult={selectedDetail} />

          {selectedDetail && !isDetailLoading && (
            <button
              className="picker-step__confirm-button"
              type="button"
              onClick={handleConfirm}
            >
              Choose {selectedDetail.name}
            </button>
          )}
        </div>
      </div>

      <button
        className="picker-step__back-button"
        type="button"
        onClick={onBack}
      >
        {backLabel}
      </button>
    </div>
  );
}

export default PickerStep;
