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
        placeholder="Search everything..."
        required
      />
    </form>
  );
}

export default SearchForm;
