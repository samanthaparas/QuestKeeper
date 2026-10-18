// The Appearance setting. "device" (the default) follows the phone's or
// computer's own light/dark setting; "light" and "dark" force one here.
// Saved on this device only.
//
// It works by putting data-theme="light" or "dark" on <html>; index.css then
// swaps the colour tokens. With "device" no attribute is set and the CSS
// follows prefers-color-scheme on its own.

const STORAGE_KEY = "qk-theme";

export const THEME_OPTIONS = ["device", "light", "dark"];

export function getThemePreference() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return THEME_OPTIONS.includes(saved) ? saved : "device";
  } catch {
    return "device"; // storage blocked (private window): use the default
  }
}

// Puts the saved choice on <html>. Called once when the app starts.
export function applyThemePreference(preference = getThemePreference()) {
  if (preference === "light" || preference === "dark") {
    document.documentElement.dataset.theme = preference;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

export function setThemePreference(preference) {
  const value = THEME_OPTIONS.includes(preference) ? preference : "device";
  try {
    if (value === "device") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Still applies for this visit even if it can't be saved.
  }
  applyThemePreference(value);
}
