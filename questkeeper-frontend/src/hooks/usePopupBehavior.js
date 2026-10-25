import { useEffect, useRef } from "react";

// Steps back that a closing pop-up asked for and the browser hasn't carried
// out yet. The browser does them a moment later, so a pop-up reopened in
// that moment must not mistake one for the person pressing Back.
let pendingCleanupBacks = 0;

// What every pop-up does while it's open, so they behave like phones expect:
//
// - The page behind stays still, so a swipe scrolls the pop-up, not the page.
// - The phone's Back button (or back swipe) closes the pop-up instead of
//   leaving the page and losing whatever was on it. Opening adds a history
//   entry for the pop-up; Back steps off it. Closing it any other way (✕,
//   Esc, a tap outside) removes that entry again, unless a link inside the
//   pop-up has already moved on to another page.
export function usePopupBehavior(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const history = window.history;
    const token = `popup-${Date.now()}-${Math.random()}`;
    const canUseHistory = typeof history?.pushState === "function";
    function addEntry() {
      const entry = { ...history.state, qkPopup: token };
      // Reopening straight away (React does this in development) replaces
      // the entry instead of stacking a second one.
      if (history.state?.qkPopup) history.replaceState(entry, "");
      else history.pushState(entry, "");
    }
    if (canUseHistory) addEntry();

    let closedByBack = false;
    function handleBack() {
      if (pendingCleanupBacks > 0) {
        // Our own tidy-up from a pop-up that just closed, not a Back press.
        if (history.state?.qkPopup !== token) addEntry();
        return;
      }
      if (history.state?.qkPopup !== token) {
        closedByBack = true;
        onCloseRef.current?.();
      }
    }
    window.addEventListener("popstate", handleBack);

    return () => {
      root.style.overflow = previousOverflow;
      window.removeEventListener("popstate", handleBack);
      // Closed some other way: step back off the pop-up's entry, but only
      // if it's still the current one (a link may have changed page).
      if (canUseHistory && !closedByBack && history.state?.qkPopup === token) {
        pendingCleanupBacks += 1;
        // Count it off once the browser has done it (a tick later, so a
        // pop-up reopened meanwhile still recognises it in its own handler).
        window.addEventListener("popstate", function done() {
          window.removeEventListener("popstate", done);
          setTimeout(() => {
            pendingCleanupBacks = Math.max(0, pendingCleanupBacks - 1);
          }, 0);
        });
        history.back();
      }
    };
  }, [isOpen]);
}
