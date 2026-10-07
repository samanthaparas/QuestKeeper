import { useSyncExternalStore } from "react";

// True while a CSS media query matches, e.g. "(max-width: 1023px)", and
// updates when it stops or starts matching. False where matchMedia isn't
// available (the test environment).
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener?.("change", onChange);
      return () => list?.removeEventListener?.("change", onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
  );
}
