const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"
).replace(/\/$/, "");

function checkResponse(res) {
  if (res.ok) {
    return res.json();
  }

  return Promise.reject(`Error: ${res.status}`);
}

export function getRaces() {
  return fetch(`${API_BASE_URL}/races`)
    .then(checkResponse)
    .then((response) => response.data)
    .catch((err) => {
      console.error("Failed to fetch races:", err);
      throw err;
    });
}

export function getRaceDetails(raceId) {
  return fetch(`${API_BASE_URL}/races/${encodeURIComponent(raceId)}`)
    .then(checkResponse)
    .then((response) => response.data)
    .catch((err) => {
      console.error(`Failed to fetch race details for ID ${raceId}:`, err);
      throw err;
    });
}

export function getClasses() {
  return fetch(`${API_BASE_URL}/classes`)
    .then(checkResponse)
    .then((response) => response.data)
    .catch((err) => {
      console.error("Failed to fetch classes:", err);
      throw err;
    });
}

export function getClassDetails(classId) {
  return fetch(`${API_BASE_URL}/classes/${encodeURIComponent(classId)}`)
    .then(checkResponse)
    .then((response) => response.data)
    .catch((err) => {
      console.error(`Failed to fetch class details for ID ${classId}:`, err);
      throw err;
    });
}

export function getBackgrounds() {
  return fetch(`${API_BASE_URL}/backgrounds`)
    .then(checkResponse)
    .then((response) => response.data)
    .catch((err) => {
      console.error("Failed to fetch backgrounds:", err);
      throw err;
    });
}

export function getBackgroundDetails(backgroundId) {
  return fetch(
    `${API_BASE_URL}/backgrounds/${encodeURIComponent(backgroundId)}`,
  )
    .then(checkResponse)
    .then((response) => response.data)
    .catch((err) => {
      console.error(
        `Failed to fetch background details for ID ${backgroundId}:`,
        err,
      );
      throw err;
    });
}

export function getSpells() {
  return fetch(`${API_BASE_URL}/spells`)
    .then(checkResponse)
    .then((response) => response.data)
    .catch((err) => {
      console.error("Failed to fetch spells:", err);
      throw err;
    });
}

export function getSpellDetails(spellId) {
  return fetch(`${API_BASE_URL}/spells/${encodeURIComponent(spellId)}`)
    .then(checkResponse)
    .then((response) => response.data)
    .catch((err) => {
      console.error(`Failed to fetch spell details for ID ${spellId}:`, err);
      throw err;
    });
}
