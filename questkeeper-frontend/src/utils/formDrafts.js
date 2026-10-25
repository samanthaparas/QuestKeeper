// Unsaved writing kept on this device, so a Back press, a reload or a phone
// closing the tab doesn't lose it (the homebrew editor and the session
// recap use this). Each draft is cleared when it's saved or cancelled, and
// an abandoned one stops being offered after a month.

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function saveFormDraft(key, value, now = Date.now()) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: now, value }));
  } catch {
    // Storage full or blocked: the form still works, it just isn't kept.
  }
}

// The saved value, or null if there isn't a usable one.
export function loadFormDraft(key, now = Date.now()) {
  try {
    const draft = JSON.parse(window.localStorage.getItem(key));
    if (!draft || !(now - draft.savedAt < MAX_AGE_MS)) return null;
    return draft.value ?? null;
  } catch {
    return null;
  }
}

export function clearFormDraft(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}
