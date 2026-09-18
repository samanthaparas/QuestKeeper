import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import SearchForm from "../../components/SearchForm/SearchForm";
import CategoryCard from "../../components/CategoryCard/CategoryCard";
import Footer from "../../components/Footer/Footer";
import { getMostRecentCharacter } from "../../utils/characterStore";
import { getSpellSlots } from "../../utils/characterSheet";
import "./Home.css";

const SUGGESTED_SEARCHES = ["Fireball", "Elf", "Wizard", "Acolyte"];

function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const recentCharacter = getMostRecentCharacter();

  function runSearch(term) {
    const trimmed = term.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    runSearch(searchQuery);
  }

  const spellSlots = recentCharacter
    ? getSpellSlots(recentCharacter.spellcasting)
    : [];
  const hasSpellSlots = spellSlots.some((slot) => slot.max > 0);
  const remainingSpellSlots = spellSlots.reduce(
    (sum, slot) => sum + slot.current,
    0,
  );

  return (
    <main className="home">
      <section className="home__hero">
        <span className="home__eyebrow">
          A Welcoming Table for Every Adventurer
        </span>
        <h1 className="home__title">Find your way into the story.</h1>
        <p className="home__subtitle">
          QuestKeeper makes character choices and game rules feel like friendly
          guidance from an experienced player — not homework from a rulebook.
        </p>

        <SearchForm
          searchQuery={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          onSearchSubmit={handleSearchSubmit}
        />

        <div className="home__suggestions">
          <span className="home__suggestions-label">Try searching:</span>
          {SUGGESTED_SEARCHES.map((term) => (
            <button
              key={term}
              type="button"
              className="home__suggestion-chip"
              onClick={() => runSearch(term)}
            >
              {term}
            </button>
          ))}
        </div>
      </section>

      {recentCharacter && (
        <section className="home__continue">
          <div className="home__continue-card">
            <h2 className="home__continue-title">
              Welcome back, {recentCharacter.name}
            </h2>
            <p className="home__continue-subtitle">
              Level {recentCharacter.level} {recentCharacter.race?.name ?? ""}{" "}
              {recentCharacter.class?.name ?? ""} · ready for the next session
            </p>

            <div className="home__continue-badges">
              <span className="home__badge">
                {recentCharacter.combat.hitPoints.current} /{" "}
                {recentCharacter.combat.hitPoints.max} HP
              </span>
              {hasSpellSlots && (
                <span className="home__badge">
                  {remainingSpellSlots} spell slots
                </span>
              )}
            </div>

            <Link
              className="home__continue-button"
              to={`/characters/${recentCharacter.id}`}
            >
              Open character sheet
            </Link>
          </div>
        </section>
      )}

      <section className="home__beginner-path">
        <Link className="home__beginner-step" to="/about">
          <span className="home__beginner-number">1</span>
          <h3>Learn the basics</h3>
          <p>A friendly guide to dice, abilities, turns, and choices.</p>
        </Link>

        <Link className="home__beginner-step" to="/characters/new">
          <span className="home__beginner-number">2</span>
          <h3>Build your hero</h3>
          <p>
            Choose by story and playstyle — we explain terms as they appear.
          </p>
        </Link>

        <Link className="home__beginner-step" to="/characters">
          <span className="home__beginner-number">3</span>
          <h3>Bring them to the table</h3>
          <p>A compact sheet keeps your next useful action easy to find.</p>
        </Link>
      </section>

      <section className="home__categories">
        <h2 className="home__categories-title">Browse Categories</h2>
        <div className="home__categories-grid">
          <Link to="races" className="category-link">
            <CategoryCard
              icon="🛡️"
              title="Races"
              description="Appearance, culture, traits, and playstyle"
            />
          </Link>

          <Link to="classes" className="category-link">
            <CategoryCard
              icon="⚔️"
              title="Classes"
              description="What each hero does and how it feels"
            />
          </Link>

          <Link to="backgrounds" className="category-link">
            <CategoryCard
              icon="📖"
              title="Backgrounds"
              description="Turn a past life into story possibilities"
            />
          </Link>

          <Link to="spells" className="category-link">
            <CategoryCard
              icon="✨"
              title="Spells"
              description="Search magic by purpose and situation"
            />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default Home;
