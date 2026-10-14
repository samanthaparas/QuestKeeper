import { Routes, Route, Link, Navigate } from "react-router-dom";
import Header from "./components/Header/Header";
import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import AttributionsPage from "./pages/AttributionsPage/AttributionsPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import RacesPage from "./pages/RacesPage";
import ClassesPage from "./pages/ClassesPage";
import SpellsPage from "./pages/SpellsPage";
import BackgroundsPage from "./pages/BackgroundsPage";
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
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

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

function App() {
  return (
    <>
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
        <Route path="/about" element={<About />} />
        <Route path="/attributions" element={<AttributionsPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
