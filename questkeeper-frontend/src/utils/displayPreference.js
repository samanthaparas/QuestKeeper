// Text size and contrast, from Settings. Saved on this device only, like
// Appearance and Reduce motion, and put on <html> as data-text-size and
// data-contrast; index.css does the rest.
//
// Text size scales the whole page (like the browser's own zoom, which the
// layouts are already checked at), so buttons and boxes grow with the words.
// High contrast makes quiet grey text and borders darker in light mode and
// lighter in dark mode.

const SIZE_KEY = "qk-text-size";
const CONTRAST_KEY = "qk-contrast";

export const TEXT_SIZES = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Larger" },
  { value: "larger", label: "Largest" },
];

function read(key, allowed, fallback) {
  try {
    const saved = window.localStorage.getItem(key);
    return allowed.includes(saved) ? saved : fallback;
  } catch {
    return fallback; // storage blocked (private window): use the default
  }
}

function write(key, value, fallback) {
  try {
    if (value === fallback) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Still applies for this visit even if it can't be saved.
  }
}

const SIZE_VALUES = TEXT_SIZES.map((size) => size.value);

export function getTextSize() {
  return read(SIZE_KEY, SIZE_VALUES, "normal");
}

export function getHighContrast() {
  return read(CONTRAST_KEY, ["high"], "normal") === "high";
}

// Puts the saved choices on <html>. Called once when the app starts.
export function applyDisplayPreferences(size = getTextSize(), highContrast = getHighContrast()) {
  const root = document.documentElement;
  if (size === "normal") delete root.dataset.textSize;
  else root.dataset.textSize = size;
  if (highContrast) root.dataset.contrast = "high";
  else delete root.dataset.contrast;
}

export function setTextSize(size) {
  const value = SIZE_VALUES.includes(size) ? size : "normal";
  write(SIZE_KEY, value, "normal");
  applyDisplayPreferences(value, getHighContrast());
}

export function setHighContrast(on) {
  write(CONTRAST_KEY, on ? "high" : "normal", "normal");
  applyDisplayPreferences(getTextSize(), Boolean(on));
}
