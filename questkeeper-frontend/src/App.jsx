import { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "./components/Header/Header";
import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import AttributionsPage from "./pages/AttributionsPage/AttributionsPage";
import PrivacyPage from "./pages/PrivacyPage/PrivacyPage";
import TermsPage from "./pages/TermsPage/TermsPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import RacesPage from "./pages/RacesPage";
import ClassesPage from "./pages/ClassesPage";
import SpellsPage from "./pages/SpellsPage";
import BackgroundsPage from "./pages/BackgroundsPage";
import FeatsPage from "./pages/FeatsPage";
import MagicItemsPage from "./pages/MagicItemsPage/MagicItemsPage";
import BackLink from "./components/BackLink/BackLink";
import ScrollManager from "./components/ScrollManager/ScrollManager";
import AuthPage from "./pages/AuthPage/AuthPage";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import { getPageTitle } from "./utils/pageTitle";
import { CURRENT_BUILD, fetchDeployedBuild, isNewerBuild } from "./utils/api";
import { refreshIfSafe } from "./utils/autoRefresh";

// The big, signed-in and rarely-first-visited pages load only when someone
// opens them, so the first visit to the site downloads much less (the sheet
// and the DM's table tools are most of the code).
const CharacterCreationPage = lazy(() => import("./pages/CharacterCreationPage/CharacterCreationPage"));
const CharactersPage = lazy(() => import("./pages/CharactersPage/CharactersPage"));
const CharacterSheetPage = lazy(() => import("./pages/CharacterSheetPage/CharacterSheetPage"));
const CharacterPrintPage = lazy(() => import("./pages/CharacterPrintPage/CharacterPrintPage"));
const TablesPage = lazy(() => import("./pages/TablesPage/TablesPage"));
const TablePage = lazy(() => import("./pages/TablePage/TablePage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage/LibraryPage"));
const HomebrewPage = lazy(() => import("./pages/HomebrewPage/HomebrewPage"));
const HomebrewInvitePage = lazy(() => import("./pages/HomebrewInvitePage/HomebrewInvitePage"));
const Guide = lazy(() => import("./pages/Guide/Guide"));
const QuizPage = lazy(() => import("./pages/QuizPage/QuizPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage/SettingsPage"));
const SampleCharacterPage = lazy(() => import("./pages/Samples/SampleCharacterPage"));
const SampleTablePage = lazy(() => import("./pages/Samples/SampleTablePage"));

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
// version is live. The page also refreshes by itself at the next safe moment:
// when the person switches to another tab or app, or moves to another page,
// as long as nothing would be lost or interrupted (see utils/autoRefresh.js).
// Refresh does it now; Later hides the card (the quiet refresh still happens).
function UpdateBanner() {
  const { pathname } = useLocation();
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

  // A newer version is waiting: refresh when they look away (another tab or
  // app) or click somewhere outside the page.
  useEffect(() => {
    if (!newBuild) return undefined;
    const onHidden = () => document.visibilityState === "hidden" && refreshIfSafe(newBuild);
    const onBlur = () => refreshIfSafe(newBuild);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", onBlur);
    };
  }, [newBuild]);

  // ...or when they move to another page in QuestKeeper.
  useEffect(() => {
    if (newBuild) refreshIfSafe(newBuild);
    // Only a change of page should trigger this, not the update arriving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!newBuild || laterFor === newBuild) return null;

  function later() {
    setLaterFor(newBuild);
    try {
      window.sessionStorage.setItem(UPDATE_LATER_KEY, newBuild);
    } catch {
      // Storage blocked: it just stays hidden until the page is reloaded.
    }
  }

  // A small "✨ Update" badge in the bottom-left corner: it sparkles once when
  // it appears, then dims so it doesn't nag. Tap it to refresh now; × hides it
  // (the quiet refresh still happens). The full sentence is for screen readers
  // and the hover tooltip.
  const explanation =
    "QuestKeeper has a fresh update. It refreshes by itself when you switch tabs or pages, or tap to refresh now.";
  return (
    <aside className="update-badge" role="status" aria-label="QuestKeeper update">
      <span className="update-badge__sr">{explanation}</span>
      <button
        type="button"
        className="update-badge__refresh"
        onClick={() => window.location.reload()}
        title={explanation}
        aria-label="Refresh to get the QuestKeeper update"
      >
        <span className="update-badge__spark" aria-hidden="true">✨</span>
        Update
      </button>
      <button type="button" className="update-badge__hide" onClick={later} aria-label="Hide the update notice">
        ×
      </button>
    </aside>
  );
}

// What shows for a moment while a page's code is on its way.
function RouteLoading() {
  return (
    <main className="route-loading" role="status" aria-live="polite">
      <p>Loading…</p>
    </main>
  );
}

function App() {
  return (
    <>
      <PageTitle />
      {/* New pages open at the top; Back returns to where you were. */}
      <ScrollManager />
      <SkipLink />
      <UpdateBanner />
      <Header />
      {/* "← Back to your quiz results" and the like, when a link set one. */}
      <BackLink />

      <Suspense fallback={<RouteLoading />}>
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
          path="/characters/:id/print"
          element={
            <ProtectedRoute>
              <CharacterPrintPage />
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
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/quiz" element={<QuizPage />} />
        {/* Read-only, made-up previews to look at before signing up. */}
        <Route path="/sample/character" element={<SampleCharacterPage />} />
        <Route path="/sample/table" element={<SampleTablePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </>
  );
}

export default App;
