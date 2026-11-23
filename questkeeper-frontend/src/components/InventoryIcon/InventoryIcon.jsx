import { createElement } from "react";
import { inventoryIconShapes } from "./inventoryIconShapes";
import "./InventoryIcon.css";

// A small copper picture beside an inventory category heading ("Weapons",
// "Worn items") or the Show filter. name comes from utils/inventoryIcons.js.
//
// It's decoration: its words are always right next to it, so screen readers
// skip it and it's never a tab stop. Colours follow the theme, matching the
// weapon icons (see InventoryIcon.css).

function draw([tag, attributes, children], key) {
  return createElement(tag, { ...attributes, key }, ...children.map(draw));
}

function InventoryIcon({ name, size = 20, className = "" }) {
  const id = inventoryIconShapes[name] ? name : "gear";
  return (
    <svg
      className={`inventory-icon${className ? ` ${className}` : ""}`}
      data-icon={id}
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
      {inventoryIconShapes[id].map(draw)}
    </svg>
  );
}

export default InventoryIcon;
