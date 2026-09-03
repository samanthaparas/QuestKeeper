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

export function getBackgrounds() {
  return requestJson("/backgrounds", "Failed to fetch backgrounds:");
}

export function getBackgroundDetails(backgroundId) {
  return requestJson(
    `/backgrounds/${encodeURIComponent(backgroundId)}`,
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

export function getFeats() {
  return requestJson("/feats", "Failed to fetch feats:");
}

export function getFeatDetails(featId) {
  return requestJson(
    `/feats/${encodeURIComponent(featId)}`,
    `Failed to fetch feat details for ID ${featId}:`,
  );
}

export function getClassSpells(classId) {
  return requestJson(
    `/classes/${encodeURIComponent(classId)}/spells`,
    `Failed to fetch spell list for class ${classId}:`,
  );
}
