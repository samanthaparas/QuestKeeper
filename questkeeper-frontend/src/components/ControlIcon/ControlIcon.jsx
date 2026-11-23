import { createElement } from "react";
import { controlIconShapes } from "./controlIconShapes";
import "./ControlIcon.css";

// Small copper pictures for buttons: the favourite heart (outline, or
// filled when on), Equip (a sword with a check), Wear (a shield with a
// check), Proficient (a training medal), Attune (a ring with a sparkle),
// Help, and an item's actions: Edit (a pencil), Split stack (one stack
// branching into two), Give (a gift box) and Delete (a bin). Fixed SVG
// drawings, so they look the same on every device (emoji change from one
// computer to the next).
//
// Artwork only: the button around it has the words, the pressed state and
// what happens on a tap. Screen readers skip the picture and it's never a
// tab stop.

function draw([tag, attributes, children], key) {
  return createElement(tag, { ...attributes, key }, ...children.map(draw));
}

function ControlIcon({ name, size = 20, filled = false, className = "" }) {
  const shapes = controlIconShapes[name];
  if (!shapes) return null;
  return (
    <svg
      className={`control-icon${className ? ` ${className}` : ""}`}
      data-icon={name}
      data-filled={filled ? "true" : undefined}
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
      // The heart is filled in when it's on.
      style={{ "--qk-icon-heart": filled ? "currentColor" : "none" }}
    >
      {shapes.map(draw)}
    </svg>
  );
}

export default ControlIcon;
