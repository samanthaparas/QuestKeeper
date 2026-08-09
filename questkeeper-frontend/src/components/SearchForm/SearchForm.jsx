import "./SearchForm.css";

function SearchForm({ searchQuery, onSearchChange, onSearchSubmit }) {
  return (
    <form className="search-form" onSubmit={onSearchSubmit}>
      <label className="search-form__label" htmlFor="search-input">
        Search
      </label>
      <input
        id="search-input"
        className="search-form__input"
        type="text"
        value={searchQuery}
        onChange={onSearchChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Search everything..."
        required
      />
      <button
        className="search-form__button"
        type="submit"
        disabled={!searchQuery.trim()}
      >
        Search
      </button>
    </form>
  );
}

export default SearchForm;
