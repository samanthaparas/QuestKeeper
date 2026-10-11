const BASE_URL = "https://www.dnd5eapi.co/api";
const VALID_EDITIONS = ["2014", "2024"];
const DEFAULT_EDITION = "2014";

export function resolveEdition(query) {
  return VALID_EDITIONS.includes(query?.edition)
    ? query.edition
    : DEFAULT_EDITION;
}

// The badge text for SRD entries, so they can sit in the same lists as
// Open5e ones ("Tome of Heroes") and players can tell them apart.
export function srdSourceLabel(edition) {
  return edition === "2024" ? "SRD 5.2" : "SRD 5.1";
}

export function tagSrdSource(entries, edition = DEFAULT_EDITION) {
  return entries.map((entry) => ({
    ...entry,
    source: srdSourceLabel(edition),
  }));
}

export async function fetchDnd5eList(resource, edition, errorMessage) {
  const response = await fetch(`${BASE_URL}/${edition}/${resource}`);

  if (!response.ok) {
    const error = new Error(errorMessage);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  return data.results.map((entry) => ({ ...entry, edition }));
}

export async function fetchDnd5eById(resource, edition, id, errorMessage) {
  const response = await fetch(
    `${BASE_URL}/${edition}/${resource}/${encodeURIComponent(id)}`,
  );

  if (!response.ok) {
    const error = new Error(errorMessage);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  return { ...data, edition };
}
