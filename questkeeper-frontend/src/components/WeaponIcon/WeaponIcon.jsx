import { createElement } from "react";
import { weaponIconShapes } from "./weaponIconShapes";
import { FALLBACK_ICON_ID } from "../../utils/weaponIcons";
import "./WeaponIcon.css";

// A small copper picture of a weapon, drawn beside its name so it's quick
// to spot (a longbow, a dagger, a wolf's bite). iconId comes from
// utils/weaponIcons.js, which works out what the weapon is.
//
// It's decoration: the weapon's name is always written right next to it,
// so screen readers skip it and it's never a tab stop. Its colours follow
// the light and dark themes (see WeaponIcon.css).

function draw([tag, attributes, children], key) {
  return createElement(tag, { ...attributes, key }, ...children.map(draw));
}

function WeaponIcon({ iconId, size = 26, className = "" }) {
  const shapes = weaponIconShapes[iconId] ?? weaponIconShapes[FALLBACK_ICON_ID];
  return (
    <svg
      className={`weapon-icon${className ? ` ${className}` : ""}`}
      data-icon={weaponIconShapes[iconId] ? iconId : FALLBACK_ICON_ID}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shapes.map(draw)}
    </svg>
  );
}

export default WeaponIcon;
