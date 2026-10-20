import { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import Header from "./components/Header/Header";
import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import AttributionsPage from "./pages/AttributionsPage/AttributionsPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import RacesPage from "./pages/RacesPage";
import ClassesPage from "./pages/ClassesPage";
import SpellsPage from "./pages/SpellsPage";
import BackgroundsPage from "./pages/BackgroundsPage";
import FeatsPage from "./pages/FeatsPage";
import MagicItemsPage from "./pages/MagicItemsPage/MagicItemsPage";
import CharacterCreationPage from "./pages/CharacterCreationPage/CharacterCreationPage";
import CharactersPage from "./pages/CharactersPage/CharactersPage";
import CharacterSheetPage from "./pages/CharacterSheetPage/CharacterSheetPage";
import TablesPage from "./pages/TablesPage/TablesPage";
import TablePage from "./pages/TablePage/TablePage";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import HomebrewPage from "./pages/HomebrewPage/HomebrewPage";
import HomebrewInvitePage from "./pages/HomebrewInvitePage/HomebrewInvitePage";
import Guide from "./pages/Guide/Guide";
import QuizPage from "./pages/QuizPage/QuizPage";
import BackLink from "./components/BackLink/BackLink";
import AuthPage from "./pages/AuthPage/AuthPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import SampleCharacterPage from "./pages/Samples/SampleCharacterPage";
import SampleTablePage from "./pages/Samples/SampleTablePage";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import { getPageTitle } from "./utils/pageTitle";
import { CURRENT_BUILD, fetchDeployedBuild, isNewerBuild } from "./utils/api";

function NotFound() {
  return (
    <main className="search-page">
      <div className="search-page__content">
        <h1 className="search-page__title">We couldn't find that page</h1>
        <p className="search-page__description">
          The link may be old or mistyped. <Link to="/">Head back home</Link> or{" "}
          <Link to="/guide">start with the beginner guide</Link>.
        </p>
      </div>
    </main>
  );
}

// Keeps the browser tab's title in step with the page.
function PageTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = getPageTitle(pathname);
  }, [pathname]);
  return null;
}

// "Skip to the main content" for keyboard and screen reader users: hidden
// until it gets focus. The app uses #/ web addresses, so a plain "#main" link
// would change the page; this moves focus instead.
function SkipLink() {
  function skip(event) {
    event.preventDefault();
    const main = document.querySelector("main");
    if (!main) return;
    main.setAttribute("tabindex", "-1");
    main.focus();
    main.scrollIntoView();
  }
  return (
    <a className="skip-link" href="#main" onClick={skip}>
      Skip to the main content
    </a>
  );
}

// How often an open page checks for a newer version (and also whenever the
// tab comes back into view, like after waking the computer).
const UPDATE_CHECK_MS = 60 * 1000;
const UPDATE_LATER_KEY = "qk-update-later";

// "QuestKeeper was updated", a small card in the bottom corner when a newer
// version is live. It never reloads by itself (that could interrupt a roll or
// an unsent message) and doesn't move anything on the page: Refresh when
// you're ready, or Later to hide it until the next update.
function UpdateBanner() {
  const [newBuild, setNewBuild] = useState(null);
  const [laterFor, setLaterFor] = useState(() => {
    try {
      return window.sessionStorage.getItem(UPDATE_LATER_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let stopped = false;
    async function check() {
      const deployed = await fetchDeployedBuild();
      if (!stopped && isNewerBuild(CURRENT_BUILD, deployed)) setNewBuild(deployed);
    }
    const onVisible = () => document.visibilityState === "visible" && check();
    const first = setTimeout(check, 5000);
    const timer = setInterval(check, UPDATE_CHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  if (!newBuild || laterFor === newBuild) return null;

  function later() {
    setLaterFor(newBuild);
    try {
      window.sessionStorage.setItem(UPDATE_LATER_KEY, newBuild);
    } catch {
      // Storage blocked: it just stays hidden until the page is reloaded.
    }
  }

  return (
    <aside className="update-banner" role="status" aria-label="QuestKeeper update">
      <span className="update-banner__text">
        <span aria-hidden="true">✨</span> QuestKeeper has a fresh update. Refresh when you&apos;re ready.
      </span>
      <span className="update-banner__actions">
        <button type="button" className="update-banner__refresh" onClick={() => window.location.reload()}>
          Refresh
        </button>
        <button type="button" className="update-banner__later" onClick={later}>
          Later
        </button>
      </span>
    </aside>
  );
}

function App() {
  return (
    <>
      <PageTitle />
      <SkipLink />
      <UpdateBanner />
      <Header />
      {/* "← Back to your quiz results" and the like, when a link set one. */}
      <BackLink />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/races" element={<RacesPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/spells" element={<SpellsPage />} />
        <Route path="/backgrounds" element={<BackgroundsPage />} />
        <Route path="/feats" element={<FeatsPage />} />
        <Route path="/magic-items" element={<MagicItemsPage />} />
        <Route
          path="/characters"
          element={
            <ProtectedRoute>
              <CharactersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/characters/new"
          element={
            <ProtectedRoute>
              <CharacterCreationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/characters/:id"
          element={
            <ProtectedRoute>
              <CharacterSheetPage />
            </ProtectedRoute>
          }
        />
        {/* Adventurers join and play at tables under /games; DMs run them
            from /dm. Old /tables links still work: the list goes to My
            Games, and a table page moves itself to the right side. */}
        <Route
          path="/games"
          element={
            <ProtectedRoute>
              <TablesPage mode="player" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/:id"
          element={
            <ProtectedRoute>
              <TablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dm"
          element={
            <ProtectedRoute>
              <TablesPage mode="dm" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dm/tables/:id"
          element={
            <ProtectedRoute>
              <TablePage />
            </ProtectedRoute>
          }
        />
        <Route path="/tables" element={<Navigate to="/games" replace />} />
        <Route
          path="/tables/:id"
          element={
            <ProtectedRoute>
              <TablePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <LibraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/homebrew"
          element={
            <ProtectedRoute>
              <HomebrewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/homebrew/invite/:code"
          element={
            <ProtectedRoute>
              <HomebrewInvitePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/about" element={<About />} />
        <Route path="/attributions" element={<AttributionsPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/quiz" element={<QuizPage />} />
        {/* Read-only, made-up previews to look at before signing up. */}
        <Route path="/sample/character" element={<SampleCharacterPage />} />
        <Route path="/sample/table" element={<SampleTablePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
