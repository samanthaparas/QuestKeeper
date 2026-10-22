import { describe, expect, it } from 'vitest';
import { getAvatarLayers } from './avatars';

describe('default avatar artwork', () => {
  it('covers all 55,440 combinations in the current library', () => {
    const ids = (paths) => Object.keys(paths).map((path) => path.split('/').pop().replace('.webp', ''));
    const races = ids(import.meta.glob('../assets/avatars/races/*.webp'));
    const classes = ids(import.meta.glob('../assets/avatars/classes/*.webp'));
    const backgrounds = ids(import.meta.glob('../assets/avatars/backgrounds/*.webp'));
    let count = 0;
    for (const race of races) for (const characterClass of classes) for (const background of backgrounds) {
      const art = getAvatarLayers({ race, class: characterClass, background });
      if (!art.race || !art.class || !art.background) throw new Error(`${race}/${characterClass}/${background}`);
      count++;
    }
    expect(count).toBe(55440);
  });

  it('resolves saved source identities, names and explicit homebrew art', () => {
    const canonical = getAvatarLayers({ race: 'half-elf', class: 'blood-hunter', background: 'guild-artisan' });
    expect(getAvatarLayers({
      race: { index: 'hb_uuid', name: 'Half-Elf' },
      class: { index: 'hb_uuid', artId: 'blood-hunter' },
      background: { index: 'book_guild-artisan' },
    })).toEqual(canonical);
    expect(getAvatarLayers({ race: 'toh_catfolk' }).race).toBeTruthy();
    expect(getAvatarLayers({ background: 'tdcs_elemental-warden' }).background).toBeTruthy();
  });

  it('does not invent an ancestry for missing, malformed or custom data', () => {
    expect(getAvatarLayers()).toEqual({ race: null, class: null, background: null });
    expect(getAvatarLayers({ race: { artId: 'custom', name: 'Elf' }, class: 42 })).toEqual({ race: null, class: null, background: null });
  });
});
