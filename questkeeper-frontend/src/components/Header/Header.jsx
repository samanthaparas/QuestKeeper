import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { signOut } from "../../utils/auth";
import Navigation from "./Navigation/Navigation";
import logoIcon from "../../assets/brand/questkeeper-book-logo-64.png";
import "./Header.css";

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isLoading } = useAuth();

  function handleMenuClick() {
    setIsMenuOpen(!isMenuOpen);
  }

  return (
    <header className={`header ${isMenuOpen ? "header--menu-open" : ""}`}>
      <button
        className="header__menu"
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded={isMenuOpen}
        onClick={handleMenuClick}
      >
        Menu
      </button>

      <Link className="header__brand" to="/">
        <img className="header__icon" src={logoIcon} alt="QuestKeeper logo" />

        <div className="header__text">
          <span className="header__title">QuestKeeper</span>
          <span className="header__tagline">Where Heroes Find Answers</span>
        </div>
      </Link>

      <div className="header__actions">
        <Navigation />

        {!isLoading &&
          (user ? (
            <button
              className="header__profile"
              type="button"
              onClick={() => signOut()}
            >
              Log Out
            </button>
          ) : (
            <Link className="header__profile" to="/login">
              Log In
            </Link>
          ))}
      </div>
    </header>
  );
}

export default Header;
