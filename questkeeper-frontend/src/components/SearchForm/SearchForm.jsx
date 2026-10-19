import { useId } from "react";
import "./SearchForm.css";

// The search box. Two kinds:
//
// - Global (the home page and the Search page): typing then Search looks
//   through everything QuestKeeper has.
// - A list's own search (Races, Spells...): pass `scope` ("races"). It
//   filters that list as you type, says so under the box, and its button is
//   a separate, clearly named "Search everywhere" that goes to the global
//   search instead, so nobody is surprised by which one they used.
//
// label: the box's name. With `scope` it's shown above the box ("Search
// races"), so the box is never named only by its placeholder. The home page
// keeps its label for screen readers only, under its own big heading.
// onSearchEverywhere(query): for a list's search, opens the global search.
function SearchForm({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  scope = null,
  label = scope ? `Search ${scope}` : "Search",
  placeholder = scope ? `Type to filter ${scope}…` : "Search spells, classes, races, rules, or game terms…",
  onSearchEverywhere = null,
  inputId = "search-input",
  // A global search can show its label above the box too, with a hint
  // under it (the home page's "Search by name").
  showLabel = false,
  hint = "",
}) {
  const hintId = useId();
  const isScoped = Boolean(scope);
  const labelShown = isScoped || showLabel;
  const hintText = isScoped
    ? `Filters the ${scope} below as you type.${
        onSearchEverywhere ? " Search everywhere also looks through classes, races, spells and backgrounds." : ""
      }`
    : hint;

  function submit(event) {
    event.preventDefault();
    // A list's own search has already filtered as you typed; Enter (or the
    // button) only goes elsewhere when it's the global search button.
    if (isScoped) {
      if (onSearchEverywhere && searchQuery.trim()) onSearchEverywhere(searchQuery.trim());
      return;
    }
    onSearchSubmit?.(event);
  }

  return (
    <div className={`search-form-wrapper${labelShown ? " search-form-wrapper--scoped" : ""}`}>
      {labelShown && (
        <label className="search-form__visible-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {/* A search landmark, named for its list ("Races search"), so it's
          told apart from the header's search; the box inside has the full
          label. */}
      <form
        className="search-form"
        role="search"
        aria-label={isScoped ? scope.charAt(0).toUpperCase() + scope.slice(1) : undefined}
        onSubmit={submit}
      >
        {!labelShown && (
          <label className="search-form__label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <input
          id={inputId}
          className="search-form__input"
          type="search"
          value={searchQuery}
          onChange={onSearchChange}
          onKeyDown={(e) => {
            // A list's search filters as you type, so Enter does nothing
            // more (it never jumps to another page by surprise).
            if (e.key === "Enter") {
              e.preventDefault();
              if (!isScoped) e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          aria-describedby={hintText ? hintId : undefined}
          autoComplete="off"
        />
        {(!isScoped || onSearchEverywhere) && (
          <button
            className="search-form__button"
            type="submit"
            disabled={!searchQuery.trim()}
          >
            {isScoped ? "Search everywhere" : "Search"}
          </button>
        )}
      </form>
      {hintText && (
        <p className="search-form__hint" id={hintId}>
          {hintText}
        </p>
      )}
    </div>
  );
}

export default SearchForm;
