// What this file is for
// ---------------------
// This is the only place the backend talks to Open5e. It asks Open5e for the
// races, backgrounds and subclasses from the books QuestKeeper allows, and
// keeps a copy in memory for a few hours.
//
// Why keep a copy? Open5e is a free community service and is slower than the
// SRD API. Each character creation screen needs the same lists over and over,
// so remembering them makes QuestKeeper faster and avoids hammering Open5e.

import { OPEN5E_SOURCES } from "./open5eCuratedData.js";

const BASE_URL = "https://api.open5e.com/v2";

// How long a saved copy stays fresh: 6 hours, written in milliseconds.
// This content comes from published books, so it almost never changes.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Give up on a slow Open5e request after 10 seconds, so a QuestKeeper page
// never hangs forever waiting on someone else's server.
const REQUEST_TIMEOUT_MS = 10_000;

// The saved copies, one per kind of content ("species", "backgrounds",
// "classes"). Each holds the pending or finished request and when it expires.
const cache = new Map();

// True when an ID belongs to Open5e rather than the SRD. Open5e IDs start
// with their book's ID and an underscore ("toh_catfolk"), and SRD IDs never
// contain underscores ("half-elf"). Child entries such as a race's trait use
// "parent.child", so only the part before the first dot is checked.
export function isOpen5eId(id) {
  const [parentKey] = String(id ?? "").split(".");
  return Object.keys(OPEN5E_SOURCES).some((sourceKey) =>
    parentKey.startsWith(`${sourceKey}_`),
  );
}

// Open5e splits long lists into pages, each pointing to the next one. This
// follows those links until every page has been collected.
async function fetchAllPages(firstUrl) {
  const results = [];
  let url = firstUrl;

  while (url) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const error = new Error("Unable to retrieve content from Open5e.");
      // 502 means "a server we depend on failed", which is the honest answer
      // here; the problem is Open5e's, not the player's request.
      error.statusCode = 502;
      throw error;
    }

    const page = await response.json();
    results.push(...(page.results ?? []));
    url = page.next;
  }

  return results;
}

// Gets every entry of one kind ("species", "backgrounds" or "classes") from
// the allowed books, using the saved copy when it is still fresh.
export function fetchOpen5eResource(resource) {
  const saved = cache.get(resource);
  if (saved && saved.expiresAt > Date.now()) return saved.promise;

  const sources = Object.keys(OPEN5E_SOURCES).join(",");
  const url = `${BASE_URL}/${resource}/?document__key__in=${sources}&limit=200`;

  const promise = fetchAllPages(url).catch((error) => {
    // Don't keep a failed request around, or every visitor for the next six
    // hours would get the same error. The next request tries again.
    cache.delete(resource);
    throw error;
  });

  // Saving the request itself (not just its answer) means that if several
  // people open a page at the same moment, Open5e is only asked once.
  cache.set(resource, { promise, expiresAt: Date.now() + CACHE_TTL_MS });
  return promise;
}

// Lists need to keep working even when Open5e is down: in that case players
// still see the SRD options, and the error is written to the server log
// instead of breaking the page.
export async function fetchOpen5eOrEmpty(resource) {
  try {
    return await fetchOpen5eResource(resource);
  } catch (error) {
    console.warn(`Open5e ${resource} unavailable:`, error.message);
    return [];
  }
}

// The error to send when an Open5e ID doesn't match anything QuestKeeper
// offers (for example, an option that was left out on purpose).
export function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

// Used by tests to start each one with an empty memory.
export function clearOpen5eCache() {
  cache.clear();
}
