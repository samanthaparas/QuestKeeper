import { useEffect, useId, useRef } from "react";
import Button from "../Button/Button";
import { ABILITY_SCORES, ABILITY_LABELS } from "../../utils/characterSheet";
import "./CharacterDetailsDialog.css";
import { usePopupBehavior } from "../../hooks/usePopupBehavior";

// "Edit details" pop-up from beside the character's name: name, race,
// class, subclass, background, level and spellcasting ability. Changes save
// as you type, like the rest of the sheet; Done just closes it.
function CharacterDetailsDialog({
  isOpen,
  onClose,
  name,
  level,
  onLevelChange,
  details,
  onDetailChange,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();

  // Page stays still behind it; the phone's Back closes it.
  usePopupBehavior(isOpen, onClose);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // [field, label, value, placeholder, longest allowed]. The limits keep the
  // name line at the top of the sheet from wrapping onto many lines; the
  // longest official subclass ("Path of the Ancestral Guardian") is 30.
  const detailFields = [
    ["name", "Character name", name, "", 60],
    ["race", "Race", details.race, "e.g. Human, or your own", 40],
    ["class", "Class", details.className, "e.g. Artificer", 30],
    ["subclass", "Subclass", details.subclass, "Optional", 32],
    ["background", "Background", details.background, "e.g. Sage", 40],
  ];

  return (
    <dialog
      ref={dialogRef}
      className="character-details-dialog"
      aria-labelledby={titleId}
      // Escape closes it the same way Done does.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {isOpen && (
        <div className="character-details-dialog__content">
          <h2 id={titleId} className="character-details-dialog__title">
            Character details
          </h2>
          <p className="character-details-dialog__lead">
            Type anything here, including homebrew or non-SRD options, so the
            sheet matches your paper one.
          </p>

          <div className="character-details-dialog__fields">
            {detailFields.map(([field, label, value, placeholder, maxLength]) => (
              <label className="character-sheet__stat-box" key={field}>
                <span className="character-sheet__stat-label">{label}</span>
                <input
                  type="text"
                  className="character-sheet__stat-input"
                  value={value ?? ""}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  onChange={(e) => onDetailChange(field, e.target.value)}
                />
              </label>
            ))}

            {/* Level Up is the usual way to change it; this box is mostly for
                fixing mistakes. */}
            <label
              className="character-sheet__stat-box"
              title="Use the Level Up button to gain a level properly. This box is for fixing a mistake."
            >
              <span className="character-sheet__stat-label">Level</span>
              <input
                type="number"
                className="character-sheet__stat-input"
                value={level ?? 1}
                min={1}
                max={20}
                onChange={(e) => onLevelChange(e.target.value)}
              />
            </label>

            <label className="character-sheet__stat-box">
              <span className="character-sheet__stat-label">Spellcasting ability</span>
              <select
                className="character-sheet__stat-input"
                value={details.spellcastingAbility}
                onChange={(e) => onDetailChange("spellcastingAbility", e.target.value)}
              >
                <option value="default">Class default</option>
                <option value="none">None</option>
                {ABILITY_SCORES.map((ability) => (
                  <option key={ability} value={ability}>
                    {ABILITY_LABELS[ability]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Button className="character-details-dialog__done" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </dialog>
  );
}

export default CharacterDetailsDialog;
