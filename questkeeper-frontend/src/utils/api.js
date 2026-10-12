import { loadHomebrew } from "./homebrewCache";
import {
  isBookEntryId,
  findBookBackground,
  listBookBackgrounds,
} from "./bookBackgrounds";
import { findBookRace, listBookRaces } from "./bookRaces";
import {
  findBookClass,
  findBookSubclass,
  getBookSubclassRefs,
  listBookClasses,
} from "./bookSubclasses";
import {
  isHomebrewId,
  findHomebrew,
  findHomebrewTrait,
  findHomebrewFeature,
  listHomebrew,
  getHomebrewSubraceRefs,
  getHomebrewSubclassRefs,
} from "./homebrewMappers";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"
).replace(/\/$/, "");

function checkResponse(res) {
  if (res.ok) {
    return res.json();
  }

  return Promise.reject(`Error: ${res.status}`);
}

function requestJson(path, errorMessage) {
  return fetch(`${API_BASE_URL}${path}`)
    .then(checkResponse)
    .then((response) => response.data)
    .catch((err) => {
      console.error(errorMessage, err);
      throw err;
    });
}

function editionQuery(edition) {
  return edition ? `?edition=${encodeURIComponent(edition)}` : "";
}

// --- Homebrew ---------------------------------------------------------------
// Homebrew IDs ("hb_...") are answered from the player's own homebrew; every
// other ID goes to the backend as before. Lists get homebrew mixed in, so
// pages and pickers don't need to know the difference.

function byName(a, b) {
  return a.name.localeCompare(b.name);
}

// SRD/Open5e list + homebrew items, alphabetically.
async function withHomebrewItems(listPromise, pickItems) {
  const [list, entries] = await Promise.all([listPromise, loadHomebrew()]);
  const extra = pickItems(entries);
  return extra.length > 0 ? [...list, ...extra].sort(byName) : list;
}

async function findInHomebrew(index, find) {
  const found = find(await loadHomebrew(), index);
  if (!found) throw new Error(`Homebrew ${index} not found`);
  return found;
}

// SRD, Open5e, homebrew and published-book races (names, summaries, links).
export function getRaces() {
  return withHomebrewItems(
    requestJson("/races", "Failed to fetch races:"),
    (entries) => [...listHomebrew(entries, "race"), ...listBookRaces()],
  );
}

export async function getRaceDetails(raceId) {
  if (isBookEntryId(raceId)) {
    const entry = findBookRace(raceId);
    if (!entry) throw new Error(`Book race ${raceId} not found`);
    return entry;
  }
  if (isHomebrewId(raceId)) return findInHomebrew(raceId, findHomebrew);

  // SRD/Open5e races also list any homebrew subraces made for them.
  const [race, entries] = await Promise.all([
    requestJson(
      `/races/${encodeURIComponent(raceId)}`,
      `Failed to fetch race details for ID ${raceId}:`,
    ),
    loadHomebrew(),
  ]);
  const extra = getHomebrewSubraceRefs(entries, raceId);
  return extra.length > 0
    ? { ...race, subraces: [...(race.subraces ?? []), ...extra] }
    : race;
}

// The 12 SRD classes plus the book classes (Artificer, Blood Hunter), which
// have a summary and a link only.
export async function getClasses() {
  const classes = await requestJson("/classes", "Failed to fetch classes:");
  // The backend doesn't label classes; they're all SRD 5.1.
  const srd = classes.map((item) => ({ ...item, source: item.source ?? "SRD 5.1" }));
  return [...srd, ...listBookClasses()].sort(byName);
}

// SRD classes list their SRD, Open5e, homebrew and book subclasses.
export async function getClassDetails(classId) {
  if (isBookEntryId(classId)) {
    const entry = findBookClass(classId);
    if (!entry) throw new Error(`Book class ${classId} not found`);
    return entry;
  }
  const [data, entries] = await Promise.all([
    requestJson(
      `/classes/${encodeURIComponent(classId)}`,
      `Failed to fetch class details for ID ${classId}:`,
    ),
    loadHomebrew(),
  ]);
  const extra = [
    ...getHomebrewSubclassRefs(entries, classId),
    ...getBookSubclassRefs(classId),
  ];
  return extra.length > 0
    ? { ...data, subclasses: [...(data.subclasses ?? []), ...extra] }
    : data;
}

// Homebrew and published-book backgrounds follow the 2014 rules, so they
// join that list only. Book entries are names, summaries and links (see
// bookBackgrounds.js); they're the same for everyone, logged in or not.
export function getBackgrounds(edition) {
  return withHomebrewItems(
    requestJson(`/backgrounds${editionQuery(edition)}`, "Failed to fetch backgrounds:"),
    (entries) =>
      edition === "2024"
        ? []
        : [
            ...listHomebrew(entries, "background").map((item) => ({
              ...item,
              edition: "2014",
            })),
            ...listBookBackgrounds(),
          ],
  );
}

export function getBackgroundDetails(backgroundId, edition) {
  if (isBookEntryId(backgroundId)) {
    const entry = findBookBackground(backgroundId);
    return entry
      ? Promise.resolve(entry)
      : Promise.reject(new Error(`Book background ${backgroundId} not found`));
  }
  if (isHomebrewId(backgroundId)) {
    return findInHomebrew(backgroundId, findHomebrew);
  }
  return requestJson(
    `/backgrounds/${encodeURIComponent(backgroundId)}${editionQuery(edition)}`,
    `Failed to fetch background details for ID ${backgroundId}:`,
  );
}

export function getSpells() {
  return requestJson("/spells", "Failed to fetch spells:");
}

