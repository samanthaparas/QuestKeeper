import { Link } from "react-router-dom";
import "./Navigation.css";

function Navigation() {
  return (
    <nav className="navigation">
      <Link className="navigation__link" to="/">
        Home
      </Link>

      <Link className="navigation__link" to="/races">
        Races
      </Link>

      <Link className="navigation__link" to="/classes">
        Classes
      </Link>

      <Link className="navigation__link" to="/backgrounds">
        Backgrounds
      </Link>

      <Link className="navigation__link" to="/spells">
        Spells
      </Link>

      <Link className="navigation__link" to="/about">
        About
      </Link>
    </nav>
  );
}

export default Navigation;
