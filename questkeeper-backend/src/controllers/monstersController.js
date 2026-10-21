// The SRD monsters, for the DM's encounter helper. The list carries only what
// is needed to build a fight (name, challenge rating, XP, type, size, hit
// points); one monster's full stat block comes from its own request.
//
// 2014 SRD 5.1 only: the encounter XP maths the helper uses belongs to those
// rules. Like the spell list, it takes the D&D 5e API a moment to build and
// the SRD never changes, so it's saved for 6 hours.
const MONSTER_LIST_QUERY = `{
  monsters(limit: 1000) {
    index
    name
    challenge_rating
    xp
    type
    size
    hit_points
  }
}`;

async function loadMonsterList() {
  const response = await fetch("https://www.dnd5eapi.co/graphql/2014", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: MONSTER_LIST_QUERY }),
  });

  if (!response.ok) {
    const error = new Error("Unable to retrieve monsters.");
    error.statusCode = response.status;
    throw error;
  }

  const body = await response.json();
  const monsters = body?.data?.monsters;
  if (!Array.isArray(monsters) || monsters.length === 0) {
    throw new Error("Unable to retrieve monsters.");
  }

  return monsters
    .map((monster) => ({
      index: monster.index,
      name: monster.name,
      challengeRating: monster.challenge_rating,
      xp: monster.xp,
      type: monster.type,
      size: monster.size,
      hitPoints: monster.hit_points,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const MONSTER_LIST_TTL_MS = 6 * 60 * 60 * 1000;
let savedMonsterList = null; // { promise, expiresAt }

// From the saved copy while it's fresh. Saving the request itself means
// visitors arriving at the same moment share one fetch.
export function fetchMonsterList() {
  if (savedMonsterList && savedMonsterList.expiresAt > Date.now()) {
    return savedMonsterList.promise;
  }
  const promise = loadMonsterList().catch((error) => {
    // Don't keep a failure; the next visitor tries again.
    savedMonsterList = null;
    throw error;
  });
  savedMonsterList = { promise, expiresAt: Date.now() + MONSTER_LIST_TTL_MS };
  return promise;
}

export async function getMonsters(req, res, next) {
  try {
    res.status(200).json({ data: await fetchMonsterList() });
  } catch (error) {
    next(error);
  }
}

export async function getMonsterById(req, res, next) {
  try {
    const { monsterId } = req.params;
    const response = await fetch(
      `https://www.dnd5eapi.co/api/2014/monsters/${encodeURIComponent(monsterId)}`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve monster details.");
      error.statusCode = response.status;
      throw error;
    }

    res.status(200).json({ data: await response.json() });
  } catch (error) {
    next(error);
  }
}
