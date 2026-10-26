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
import { HOMEBREW_CATEGORIES, listHomebrew, needsDetails } from "../../utils/homebrewMappers";
import { primeHomebrew } from "../../utils/homebrewCache";
import { shouldReduceMotion } from "../../utils/motionPreference";
import {
  CATEGORY_LABELS,
  emptyHomebrewForm,
  entryToForm,
} from "../../utils/homebrewForm";
import Button from "../../components/Button/Button";
import HomebrewForm from "../../components/HomebrewForm/HomebrewForm";
import { loadFormDraft } from "../../utils/formDrafts";
import HomebrewSharing from "../../components/HomebrewSharing/HomebrewSharing";
import PageBanner from "../../components/PageBanner/PageBanner";
import StatusNote from "../../components/StatusNote/StatusNote";
import { useFocusAfterRetry } from "../../components/StatusNote/useFocusAfterRetry";
import journalQuill from "../../assets/support/journal-quill.webp";
import "./HomebrewPage.css";

// Your homebrew races, subraces, backgrounds and subclasses, the ones others
// share with you, and who you share yours with.
// Unsaved changes in the editor, kept on this device.
const HOMEBREW_DRAFT_KEY = "qk-homebrew-draft";

// The first letter of a name, for the round tile on each entry (never a picture that
// could be mistaken for what the entry actually is).
function firstLetter(name) {
  return (name ?? "").trim().charAt(0).toUpperCase() || "?";
}

function HomebrewPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Something else went wrong (a delete that didn't go through).
  const [error, setError] = useState("");
  // The list itself couldn't load: said in friendly words, with a retry.
  const [loadError, setLoadError] = useState(false);
  const [hasRetried, setHasRetried] = useState(false);
  // The open form, or null. Arriving from "Make it as homebrew" on the
  // Backgrounds page opens it with the name, book and link filled in.
  // Otherwise, an entry left unsaved last time (a Back press, a reload)
  // opens again with its changes.
  const [form, setForm] = useState(() => {
    const prefill = location.state?.newHomebrew;
    if (!prefill?.category) return loadFormDraft(HOMEBREW_DRAFT_KEY)?.form ?? null;
    const { category, data, ...fields } = prefill;
    const blank = emptyHomebrewForm(category);
    return { ...blank, ...fields, data: { ...blank.data, ...data } };
  });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [srdRaces, setSrdRaces] = useState([]);
  const [ownerLabels, setOwnerLabels] = useState({}); // owner id -> "Sam"

  const loadEntries = useCallback(() => {
    listVisibleHomebrew()
      .then((found) => {
        setEntries(found);
        setLoadError(false);
      })
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, []);

  useFocusAfterRetry(hasRetried, isLoading);

  function retryLoading() {
    setHasRetried(true);
    setIsLoading(true);
    loadEntries();
  }

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
    window.scrollTo({ top: 0, behavior: shouldReduceMotion() ? "auto" : "smooth" });
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
        <PageBanner art="bestiary" eyebrow="Adventurer" title="My Homebrew">
          <p className="page-banner__description">
            Make your own races, subraces, backgrounds, classes, subclasses and feats, or write up
            an option from a book your table uses. They show up in character
            creation with a "Homebrew" badge, for you and anyone you share them with.
          </p>
        </PageBanner>

        {error && <StatusNote variant="error">{error}</StatusNote>}

        {form ? (
          <HomebrewForm
            // A new key resets the form when switching entries.
            key={form.id ?? `new-${form.category}`}
            initialForm={form}
            raceOptions={raceOptions}
            classOptions={classOptions}
            onSave={handleSave}
            onCancel={() => setForm(null)}
            draftKey={HOMEBREW_DRAFT_KEY}
          />
        ) : (
          <section className="homebrew-page__card" aria-labelledby="homebrew-new-title">
            <h2 id="homebrew-new-title" className="homebrew-page__section-title">
              Make something new
            </h2>
            <div className="homebrew-page__new">
              <span className="homebrew-page__new-label">Make a new:</span>
              {HOMEBREW_CATEGORIES.map((category) => (
                <Button key={category} onClick={() => openForm(emptyHomebrewForm(category))}>
                  {CATEGORY_LABELS[category]}
                </Button>
              ))}
            </div>
          </section>
        )}

        <div className="homebrew-page__cols">
          <div className="homebrew-page__main">
            <section className="homebrew-page__card" aria-labelledby="homebrew-mine-title">
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

              {isLoading && (
                <StatusNote variant="loading" focusOnShow={hasRetried}>
                  Loading your homebrew...
                </StatusNote>
              )}
              {loadError && (
                <StatusNote variant="error" onRetry={retryLoading}>
                  Couldn&apos;t load your homebrew. Check your connection and try again.
                </StatusNote>
              )}
              {!isLoading && !loadError && mine.length === 0 && (
                <div className="homebrew-page__empty-state">
                  <img className="homebrew-page__thumb" src={journalQuill} alt="" aria-hidden="true" />
                  <p className="homebrew-page__empty">
                    Nothing yet. Pick what to make above to get started.
                  </p>
                </div>
              )}

              <ul className="homebrew-page__list">
                {visibleMine.map((entry) => (
                  <li className="homebrew-page__item" key={entry.id}>
                    <span className="homebrew-page__medal" aria-hidden="true">
                      {firstLetter(entry.name)}
                    </span>
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
                        {/* Picked in character creation with "add details later". */}
                        {needsDetails(entry) && (
                          <span className="homebrew-page__tag homebrew-page__tag--needs">
                            Needs details
                          </span>
                        )}
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

            <section className="homebrew-page__card" aria-labelledby="homebrew-shared-title">
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
                      <span className="homebrew-page__medal" aria-hidden="true">
                        {firstLetter(entry.name)}
                      </span>
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
          </div>

        {user && (
          <aside className="homebrew-page__side" aria-label="Sharing">
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
          </aside>
        )}
        </div>
      </div>
    </main>
  );
}

export default HomebrewPage;
