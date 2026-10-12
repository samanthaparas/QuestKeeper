import { useEffect, useId, useRef } from "react";
import { createHomebrew } from "../../utils/homebrewStore";
import { refreshHomebrew } from "../../utils/homebrewCache";
import { emptyHomebrewForm } from "../../utils/homebrewForm";
import HomebrewForm from "../HomebrewForm/HomebrewForm";
import "./HomebrewDialog.css";

// The homebrew form in a pop-up, so players can make a missing option
// without leaving character creation (and losing their progress).
//
// request: null (closed) or { category, data, fields, raceOptions,
// classOptions }. `data`
// pre-fills category details (a subrace's parent race); `fields` pre-fills
// the name, "Based on" and link (e.g. from a published-book background).
// onCreated(entry): called with the saved entry.
function HomebrewDialog({ request, onClose, onCreated }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const isOpen = request !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  async function handleSave(entry) {
    const saved = await createHomebrew(entry);
    refreshHomebrew(); // so the picker's next lookup includes it
    onCreated(saved);
  }

  const initialForm = request
    ? (() => {
        const form = emptyHomebrewForm(request.category);
        return { ...form, ...request.fields, data: { ...form.data, ...request.data } };
      })()
    : null;

  return (
    <dialog
      ref={dialogRef}
      className="homebrew-dialog"
      aria-labelledby={titleId}
      // Escape closes it the same way Cancel does.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {request && (
        <div className="homebrew-dialog__content">
          <p id={titleId} className="homebrew-dialog__lead">
            Make your own. It's saved to My Homebrew, and you can edit or share
            it there later.
          </p>
          <HomebrewForm
            initialForm={initialForm}
            raceOptions={request.raceOptions ?? []}
            classOptions={request.classOptions ?? []}
            onSave={handleSave}
            onCancel={onClose}
          />
        </div>
      )}
    </dialog>
  );
}

export default HomebrewDialog;
