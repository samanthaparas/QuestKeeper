import { useState } from "react";
import { getSpellDetails } from "../../utils/api";
import { formatSpellDetails } from "../../utils/srdDetails";
import { getSpellSummary } from "../../utils/spellSummaries";
import { SrdBlocks } from "../DetailPanel/DetailPanel";
import "./SpellChoiceOption.css";

// One spell in a "pick your spells" list: the checkbox, a one-line summary of
// what it does, and a "Read more" button that shows the full SRD text, so
// nobody has to choose blind or open another tab.
function SpellChoiceOption({
  spell,
  checked,
  disabled,
  onToggle,
  note,
  lockLabel = "Limit reached",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [details, setDetails] = useState({ status: "idle", spell: null });
  const summary = getSpellSummary(spell.index);
  const isLocked = disabled && !checked;

  function toggleDetails() {
    const opening = !isOpen;
    setIsOpen(opening);

    if (opening && details.status === "idle") {
      setDetails({ status: "loading", spell: null });
      getSpellDetails(spell.index)
        .then((data) =>
          setDetails({ status: "ready", spell: formatSpellDetails(data) }),
        )
        .catch(() => setDetails({ status: "error", spell: null }));
    }
  }

  return (
    <div
      className={`spell-option${isLocked ? " spell-option--locked" : ""}${
        checked ? " spell-option--picked" : ""
      }`}
    >
      <label className="spell-option__label">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
        />
        <span className="spell-option__name">{spell.name}</span>
        {summary && (
          <span
            className={`spell-option__tag spell-option__tag--${summary.tag.toLowerCase()}`}
          >
            {summary.tag}
          </span>
        )}
        {isLocked && (
          <span className="spell-option__lock">
            {note ? "Locked" : lockLabel}
          </span>
        )}
        {note && <span className="spell-option__note">{note}</span>}
      </label>

      {summary && <p className="spell-option__summary">{summary.text}</p>}

      <button
        type="button"
        className="spell-option__more"
        aria-expanded={isOpen}
        onClick={toggleDetails}
      >
        {isOpen ? "Hide details" : "Read more"}
      </button>

      {isOpen && (
        <div className="spell-option__details">
          {details.status === "loading" && <p>Loading the full text...</p>}
          {details.status === "error" && (
            <p>Couldn't load the full text. Try again in a moment.</p>
          )}
          {details.status === "ready" && (
            <>
              <p className="spell-option__kind">{details.spell.kind}</p>
              <p className="spell-option__facts">
                {details.spell.facts
                  .map((fact) => `${fact.label}: ${fact.value}`)
                  .join(" · ")}
              </p>
              <SrdBlocks blocks={details.spell.blocks} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SpellChoiceOption;
