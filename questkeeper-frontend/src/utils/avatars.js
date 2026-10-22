// Small delivery copies; the original reference illustrations stay untouched.
const raceArt = import.meta.glob('../assets/avatars/races/*.webp', { eager: true, import: 'default' });
const classArt = import.meta.glob('../assets/avatars/classes/*.webp', { eager: true, import: 'default' });
const backgroundArt = import.meta.glob('../assets/avatars/backgrounds/*.webp', { eager: true, import: 'default' });

function normalize(value) {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : '';
}

function resolve(art, folder, choice) {
  // Homebrew UUIDs aren't artwork IDs. A saved artId is authoritative;
  // otherwise an exact supported name can reuse the canonical illustration.
  const values = typeof choice === 'string' ? [choice]
    : choice?.artId ? [choice.artId] : [choice?.index, choice?.id, choice?.name];
  for (const value of values) {
    const id = normalize(value).replace(/^(book|toh|tdcs|open5e)-/, '');
    const src = art[`../assets/avatars/${folder}/${id}.webp`];
    if (src) return src;
  }
  return null;
}

// Accept full sheets and the same small identity fields on party rows.
// A partial/unknown identity stays partial; never assign a different ancestry.
export function getAvatarLayers(character) {
  return {
    race: resolve(raceArt, 'races', character?.race),
    class: resolve(classArt, 'classes', character?.class),
    background: resolve(backgroundArt, 'backgrounds', character?.background),
  };
}
