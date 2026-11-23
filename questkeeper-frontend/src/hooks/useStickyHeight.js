import { useEffect } from "react";

// Tells the page how tall a part that stays on screen is (the turn banner at
// the top, the dice bar at the bottom), as a CSS variable on <html>, kept up
// to date as it grows or shrinks. The page's scroll padding uses these, so a
// control reached with the keyboard (or a "Jump to" link) never ends up
// hidden underneath them. Removed again when the part goes away.
//
// useStickyHeight(ref, "--qk-sticky-top")
export function useStickyHeight(ref, variable, enabled = true) {
  useEffect(() => {
    const element = ref.current;
    const root = document.documentElement;
    if (!enabled || !element) return undefined;
    const update = () => root.style.setProperty(variable, `${Math.ceil(element.getBoundingClientRect().height)}px`);
    update();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(element);
    return () => {
      observer?.disconnect();
      root.style.removeProperty(variable);
    };
  }, [ref, variable, enabled]);
}
