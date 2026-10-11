import { useId } from "react";
import { Link } from "react-router-dom";
import { getSourceOptions } from "../../utils/sourceFilters";
import "./SourceFilter.css";

// A row of buttons for narrowing a list to one book:
// [All (19)] [SRD 5.1 (9)] [Tome of Heroes (10)]
// `value` is "all" or a source name; `onChange` gets the new value.
// `underSearch` lines it up with a search bar above (like the Spells page).
function SourceFilter({ items, value = "all", onChange, underSearch = false }) {
  const options = getSourceOptions(items);
  const labelId = useId();

  // Nothing to filter when everything comes from one book. Stay visible while
  // a book is picked, though, so the player can always get back to "All".
  if (options.length < 2 && value === "all") return null;

  const buttons = [{ source: "all", label: "All", count: items.length }].concat(
    options.map((option) => ({ ...option, label: option.source })),
  );

  return (
    <div
      className={`source-filter${underSearch ? " source-filter--under-search" : ""}`}
    >
      <span className="source-filter__label" id={labelId}>
        Source
      </span>
      <div
        className="source-filter__buttons"
        role="group"
        aria-labelledby={labelId}
      >
        {buttons.map((button) => (
          <button
            type="button"
            key={button.source}
            className={`source-filter__button${
              value === button.source ? " source-filter__button--active" : ""
            }`}
            aria-pressed={value === button.source}
            onClick={() => onChange(button.source)}
          >
            {button.label} ({button.count})
          </button>
        ))}
      </div>

      {/* Quick explainer for new players who don't know what "SRD" means. */}
      <p className="source-filter__hint">
        SRD is the free core rulebook; the others are openly licensed books
        from other publishers. <Link to="/attributions">About the sources</Link>
      </p>
    </div>
  );
}

export default SourceFilter;
