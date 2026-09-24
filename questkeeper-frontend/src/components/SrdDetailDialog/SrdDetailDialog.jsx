import { useEffect, useId, useRef, useState } from "react";
import Button from "../Button/Button";
import { getEditionTabLabels } from "../../utils/srdDetails";
import "./SrdDetailDialog.css";

function SrdDetailEntries({ details }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const baseId = useId();
  const labels = getEditionTabLabels(details);
  const hasTabs = details.length > 1;
  const active = details[activeIndex];

  function selectTab(e, index) {
    setActiveIndex(index);
    e.currentTarget.closest("dialog").scrollTop = 0;
  }

  return (
    <>
      {hasTabs && (
        <div
          className="srd-dialog__tabs"
          role="tablist"
          aria-label="SRD edition"
        >
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              id={`${baseId}-tab-${index}`}
              aria-selected={index === activeIndex}
              aria-controls={`${baseId}-panel`}
              className={`srd-dialog__tab${
                index === activeIndex ? " srd-dialog__tab--active" : ""
              }`}
              onClick={(e) => selectTab(e, index)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <section
        className="srd-dialog__entry"
        id={`${baseId}-panel`}
        role={hasTabs ? "tabpanel" : undefined}
        aria-labelledby={hasTabs ? `${baseId}-tab-${activeIndex}` : undefined}
      >
        <p className="srd-dialog__meta">
          <span className="srd-dialog__badge">{active.edition} SRD</span>
          {active.kind}
        </p>

        {active.facts.length > 0 && (
          <dl className="srd-dialog__facts">
            {active.facts.map((fact) => (
              <div className="srd-dialog__fact" key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {active.paragraphs.map((paragraph, paragraphIndex) => (
          <p className="srd-dialog__paragraph" key={paragraphIndex}>
            {paragraph}
          </p>
        ))}
      </section>
    </>
  );
}

function SrdDetailDialog({ view, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const isOpen = view !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function handleDialogClick(e) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleCancel(e) {
    e.preventDefault();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="srd-dialog"
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleDialogClick}
    >
      {view && (
        <div className="srd-dialog__content">
          <div className="srd-dialog__header">
            <h2 id={titleId} className="srd-dialog__title">
              {view.title}
            </h2>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>

          {view.status === "loading" && (
            <p className="srd-dialog__status">Loading SRD details…</p>
          )}

          {view.status === "error" && (
            <p className="srd-dialog__status">
              Couldn't load the SRD details. Check your connection and try
              again.
            </p>
          )}

          {view.status === "ready" && (
            <SrdDetailEntries key={view.title} details={view.details} />
          )}
        </div>
      )}
    </dialog>
  );
}

export default SrdDetailDialog;
