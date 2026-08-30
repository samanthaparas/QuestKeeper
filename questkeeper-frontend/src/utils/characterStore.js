const STORAGE_KEY = "questkeeper:characters";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(characters) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
}

export function listCharacters() {
  return readAll();
}

export function getCharacter(id) {
  return readAll().find((sheet) => sheet.id === id) || null;
}

export function saveCharacter(sheet) {
  const characters = readAll();
  const index = characters.findIndex((item) => item.id === sheet.id);
  const savedSheet = { ...sheet, updatedAt: new Date().toISOString() };

  if (index === -1) {
    characters.push(savedSheet);
  } else {
    characters[index] = savedSheet;
  }

  writeAll(characters);
  return savedSheet;
}

export function deleteCharacter(id) {
  writeAll(readAll().filter((sheet) => sheet.id !== id));
}
