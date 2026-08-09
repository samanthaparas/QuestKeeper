import { useEffect, useState } from "react";
import { getClasses, getClassDetails } from "../utils/api";
import SearchForm from "../components/SearchForm/SearchForm";
import DetailPanel from "../components/DetailPanel/DetailPanel";
import ResultCard from "../components/ResultCard/ResultCard";
import "../pages/SearchPage/SearchPage.css";

function ClassesPage() {
  const [classResults, setClassResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    getClasses()
      .then((data) => {
        const formattedClasses = data.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Class",
          description: "Select this class to view more details.",
          url: item.url,
        }));

        setClassResults(formattedClasses);
      })
      .catch((err) => {
        console.error("Unable to load classes:", err);
        setApiError("Unable to load classes. Please try again later.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filteredClasses = classResults.filter((result) =>
    result.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  function handleSearchSubmit(e) {
    e.preventDefault();
  }

  function handleSearchChange(e) {
    setSearchQuery(e.target.value);
    setSelectedResult(null);
  }

  function handleResultClick(result) {
    setSelectedResult(result);

    getClassDetails(result.index)
      .then((data) => {
        const savingThrows = data.saving_throws
          .map((item) => item.name)
          .join(", ");

        const proficiencies = data.proficiencies.map((item) => item.name);

        const skillChoices = data.proficiency_choices
          .map((choice) => choice.desc)
          .join(" ");

        const startingEquipment = data.starting_equipment
          .map((item) => `${item.equipment.name} x${item.quantity}`)
          .join(", ");

        const subclasses = data.subclasses.map((item) => item.name).join(", ");

        const formattedClass = {
          name: data.name,
          category: "Class",
          hitDie: `d${data.hit_die}`,
          savingThrows,
          proficiencies,
          skillChoices,
          startingEquipment,
          subclasses,
        };

        setSelectedResult(formattedClass);
        setApiError("");
      })
      .catch(() => {
        setApiError("Unable to load class details. Please try again later.");
      });
  }

  return (
    <main className="search-page">
      <div className="search-page__content">
        <h1 className="search-page__title">Explore Classes</h1>

        <p className="search-page__description">
          A class represents what your character does best, like casting spells,
          fighting, healing, sneaking, or protecting the party.
        </p>

        <SearchForm
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
        />

        {isLoading && <p className="search-page__status">Loading classes...</p>}
        {apiError && <p className="search-page__error">{apiError}</p>}

        <section
          className={`search-page__layout ${
            selectedResult ? "search-page__layout--detail-open" : ""
          }`}
        >
          <div className="search-page__results">
            {!isLoading && filteredClasses.length === 0 && (
              <p className="search-page__empty">
                No classes found. Try another search.
              </p>
            )}

            {filteredClasses.map((result) => (
              <ResultCard
                key={result.name}
                result={result}
                isSelected={selectedResult?.name === result.name}
                onClick={() => handleResultClick(result)}
              />
            ))}
          </div>

          <div className="search-page__detail-wrapper">
            {selectedResult && (
              <button
                className="search-page__back-button"
                type="button"
                onClick={() => setSelectedResult(null)}
              >
                Back to results
              </button>
            )}

            <DetailPanel selectedResult={selectedResult} />
          </div>
        </section>
      </div>
    </main>
  );
}

export default ClassesPage;
