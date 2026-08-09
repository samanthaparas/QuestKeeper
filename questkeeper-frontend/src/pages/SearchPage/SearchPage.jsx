import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getClasses,
  getRaces,
  getSpells,
  getBackgrounds,
  getClassDetails,
  getRaceDetails,
  getSpellDetails,
  getBackgroundDetails,
} from "../../utils/api";
import SearchForm from "../../components/SearchForm/SearchForm";
import DetailPanel from "../../components/DetailPanel/DetailPanel";
import ResultCard from "../../components/ResultCard/ResultCard";
import "./SearchPage.css";

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [allResults, setAllResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getClasses(), getRaces(), getSpells(), getBackgrounds()])
      .then(([classesData, racesData, spellsData, backgroundsData]) => {
        const formattedClasses = classesData.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Class",
          description: "Select this class to view more details.",
          url: item.url,
        }));

        const formattedRaces = racesData.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Race",
          description: "Select this race to view more details.",
          url: item.url,
        }));

        const formattedSpells = spellsData.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Spell",
          description: "Select this spell to view more details.",
          url: item.url,
        }));

        const formattedBackgrounds = backgroundsData.map((item) => ({
          index: item.index,
          name: item.name,
          category: "Background",
          description: "Select this background to view more details.",
          url: item.url,
        }));

        setAllResults([
          ...formattedClasses,
          ...formattedRaces,
          ...formattedSpells,
          ...formattedBackgrounds,
        ]);
      })
      .catch(() => {
        setApiError("Unable to load search results. Please try again later.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filteredResults = allResults.filter((result) =>
    result.name.toLowerCase().includes(query.toLowerCase()),
  );

  function handleSearchSubmit(e) {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    setSelectedResult(null);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  function formatDetailedResult(data, category) {
    if (category === "Race") {
      const abilityBonuses = data.ability_bonuses
        .map((ability) => `${ability.ability_score.name} +${ability.bonus}`)
        .join(", ");

      return {
        name: data.name,
        category,
        speed: data.speed,
        size: data.size,
        alignment: data.alignment,
        abilityBonuses,
      };
    }

    if (category === "Class") {
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

      return {
        name: data.name,
        category,
        hitDie: `d${data.hit_die}`,
        savingThrows,
        proficiencies,
        skillChoices,
        startingEquipment,
        subclasses,
      };
    }

    if (category === "Background") {
      const startingProficiencies = data.starting_proficiencies.map(
        (item) => item.name,
      );

      const startingEquipment = data.starting_equipment.map(
        (item) => `${item.equipment.name} x${item.quantity}`,
      );

      return {
        name: data.name,
        category,
        startingProficiencies,
        languages: `Choose ${data.language_options.choose} languages`,
        startingEquipment,
        startingGold: `${data.starting_gold.quantity} ${data.starting_gold.unit}`,
        featureName: data.feature.name,
        featureDescription: data.feature.desc.join(" "),
        personalityTraits: `Choose ${data.personality_traits.choose}`,
        ideals: `Choose ${data.ideals.choose}`,
        bonds: `Choose ${data.bonds.choose}`,
        flaws: `Choose ${data.flaws.choose}`,
      };
    }

    if (category === "Spell") {
      return {
        name: data.name,
        category,
        description: data.desc?.[0] || "No description available.",
        range: data.range,
        duration: data.duration,
        castingTime: data.casting_time,
        level: data.level,
      };
    }

    return {
      name: data.name,
      category,
      description: "No details available.",
    };
  }

  function handleResultClick(result) {
    setSelectedResult(result);

    const detailRequests = {
      Class: getClassDetails,
      Race: getRaceDetails,
      Spell: getSpellDetails,
      Background: getBackgroundDetails,
    };

    detailRequests[result.category](result.index)
      .then((data) => {
        setSelectedResult(formatDetailedResult(data, result.category));
        setApiError("");
      })
      .catch(() => {
        setApiError("Unable to load result details. Please try again later.");
      });
  }

  return (
    <main className="search-page">
      <div className="search-page__content">
        <SearchForm
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          onSearchSubmit={handleSearchSubmit}
        />

        <h1 className="search-page__title">Search Results for "{query}"</h1>

        {isLoading && <p className="search-page__status">Loading results...</p>}
        {apiError && <p className="search-page__error">{apiError}</p>}

        <section
          className={`search-page__layout ${
            selectedResult ? "search-page__layout--detail-open" : ""
          }`}
        >
          <div className="search-page__results">
            {!isLoading && !apiError && filteredResults.length === 0 && (
              <p className="search-page__empty">
                No results found. Try another search.
              </p>
            )}

            {filteredResults.map((result) => (
              <ResultCard
                key={`${result.category}-${result.name}`}
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

export default SearchPage;
