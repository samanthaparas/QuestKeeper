// Moves keyboard focus to an element without the browser jumping the whole
// window. The character sheet scrolls inside its own areas (the middle pane
// on a wide screen, the whole right side on a short laptop window); plain
// focus() would scroll the window too and shift the sheet's frame. This
// scrolls only the nearest area that scrolls (and only if the element is
// out of view), or the page itself on a phone where nothing else scrolls.
//
// block: "start" puts the element at the top (a "Jump to" link);
// "nearest" only scrolls if it's hidden.
export function focusInPane(element, { block = "nearest" } = {}) {
  if (!element) return;
  const scroller = scrollingParent(element);
  if (scroller) {
    // Room left above it: its CSS scroll-margin-top (clear of the sheet's
    // sticky tab bar), or a little breathing space.
    const room = parseFloat(window.getComputedStyle(element).scrollMarginTop) || 8;
    const box = element.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    const hidden = box.top < view.top + room || box.bottom > view.bottom;
    if (block === "start" || hidden) scroller.scrollTop += box.top - view.top - room;
  } else if (block === "start" || !isOnScreen(element)) {
    element.scrollIntoView?.({ block: block === "start" ? "start" : "nearest" });
  }
  element.focus({ preventScroll: true });
}

// The nearest area around the element that scrolls up and down, or null
// when it's just the page.
function scrollingParent(element) {
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    const overflow = window.getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

function isOnScreen(element) {
  const box = element.getBoundingClientRect();
  return box.top >= 0 && box.bottom <= (window.innerHeight || document.documentElement.clientHeight);
}

// Back to the box of the roll waiting for real dice in the roll bar (after
// "Keep entering roll").
export function focusPendingRoll() {
  window.requestAnimationFrame(() => document.querySelector("form.real-dice input")?.focus());
}
