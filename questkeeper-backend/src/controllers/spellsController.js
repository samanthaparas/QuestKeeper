// The REST list only gives each spell's name and level. One GraphQL request
// also brings school and classes for every spell, which the Spells page
// filters need, without fetching 319 detail pages.
const SPELL_LIST_QUERY = `{
  spells(limit: 1000) {
    index
    name
    level
    school { index name }
    classes { index name }
    concentration
    ritual
  }
}`;

async function fetchSpellListWithFilters() {
  const response = await fetch("https://www.dnd5eapi.co/graphql/2014", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: SPELL_LIST_QUERY }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL spell list failed: ${response.status}`);
  }

  const body = await response.json();
  const spells = body?.data?.spells;

  if (!Array.isArray(spells) || spells.length === 0) {
    throw new Error("GraphQL spell list came back empty.");
  }

  return spells
    .map((spell) => ({
      ...spell,
      url: `/api/2014/spells/${spell.index}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchBasicSpellList() {
  const response = await fetch("https://www.dnd5eapi.co/api/2014/spells");

  if (!response.ok) {
    const error = new Error("Unable to retrieve spells.");
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  return data.results;
}

// The spell list takes the D&D 5e API about ten seconds to build, and the
// SRD spells don't change, so it's saved for 6 hours (like the Open5e lists).
const SPELL_LIST_TTL_MS = 6 * 60 * 60 * 1000;
let savedSpellList = null; // { promise, expiresAt }

async function loadSpellList() {
  try {
    return await fetchSpellListWithFilters();
  } catch (graphqlError) {
    // Fall back to the plain list so the page still works, just with
    // fewer filters (level only).
    console.warn(graphqlError.message);
    return fetchBasicSpellList();
  }
}

// The spell list, from the saved copy while it's fresh. Saving the request
// itself means visitors arriving at the same moment share one fetch.
export function fetchSpellList() {
  if (savedSpellList && savedSpellList.expiresAt > Date.now()) {
    return savedSpellList.promise;
  }
  const promise = loadSpellList().catch((error) => {
    // Don't keep a failure; the next visitor tries again.
    savedSpellList = null;
    throw error;
  });
  savedSpellList = { promise, expiresAt: Date.now() + SPELL_LIST_TTL_MS };
  return promise;
}

export async function getSpells(req, res, next) {
  try {
    const spells = await fetchSpellList();

    res.status(200).json({
      data: spells,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSpellById(req, res, next) {
  try {
    const { spellId } = req.params;

    const response = await fetch(
      `https://www.dnd5eapi.co/api/2014/spells/${spellId}`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve spell details.");
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();

    res.status(200).json({
      data: data,
    });
  } catch (error) {
    next(error);
  }
}
