import { useEffect, useId, useRef } from "react";
import Button from "../Button/Button";
import "./SrdDetailDialog.css";

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

          {view.status === "ready" &&
            view.details.map((details, index) => (
              <section className="srd-dialog__entry" key={index}>
                <p className="srd-dialog__meta">
                  <span className="srd-dialog__badge">
                    {details.edition} SRD
                  </span>
                  {details.kind}
                </p>

                {details.facts.length > 0 && (
                  <dl className="srd-dialog__facts">
                    {details.facts.map((fact) => (
                      <div className="srd-dialog__fact" key={fact.label}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {details.paragraphs.map((paragraph, paragraphIndex) => (
                  <p className="srd-dialog__paragraph" key={paragraphIndex}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
        </div>
      )}
    </dialog>
  );
}

export default SrdDetailDialog;
