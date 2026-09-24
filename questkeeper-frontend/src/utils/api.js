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

export function getRaces() {
  return requestJson("/races", "Failed to fetch races:");
}

export function getRaceDetails(raceId) {
  return requestJson(
    `/races/${encodeURIComponent(raceId)}`,
    `Failed to fetch race details for ID ${raceId}:`,
  );
}

export function getClasses() {
  return requestJson("/classes", "Failed to fetch classes:");
}

export function getClassDetails(classId) {
  return requestJson(
    `/classes/${encodeURIComponent(classId)}`,
    `Failed to fetch class details for ID ${classId}:`,
  );
}

export function getBackgrounds(edition) {
  return requestJson(
    `/backgrounds${editionQuery(edition)}`,
    "Failed to fetch backgrounds:",
  );
}

export function getBackgroundDetails(backgroundId, edition) {
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
  return requestJson(
    `/classes/${encodeURIComponent(classId)}/levels/${encodeURIComponent(level)}`,
    `Failed to fetch level ${level} details for class ${classId}:`,
  );
}

export function getSubraceDetails(subraceId) {
  return requestJson(
    `/subraces/${encodeURIComponent(subraceId)}`,
    `Failed to fetch subrace details for ID ${subraceId}:`,
  );
}

export function getSubclassDetails(subclassId) {
  return requestJson(
    `/subclasses/${encodeURIComponent(subclassId)}`,
    `Failed to fetch subclass details for ID ${subclassId}:`,
  );
}

export function getTraitDetails(traitId) {
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
  return requestJson(
    `/classes/${encodeURIComponent(classId)}/features`,
    `Failed to fetch features for class ${classId}:`,
  );
}

export function getSubclassFeatures(subclassId) {
  return requestJson(
    `/subclasses/${encodeURIComponent(subclassId)}/features`,
    `Failed to fetch features for subclass ${subclassId}:`,
  );
}

export function getRaceTraits(raceId) {
  return requestJson(
    `/races/${encodeURIComponent(raceId)}/traits`,
    `Failed to fetch traits for race ${raceId}:`,
  );
}

export function getSubraceTraits(subraceId) {
  return requestJson(
    `/subraces/${encodeURIComponent(subraceId)}/traits`,
    `Failed to fetch traits for subrace ${subraceId}:`,
  );
}

export function getFeatureDetails(featureId) {
  return requestJson(
    `/features/${encodeURIComponent(featureId)}`,
    `Failed to fetch feature details for ID ${featureId}:`,
  );
}
