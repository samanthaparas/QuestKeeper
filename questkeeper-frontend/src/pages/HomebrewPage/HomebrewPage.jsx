import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getRaces } from "../../utils/api";
import {
  listVisibleHomebrew,
  createHomebrew,
  updateHomebrew,
  deleteHomebrew,
} from "../../utils/homebrewStore";
import { HOMEBREW_CATEGORIES, listHomebrew } from "../../utils/homebrewMappers";
import { primeHomebrew } from "../../utils/homebrewCache";
import {
  CATEGORY_LABELS,
  emptyHomebrewForm,
  entryToForm,
} from "../../utils/homebrewForm";
import Button from "../../components/Button/Button";
import HomebrewForm from "../../components/HomebrewForm/HomebrewForm";
import HomebrewSharing from "../../components/HomebrewSharing/HomebrewSharing";
import "./HomebrewPage.css";

// Your homebrew races, subraces, backgrounds and subclasses, the ones others
// share with you, and who you share yours with.
function HomebrewPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  // The open form, or null. Arriving from "Make it as homebrew" on the
  // Backgrounds page opens it with the name, book and link filled in.
  const [form, setForm] = useState(() => {
    const prefill = location.state?.newHomebrew;
    if (!prefill?.category) return null;
    const { category, data, ...fields } = prefill;
    const blank = emptyHomebrewForm(category);
    return { ...blank, ...fields, data: { ...blank.data, ...data } };
  });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [srdRaces, setSrdRaces] = useState([]);
  const [ownerLabels, setOwnerLabels] = useState({}); // owner id -> "Sam"

  const loadEntries = useCallback(() => {
    listVisibleHomebrew()
      .then(setEntries)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false));
  }, []);

  // Forget the pre-fill once used, so a page refresh doesn't reopen the form.
  useEffect(() => {
    if (location.state?.newHomebrew) navigate(".", { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    loadEntries();
    // SRD and Open5e races, for "which race is this a subrace of?"
    getRaces().then(setSrdRaces).catch(() => setSrdRaces([]));
  }, [loadEntries]);

  // Share the up-to-date list with character creation and the other pages.
  useEffect(() => {
    if (user && !isLoading) primeHomebrew(user.id, entries);
  }, [user, isLoading, entries]);

  const mine = entries.filter((entry) => entry.owner_id === user?.id);
  const sharedWithMe = entries.filter((entry) => entry.owner_id !== user?.id);
  const visibleMine =
    categoryFilter === "all"
      ? mine
      : mine.filter((entry) => entry.category === categoryFilter);

  // Homebrew races first, so a homebrew subrace can belong to one.
  const raceOptions = [...listHomebrew(entries, "race"), ...srdRaces];
  // Homebrew classes can have homebrew subclasses too.
  const classOptions = listHomebrew(entries, "class");

  async function handleSave(entry) {
    if (form.id) {
      const saved = await updateHomebrew(form.id, entry);
      setEntries((previous) => previous.map((item) => (item.id === saved.id ? saved : item)));
    } else {
      const saved = await createHomebrew(entry);
      setEntries((previous) =>
        [...previous, saved].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
    setForm(null);
  }

  async function handleDelete(entry) {
    if (
      !window.confirm(
        `Delete ${entry.name}? Characters already using it keep their copy.`,
      )
    ) {
      return;
    }
    try {
      await deleteHomebrew(entry.id);
      setEntries((previous) => previous.filter((item) => item.id !== entry.id));
      if (form?.id === entry.id) setForm(null);
    } catch (deleteError) {
      setError(deleteError.message ?? "Could not delete.");
    }
  }

  function openForm(nextForm) {
    setForm(nextForm);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const counts = Object.fromEntries(
    HOMEBREW_CATEGORIES.map((category) => [
      category,
      mine.filter((entry) => entry.category === category).length,
    ]),
  );

  return (
    <main className="homebrew-page">
      <div className="homebrew-page__content">
        <h1 className="homebrew-page__title">My Homebrew</h1>
        <p className="homebrew-page__description">
          Make your own races, subraces, backgrounds and subclasses, or write up
          an option from a book your table uses. They show up in character
          creation with a "Homebrew" badge, for you and anyone you share them with.
        </p>

        {error && (
          <p className="homebrew-page__error" role="alert">
            {error}
          </p>
        )}

        {form ? (
          <HomebrewForm
            // A new key resets the form when switching entries.
            key={form.id ?? `new-${form.category}`}
            initialForm={form}
            raceOptions={raceOptions}
            classOptions={classOptions}
            onSave={handleSave}
            onCancel={() => setForm(null)}
          />
        ) : (
          <div className="homebrew-page__new">
            <span className="homebrew-page__new-label">Make a new:</span>
            {HOMEBREW_CATEGORIES.map((category) => (
              <Button key={category} onClick={() => openForm(emptyHomebrewForm(category))}>
                {CATEGORY_LABELS[category]}
              </Button>
            ))}
          </div>
        )}

        <section aria-labelledby="homebrew-mine-title">
          <h2 id="homebrew-mine-title" className="homebrew-page__section-title">
            Your homebrew
          </h2>

          {mine.length > 0 && (
            <div className="homebrew-page__filters" role="group" aria-label="Filter by type">
              {["all", ...HOMEBREW_CATEGORIES].map((category) => (
                <button
                  type="button"
                  key={category}
                  className={`homebrew-page__filter${
                    categoryFilter === category ? " homebrew-page__filter--active" : ""
                  }`}
                  aria-pressed={categoryFilter === category}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category === "all" ? "All" : CATEGORY_LABELS[category]} (
                  {category === "all" ? mine.length : counts[category]})
                </button>
              ))}
            </div>
          )}

          {isLoading && <p className="homebrew-page__empty">Loading your homebrew...</p>}
          {!isLoading && mine.length === 0 && (
            <p className="homebrew-page__empty">
              Nothing yet. Pick what to make above to get started.
            </p>
          )}

          <ul className="homebrew-page__list">
            {visibleMine.map((entry) => (
              <li className="homebrew-page__item" key={entry.id}>
                <div className="homebrew-page__item-info">
                  <span className="homebrew-page__item-name">
                    {entry.name}
                    <span className="homebrew-page__tag">
                      {CATEGORY_LABELS[entry.category]}
                    </span>
                    {/* Shared vs draft, so authors know what others can see. */}
                    <span
                      className={`homebrew-page__tag${
                        entry.is_shared ? " homebrew-page__tag--shared" : ""
                      }`}
                    >
                      {entry.is_shared ? "Shared" : "Private draft"}
                    </span>
                  </span>
                  {entry.based_on && (
                    <span className="homebrew-page__item-meta">Based on {entry.based_on}</span>
                  )}
                </div>
                <div className="homebrew-page__item-actions">
                  <Button variant="secondary" onClick={() => openForm(entryToForm(entry))}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(entry)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="homebrew-shared-title">
          <h2 id="homebrew-shared-title" className="homebrew-page__section-title">
            Shared with you
          </h2>
          {sharedWithMe.length === 0 ? (
            <p className="homebrew-page__empty">
              Nothing shared with you yet. Homebrew from people at your tables, and
              from invites you accept, shows up here.
            </p>
          ) : (
            <ul className="homebrew-page__list">
              {sharedWithMe.map((entry) => (
                <li className="homebrew-page__item" key={entry.id}>
                  <div className="homebrew-page__item-info">
                    <span className="homebrew-page__item-name">
                      {entry.name}
                      <span className="homebrew-page__tag">
                        {CATEGORY_LABELS[entry.category] ?? entry.category}
                      </span>
                    </span>
                    <span className="homebrew-page__item-meta">
                      From {ownerLabels[entry.owner_id] ?? "someone at your table"}
                      {entry.based_on ? ` · based on ${entry.based_on}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {user && (
          <HomebrewSharing
            userId={user.id}
            onGrantsChange={(grants) =>
              setOwnerLabels(
                Object.fromEntries(
                  grants.sharedWithMe.map((grant) => [grant.owner_id, grant.sender_label]),
                ),
              )
            }
            onAccessRemoved={loadEntries}
          />
        )}
      </div>
    </main>
  );
}

export default HomebrewPage;
