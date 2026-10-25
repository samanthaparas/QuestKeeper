// The character being made, kept on this device as you go, so a Back
// press, a reload or a phone closing the tab doesn't throw it away.
// It's cleared when the character is created, when you cancel, or when you
// choose Start fresh.

const DRAFT_KEY = "qk-character-draft";
// An abandoned draft stops being offered after a month.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Whether there's anything worth keeping (not just an empty first step).
export function hasCreationProgress(fields) {
  return Boolean(
    fields?.name?.trim() ||
      fields?.race ||
      fields?.characterClass ||
      fields?.background,
  );
}

export function saveCreationDraft(fields, now = Date.now()) {
  try {
    if (!hasCreationProgress(fields)) {
      window.localStorage.removeItem(DRAFT_KEY);
      return;
    }
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ savedAt: now, fields }),
    );
  } catch {
    // Storage full or blocked: creation still works, it just isn't kept.
  }
}

// { savedAt, fields } or null when there's no usable draft.
export function loadCreationDraft(now = Date.now()) {
  try {
    const draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY));
    if (!draft || typeof draft.fields !== "object" || !draft.fields) {
      return null;
    }
    if (!(now - draft.savedAt < MAX_AGE_MS)) return null;
    return hasCreationProgress(draft.fields) ? draft : null;
  } catch {
    return null;
  }
}

export function clearCreationDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}
