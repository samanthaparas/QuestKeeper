// A copy of each character sheet kept on this device, so a weak or lost
// connection never costs anyone their changes:
//  - every edit is written here the moment it's made, marked "not saved yet"
//    until the server has it;
//  - if the sheet can't be loaded (no signal), the last copy opens instead;
//  - if the page is closed before a save went through, the changes are still
//    here next time.
// Only the few most recently used characters are kept, and the copies are
// cleared when someone signs out (this device may be shared).

const PREFIX = "qk-sheet-";
const INDEX_KEY = "qk-sheet-index";
const KEEP = 12;

function read(key) {
  try {
    const text = window.localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch {
    return null; // storage blocked, or the copy was damaged
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage full or blocked: the sheet just isn't backed up
  }
}

// { sheet, synced, baseUpdatedAt, cachedAt } or null.
// synced: the server has exactly this. baseUpdatedAt: the server's "last
// updated" time of the version these edits were made on.
export function readSheetCache(id) {
  const entry = read(`${PREFIX}${id}`);
  return entry?.sheet ? entry : null;
}

export function writeSheetCache(id, { sheet, synced, baseUpdatedAt = null }) {
  const stored = write(`${PREFIX}${id}`, { sheet, synced, baseUpdatedAt, cachedAt: new Date().toISOString() });
  if (!stored) return false;

  // Remember the most recently used, and drop the oldest copies beyond that.
  const index = [id, ...(read(INDEX_KEY) ?? []).filter((other) => other !== id)];
  index.slice(KEEP).forEach((old) => {
    try {
      window.localStorage.removeItem(`${PREFIX}${old}`);
    } catch {
      // Nothing to do.
    }
  });
  write(INDEX_KEY, index.slice(0, KEEP));
  return true;
}

export function clearSheetCache(id) {
  try {
    window.localStorage.removeItem(`${PREFIX}${id}`);
  } catch {
    // Nothing to do.
  }
}

// On sign-out: nobody else on this device should find the last person's sheets.
export function clearAllSheetCaches() {
  (read(INDEX_KEY) ?? []).forEach(clearSheetCache);
  try {
    window.localStorage.removeItem(INDEX_KEY);
  } catch {
    // Nothing to do.
  }
}
