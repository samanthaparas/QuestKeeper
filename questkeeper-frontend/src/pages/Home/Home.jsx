import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import SearchForm from "../../components/SearchForm/SearchForm";
import CategoryCard from "../../components/CategoryCard/CategoryCard";
import Footer from "../../components/Footer/Footer";
import { useAuth } from "../../context/useAuth";
import { getMostRecentCharacter } from "../../utils/characterStore";
import { getSpellSlots } from "../../utils/characterSheet";
import {
  getBackgroundIcon,
  getClassIcon,
  getMagicItemIcon,
  getRaceIcon,
  getSpellSchoolIcon,
  getUiIcon,
} from "../../utils/icons";
import { clearDestination, describeDestination, readDestination } from "../../utils/continueAfterLogin";
import { openQuickSearch } from "../../utils/quickJump";
import { MIN_ANSWERS } from "../../utils/quizScoring";
import { QUESTIONS } from "../../utils/quizData";
import "./Home.css";

const SUGGESTED_SEARCHES = ["Fireball", "Elf", "Wizard", "Acolyte"];
// An example for search by meaning: a situation, not a name.
const MEANING_EXAMPLE = "Help me sneak past guards";

// The front door. One main next step (the character quiz, or your own
// character when you have one), quick reference search by name or by
// meaning, and three paths: discover a hero, play at a table, run a
// session, each with a sample to look at before signing up.
function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // The "Welcome back" character belongs to whoever is signed in right now.
  // It's remembered with that person's id, so signing out (or someone else
  // signing in on this device) hides it at once, without a reload.
  const [recent, setRecent] = useState({ userId: null, character: null });
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return undefined;
    let ignore = false;
    getMostRecentCharacter().then((character) => {
      if (!ignore) setRecent({ userId, character });
    });
    return () => {
      ignore = true;
    };
  }, [userId]);
  const recentCharacter = userId && recent.userId === userId ? recent.character : null;

  // Signed in after being sent to log in (or after confirming their email in
  // a new tab): offer to carry on where they were headed.
  const [destination, setDestination] = useState(readDestination);
  const pending = user && destination ? describeDestination(destination) : null;

  function runSearch(term) {
    const trimmed = term.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    runSearch(searchQuery);
  }

  const spellSlots = recentCharacter ? getSpellSlots(recentCharacter.spellcasting) : [];
  const hasSpellSlots = spellSlots.some((slot) => slot.max > 0);
  const remainingSpellSlots = spellSlots.reduce((sum, slot) => sum + slot.current, 0);
  // One filled button on the page: your character if you have one (or
  // somewhere you were headed), otherwise the quiz.
  const quizIsMain = !recentCharacter && !pending;

  return (
    <main className="home">
      <section className="home__hero">
        {/* An adventurer's pack with a map and compass, setting out: the same
            hand-inked art as the Former Adventurer background. Decorative, and
            only on wide screens, where it sits beside the words without
            making the hero taller (Home.css). */}
        <img className="home__hero-art" src={getBackgroundIcon("former-adventurer")} alt="" width="220" height="220" />
        <span className="home__eyebrow">A Welcoming Table for Every Adventurer</span>
        <h1 className="home__title">Find your way into the story.</h1>
        <p className="home__subtitle">
          QuestKeeper makes character choices and game rules feel like friendly guidance from an experienced
          player — not homework from a rulebook.
        </p>

        <div className="home__start">
          <Link className={quizIsMain ? "home__cta" : "home__cta home__cta--quiet"} to="/quiz">
            Discover your hero with the quiz
          </Link>
          <p className="home__cta-note">
            Up to {QUESTIONS.length} short questions about how you like to play. Skip any; your results are ready
            after {MIN_ANSWERS} answers. No account needed.
          </p>
        </div>

        {/* Two ways to look something up: by its name, or by what it does. */}
        <div className="home__lookup">
          <SearchForm
            showLabel
            label="Search by name"
            placeholder="A spell, race, class or background, like Fireball"
            hint="Finds rules and options whose name matches what you type."
            searchQuery={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            onSearchSubmit={handleSearchSubmit}
          />

          <div className="home__suggestions">
            <span className="home__suggestions-label">Try a name:</span>
            {SUGGESTED_SEARCHES.map((term) => (
              <button key={term} type="button" className="home__suggestion-chip" onClick={() => runSearch(term)}>
                {term}
              </button>
            ))}
          </div>

          <section className="home__meaning" aria-labelledby="home-meaning-title">
            <h2 id="home-meaning-title" className="home__meaning-title">
              Don&apos;t know the name? Search by meaning
            </h2>
            <p className="home__meaning-text">
              Describe what you want to do and QuestKeeper suggests spells, items and options that fit, each
              with a short reason.
            </p>
            <div className="home__meaning-actions">
              <button
                type="button"
                className="home__meaning-button"
                onClick={() => openQuickSearch({ query: MEANING_EXAMPLE, meaning: true })}
              >
                ✨ Try &ldquo;{MEANING_EXAMPLE}&rdquo;
              </button>
              <p className="home__meaning-tip">
                Or press <kbd>/</kbd> anywhere, type your own description, and choose ✨ Search by meaning.
              </p>
            </div>
          </section>
        </div>
      </section>

      {pending && (
        <section className="home__continue" aria-labelledby="home-pending-title">
          <div className="home__continue-card">
            <h2 id="home-pending-title" className="home__continue-title">
              Pick up where you left off
            </h2>
            {/* They're signed in now, so say what they'd started, not "after you sign in". */}
            <p className="home__continue-subtitle">Before signing in, you were about to: {pending.title}.</p>
            <button
              type="button"
              className="home__continue-button"
              onClick={() => {
                clearDestination();
                navigate(destination.from, { state: destination.fromState });
              }}
            >
              {pending.action}
            </button>
            <button
              type="button"
              className="home__continue-dismiss"
              onClick={() => {
                clearDestination();
                setDestination(null);
              }}
            >
              No thanks
            </button>
          </div>
        </section>
      )}

      {recentCharacter && (
        <section className="home__continue">
          <div className="home__continue-card">
            <h2 className="home__continue-title">Welcome back, {recentCharacter.name}</h2>
            <p className="home__continue-subtitle">
              Level {recentCharacter.level} {recentCharacter.race?.name ?? ""} {recentCharacter.class?.name ?? ""} ·
              ready for the next session
            </p>

            <div className="home__continue-badges">
              <span className="home__badge">
                {recentCharacter.combat.hitPoints.current} / {recentCharacter.combat.hitPoints.max} HP
              </span>
              {hasSpellSlots && <span className="home__badge">{remainingSpellSlots} spell slots</span>}
            </div>

            <Link
              className={pending ? "home__continue-button home__continue-button--quiet" : "home__continue-button"}
              to={`/characters/${recentCharacter.id}`}
            >
              Open character sheet
            </Link>
          </div>
        </section>
      )}

      {/* Three ways in. Each has something to look at before signing up. */}
      <section className="home__paths" aria-labelledby="home-paths-title">
        <h2 id="home-paths-title" className="home__paths-title">
          Where would you like to start?
        </h2>
        <div className="home__paths-grid">
          <article className="home__path">
            <h3>Discover your hero</h3>
            <p>Take the quiz, or build from scratch with every term explained as it comes up.</p>
            <ul>
              <li>
                <Link to="/quiz">Take the character quiz</Link>
              </li>
              <li>
                <Link to="/characters/new">Build a character from scratch</Link>
              </li>
              <li>
                <Link to="/guide">Learn the basics first</Link>
              </li>
            </ul>
          </article>

          <article className="home__path">
            <h3>Play at your table</h3>
            <p>A character sheet that rolls your dice, tracks HP and spells, and joins your DM&apos;s game.</p>
            <ul>
              <li>
                <Link to="/sample/character">See a sample character sheet</Link>
              </li>
              <li>
                <Link to="/characters">Your characters</Link>
              </li>
              <li>
                <Link to="/games">Join a game with a code</Link>
              </li>
            </ul>
          </article>

          <article className="home__path">
            <h3>Run a session</h3>
            <p>Turn order, monsters with hidden HP, and the whole party&apos;s health at a glance.</p>
            <ul>
              <li>
                <Link to="/sample/table">See a sample DM table</Link>
              </li>
              <li>
                <Link to="/dm">Your DM screen</Link>
              </li>
            </ul>
          </article>
        </div>
        <p className="home__paths-note">Your characters, tables and homebrew need a free account; the samples don&apos;t.</p>
      </section>

      {/* Each category shows the artwork its own pages use (the Acolyte and
          Fireball's school match the name suggestions above). */}
      <section className="home__categories">
        <h2 className="home__categories-title">Browse Categories</h2>
        <div className="home__categories-grid">
          <Link to="races" className="category-link">
            <CategoryCard art={getRaceIcon("elf")} title="Races" description="Appearance, culture, traits, and playstyle" />
          </Link>

          <Link to="classes" className="category-link">
            <CategoryCard art={getClassIcon("fighter")} title="Classes" description="What each hero does and how it feels" />
          </Link>

          <Link to="backgrounds" className="category-link">
            <CategoryCard art={getBackgroundIcon("acolyte")} title="Backgrounds" description="Turn a past life into story possibilities" />
          </Link>

          <Link to="spells" className="category-link">
            <CategoryCard art={getSpellSchoolIcon("evocation")} tightArt title="Spells" description="Search magic by purpose and situation" />
          </Link>

          <Link to="feats" className="category-link">
            <CategoryCard art={getUiIcon("level-up")} title="Feats" description="Special talents to learn as you level up" />
          </Link>

          <Link to="magic-items" className="category-link">
            <CategoryCard art={getMagicItemIcon("potion")} tightArt title="Magic Items" description="Gear, potions and treasures, with filters" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default Home;
