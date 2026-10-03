import { Routes, Route, Link } from "react-router-dom";
import Header from "./components/Header/Header";
import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import SearchPage from "./pages/SearchPage/SearchPage";
import RacesPage from "./pages/RacesPage";
import ClassesPage from "./pages/ClassesPage";
import SpellsPage from "./pages/SpellsPage";
import BackgroundsPage from "./pages/BackgroundsPage";
import CharacterCreationPage from "./pages/CharacterCreationPage/CharacterCreationPage";
import CharactersPage from "./pages/CharactersPage/CharactersPage";
import CharacterSheetPage from "./pages/CharacterSheetPage/CharacterSheetPage";
import TablesPage from "./pages/TablesPage/TablesPage";
import TablePage from "./pages/TablePage/TablePage";
import LibraryPage from "./pages/LibraryPage/LibraryPage";
import Guide from "./pages/Guide/Guide";
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

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/races" element={<RacesPage />} />
        <Route path="/classes" element={<ClassesPage />} />
        <Route path="/spells" element={<SpellsPage />} />
        <Route path="/backgrounds" element={<BackgroundsPage />} />
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
        <Route
          path="/tables"
          element={
            <ProtectedRoute>
              <TablesPage />
            </ProtectedRoute>
          }
        />
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
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
