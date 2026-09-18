import { NavLink } from "react-router-dom";
import "./Navigation.css";

function linkClass({ isActive }) {
  return `navigation__link${isActive ? " navigation__link--active" : ""}`;
}

function Navigation() {
  return (
    <nav className="navigation">
      <NavLink className={linkClass} to="/" end>
        Home
      </NavLink>

      <NavLink className={linkClass} to="/races">
        Races
      </NavLink>

      <NavLink className={linkClass} to="/classes">
        Classes
      </NavLink>

      <NavLink className={linkClass} to="/backgrounds">
        Backgrounds
      </NavLink>

      <NavLink className={linkClass} to="/spells">
        Spells
      </NavLink>

      <NavLink className={linkClass} to="/characters">
        Characters
      </NavLink>

      <NavLink className={linkClass} to="/about">
        About
      </NavLink>
    </nav>
  );
}

export default Navigation;
