import { loadHomebrew } from "./homebrewCache";
import {
  isBookEntryId,
  findBookBackground,
  listBookBackgrounds,
} from "./bookBackgrounds";
import { findBookRace, listBookRaces } from "./bookRaces";
import { findBookFeat, listBookFeats } from "./bookFeats";
import {
  findBookClass,
  findBookSubclass,
  getBookSubclassRefs,
  listBookClasses,
} from "./bookSubclasses";
import {
  HOMEBREW_SOURCE,
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

// Search by meaning: the backend asks Claude which spells, items, classes,
// races and backgrounds match what the player typed. Always resolves:
// { results: [{ id, name, category, why }], message? }, with a message the
// search can show when something went wrong.
export async function searchByMeaning(query) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { results: [], message: body.message ?? "AI search didn't work. Try again in a moment." };
    }
    return { results: Array.isArray(body.results) ? body.results : [], message: body.message };
  } catch {
    return { results: [], message: "Couldn't reach the server. Check your connection and try again." };
  }
}

// "Summarize for my group": Claude writes a short own-words summary of rules
// the player pasted. Like searchByMeaning, it never throws: failures come back
// as a message the form can show.
export async function summarizeForGroup({ category, name, text }) {
  try {
    const response = await fetch(`${API_BASE_URL}/homebrew-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, name, text }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { summary: "", items: [], message: body.message ?? "The summary didn't work. Try again in a moment." };
    }
    return {
      summary: body.summary ?? "",
      items: Array.isArray(body.items) ? body.items : [],
      dropped: body.dropped ?? 0,
      message: body.message,
    };
  } catch {
    return { summary: "", items: [], message: "Couldn't reach the server. Check your connection and try again." };
  }
}

// "Previously on...": Claude retells a session from the table's shared notes
// ([{ author, text }]). Like the other AI helpers it never throws: failures
// come back as a message the screen can show.
export async function writeRecapFromNotes({ sessionNumber, entries }) {
  try {
    const response = await fetch(`${API_BASE_URL}/recap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionNumber, entries }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { recap: "", message: body.message ?? "The recap didn't work. Try again in a moment." };
    }
    return { recap: body.recap ?? "", message: body.message };
  } catch {
    return { recap: "", message: "Couldn't reach the server. Check your connection and try again." };
  }
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

// The 12 SRD classes, homebrew classes, and the book classes (Artificer,
// Blood Hunter), which have a summary and a link only.
export async function getClasses() {
  const [classes, entries] = await Promise.all([
    requestJson("/classes", "Failed to fetch classes:"),
    loadHomebrew(),
  ]);
  // The backend doesn't label classes; they're all SRD 5.1.
  const srd = classes.map((item) => ({ ...item, source: item.source ?? "SRD 5.1" }));
  return [...srd, ...listHomebrew(entries, "class"), ...listBookClasses()].sort(byName);
}

