// The "Beginner tips" switch in Settings: on unless this device turned it
// off. When off, the extra explanations for new players step aside:
// - "What does this mean?" on a roll
// - "New to dice?" on the character sheet
// - "How a fight works" on the Combat tab
// - the Tips cards in character creation
// - the one-line tip on a player's game page
// Rules words still explain themselves on hover, and the Guide is always
// there. Saved on this device only, like the other display settings.

const STORAGE_KEY = "qk-beginner-tips";

export function getBeginnerTips() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true; // storage blocked (private window): show them
  }
}

export function setBeginnerTips(enabled) {
  try {
    if (enabled) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, "off");
  } catch {
    // Can't be saved: it applies until the page is reloaded.
  }
}