export function getSpellDetails(spellId) {
  return requestJson(
    `/spells/${encodeURIComponent(spellId)}`,
    `Failed to fetch spell details for ID ${spellId}:`,
  );
}

export function getFeats(edition) {
  return requestJson(
    `/feats${editionQuery(edition)}`,
    "Failed to fetch feats:",
  );
}

export function getFeatDetails(featId, edition) {
  return requestJson(
    `/feats/${encodeURIComponent(featId)}${editionQuery(edition)}`,
    `Failed to fetch feat details for ID ${featId}:`,
  );
}

export function getClassSpells(classId) {
  return requestJson(
    `/classes/${encodeURIComponent(classId)}/spells`,
    `Failed to fetch spell list for class ${classId}:`,
  );
}

export function getClassLevel(classId, level) {
  // Book classes have no rules in QuestKeeper.
  if (isBookEntryId(classId)) return Promise.reject(new Error("No levels for book classes"));
  return requestJson(
    `/classes/${encodeURIComponent(classId)}/levels/${encodeURIComponent(level)}`,
    `Failed to fetch level ${level} details for class ${classId}:`,
  );
}

export function getSubraceDetails(subraceId) {
  if (isHomebrewId(subraceId)) return findInHomebrew(subraceId, findHomebrew);
  return requestJson(
    `/subraces/${encodeURIComponent(subraceId)}`,
    `Failed to fetch subrace details for ID ${subraceId}:`,
  );
}

export function getSubclassDetails(subclassId) {
  if (isBookEntryId(subclassId)) {
    const entry = findBookSubclass(subclassId);
    return entry
      ? Promise.resolve(entry)
      : Promise.reject(new Error(`Book subclass ${subclassId} not found`));
  }
  if (isHomebrewId(subclassId)) {
    return findInHomebrew(subclassId, findHomebrew);
  }
  return requestJson(
    `/subclasses/${encodeURIComponent(subclassId)}`,
    `Failed to fetch subclass details for ID ${subclassId}:`,
  );
}

export function getTraitDetails(traitId) {
  if (isHomebrewId(traitId)) return findInHomebrew(traitId, findHomebrewTrait);
  return requestJson(
    `/traits/${encodeURIComponent(traitId)}`,
    `Failed to fetch trait details for ID ${traitId}:`,
  );
}

export function getWeapons() {
  return requestJson("/weapons", "Failed to fetch weapons:");
}

export function getWeaponDetails(weaponId) {
  return requestJson(
    `/weapons/${encodeURIComponent(weaponId)}`,
    `Failed to fetch weapon details for ID ${weaponId}:`,
  );
}

export function getEquipment(edition) {
  return requestJson(
    `/equipment${editionQuery(edition)}`,
    "Failed to fetch equipment:",
  );
}

export function getEquipmentDetails(equipmentId, edition) {
  return requestJson(
    `/equipment/${encodeURIComponent(equipmentId)}${editionQuery(edition)}`,
    `Failed to fetch equipment details for ID ${equipmentId}:`,
  );
}

// The items in one equipment category, e.g. every martial weapon, for
// starting-gear choices like "any martial weapon".
export function getEquipmentCategory(categoryId) {
  return requestJson(
    `/equipment/categories/${encodeURIComponent(categoryId)}`,
    `Failed to fetch equipment category ${categoryId}:`,
  );
}

export function getMagicItems(edition) {
  return requestJson(
    `/magic-items${editionQuery(edition)}`,
    "Failed to fetch magic items:",
  );
}

export function getMagicItemDetails(magicItemId, edition) {
  return requestJson(
    `/magic-items/${encodeURIComponent(magicItemId)}${editionQuery(edition)}`,
    `Failed to fetch magic item details for ID ${magicItemId}:`,
  );
}

export function getClassFeatures(classId) {
  if (isBookEntryId(classId)) return Promise.resolve([]);
  return requestJson(
    `/classes/${encodeURIComponent(classId)}/features`,
    `Failed to fetch features for class ${classId}:`,
  );
}

export async function getSubclassFeatures(subclassId) {
  // Book subclasses have no features in QuestKeeper.
  if (isBookEntryId(subclassId)) return [];
  if (isHomebrewId(subclassId)) {
    const subclass = await findInHomebrew(subclassId, findHomebrew);
    return subclass.features.map(({ index, name, level }) => ({ index, name, level }));
  }
  return requestJson(
    `/subclasses/${encodeURIComponent(subclassId)}/features`,
    `Failed to fetch features for subclass ${subclassId}:`,
  );
}

export async function getRaceTraits(raceId) {
  // Book races have no rules in QuestKeeper, so no traits to list.
  if (isBookEntryId(raceId)) return [];
  if (isHomebrewId(raceId)) {
    return (await findInHomebrew(raceId, findHomebrew)).traits;
  }
  return requestJson(
    `/races/${encodeURIComponent(raceId)}/traits`,
    `Failed to fetch traits for race ${raceId}:`,
  );
}

export async function getSubraceTraits(subraceId) {
  if (isHomebrewId(subraceId)) {
    return (await findInHomebrew(subraceId, findHomebrew)).racial_traits;
  }
  return requestJson(
    `/subraces/${encodeURIComponent(subraceId)}/traits`,
    `Failed to fetch traits for subrace ${subraceId}:`,
  );
}

export function getFeatureDetails(featureId) {
  if (isHomebrewId(featureId)) {
    return findInHomebrew(featureId, findHomebrewFeature);
  }
  return requestJson(
    `/features/${encodeURIComponent(featureId)}`,
    `Failed to fetch feature details for ID ${featureId}:`,
  );
}