// SRD classes list their SRD, Open5e, homebrew and book subclasses.
export async function getClassDetails(classId) {
  if (isBookEntryId(classId)) {
    const entry = findBookClass(classId);
    if (!entry) throw new Error(`Book class ${classId} not found`);
    return entry;
  }
  // A homebrew class lists its homebrew subclasses, plus the book subclasses
  // of the class it rebuilds (a homebrew Artificer lists the Artificer's).
  if (isHomebrewId(classId)) {
    const homebrewClass = await findInHomebrew(classId, findHomebrew);
    const bookRefs = homebrewClass.book_class ? getBookSubclassRefs(homebrewClass.book_class) : [];
    return { ...homebrewClass, subclasses: [...homebrewClass.subclasses, ...bookRefs] };
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

// The SRD monsters for the DM's encounter helper: the list has name, challenge
// rating, XP, type and size; one monster's entry has its whole stat block.
export function getMonsters() {
  return requestJson("/monsters", "Failed to fetch monsters:");
}

export function getMonsterDetails(monsterId) {
  return requestJson(
    `/monsters/${encodeURIComponent(monsterId)}`,
    `Failed to fetch monster details for ID ${monsterId}:`,
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

// SRD feats for the 2014 or 2024 rules, plus the player's homebrew feats on
// the 2014 request (they are not tied to an edition, so they appear once).
export function getFeats(edition) {
  const srd = requestJson(`/feats${editionQuery(edition)}`, "Failed to fetch feats:");
  if (edition === "2024") return srd;
  return withHomebrewItems(srd, (entries) =>
    listHomebrew(entries, "feat").map((item) => ({ ...item, edition: HOMEBREW_SOURCE })),
  );
}

// Everything the Feats page lists: SRD feats from both rule sets, homebrew,
// and the published-book feats (a summary and link only). The level-up picker
// uses getFeats instead, since book feats can't be chosen as they are.
export async function getFeatsToBrowse() {
  // The book feats are built in, so they still show if the SRD lists fail.
  const lists = await Promise.allSettled([getFeats("2014"), getFeats("2024")]);
  const srd = lists.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  return [...srd, ...listBookFeats()].sort(byName);
}

export async function getFeatDetails(featId, edition) {
  if (isHomebrewId(featId)) return findInHomebrew(featId, findHomebrew);
  if (isBookEntryId(featId)) {
    const feat = findBookFeat(featId);
    if (!feat) throw new Error(`Book feat ${featId} not found`);
    return feat;
  }
  return requestJson(
    `/feats/${encodeURIComponent(featId)}${editionQuery(edition)}`,
    `Failed to fetch feat details for ID ${featId}:`,
  );
}

export async function getClassSpells(classId) {
  // A homebrew class uses the spell list of the SRD class it picked.
  if (isHomebrewId(classId)) {
    const homebrewClass = await findInHomebrew(classId, findHomebrew);
    if (!homebrewClass.spell_list) return [];
    classId = homebrewClass.spell_list;
  }
  return requestJson(
    `/classes/${encodeURIComponent(classId)}/spells`,
    `Failed to fetch spell list for class ${classId}:`,
  );
}

export async function getClassLevel(classId, level) {
  // Book classes have no rules in QuestKeeper.
  if (isBookEntryId(classId)) throw new Error("No levels for book classes");
  // A homebrew class's level, in the SRD's level shape.
  if (isHomebrewId(classId)) {
    const homebrewClass = await findInHomebrew(classId, findHomebrew);
    const atLevel = Number(level);
    return {
      level: atLevel,
      prof_bonus: Math.ceil(atLevel / 4) + 1,
      features: homebrewClass.features
        .filter((feature) => feature.level === atLevel)
        .map(({ index, name }) => ({ index, name })),
      spellcasting: atLevel === 1 ? homebrewClass.levelOneSpellcasting : null,
    };
  }
  return requestJson(
    `/classes/${encodeURIComponent(classId)}/levels/${encodeURIComponent(level)}`,
    `Failed to fetch level ${level} details for class ${classId}:`,
  );
}

// Every level of a class (1 to 20), each with the features it brings:
// [{ level, features: [{ index, name }] }]. Book classes have none.
export async function getClassLevels(classId) {
  if (isBookEntryId(classId)) return [];
  if (isHomebrewId(classId)) {
    const homebrewClass = await findInHomebrew(classId, findHomebrew);
    return Array.from({ length: 20 }, (_, index) => ({
      level: index + 1,
      features: homebrewClass.features
        .filter((feature) => feature.level === index + 1)
        .map(({ index: featureIndex, name }) => ({ index: featureIndex, name })),
    }));
  }
  return requestJson(
    `/classes/${encodeURIComponent(classId)}/levels`,
    `Failed to fetch levels for class ${classId}:`,
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

// The Magic Items page: every open-licensed item with its filterable facts
// (no descriptions; ask for one item to get its text).
export function getMagicItemCatalog() {
  return requestJson("/magic-items/catalog", "Failed to fetch the magic items catalog:");
}

export function getMagicItemCatalogEntry(itemIndex) {
  return requestJson(
    `/magic-items/catalog/${encodeURIComponent(itemIndex)}`,
    `Failed to fetch magic item ${itemIndex}:`,
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

export async function getClassFeatures(classId) {
  if (isBookEntryId(classId)) return [];
  if (isHomebrewId(classId)) {
    const homebrewClass = await findInHomebrew(classId, findHomebrew);
    return homebrewClass.features.map(({ index, name, level }) => ({ index, name, level }));
  }
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

// --- Is a newer version of QuestKeeper live? ------------------------------------------
//
// The build this page was loaded from, and the one the server has now (from
// /version.json, written at build time; see vite.config.js). Asked fresh
// every time, never from a cache. null when it can't tell (offline, or in
// development where there's no version.json).
export const CURRENT_BUILD = import.meta.env.VITE_BUILD_ID ?? "";

export async function fetchDeployedBuild() {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok || !String(response.headers.get("content-type") ?? "").includes("json")) return null;
    const data = await response.json();
    return typeof data?.buildId === "string" && data.buildId ? data.buildId : null;
  } catch {
    return null;
  }
}

// A different build is live (and both are known).
export function isNewerBuild(current, deployed) {
  return Boolean(current && deployed && current !== deployed);
}
