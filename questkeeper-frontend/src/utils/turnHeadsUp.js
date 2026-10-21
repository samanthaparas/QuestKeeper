// The Turn heads-up setting (see components/TurnHeadsUp): on unless this
// device turned it off in Settings. Saved on this device only.

const STORAGE_KEY = "qk-turn-heads-up";

export function getHeadsUpPreference() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true; // storage blocked (private window): use the default
  }
}

export function setHeadsUpPreference(enabled) {
  try {
    if (enabled) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, "off");
  } catch {
    // Still applies for this visit even if it can't be saved.
  }
}
