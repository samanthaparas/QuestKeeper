# QuestKeeper Wayfarer icon library

This folder contains the warm, hand-inked icon system created for the
Wayfarer visual direction.

All icons are:

- 512 by 512 pixel PNG files
- transparent
- padded consistently for cards and reference results
- designed to remain recognizable between 48 and 96 pixels

## Organization

```text
icons/
├── races/          9 ancestry portraits
├── classes/        12 class emblems
├── backgrounds/    13 narrative background emblems
├── spell-schools/   8 magic-school emblems
├── spell-effects/   9 effect and purpose emblems
└── ui/              8 QuestKeeper interface emblems
```

Use race portraits and class/background emblems as the main card artwork.
Use spell-school icons to identify the spell's rules category and
spell-effect icons to communicate its practical use.

## React example

```jsx
import tieflingIcon from "../../assets/icons/races/tiefling.png";

<img
  src={tieflingIcon}
  alt=""
  aria-hidden="true"
  className="reference-card__icon"
/>
```

The icon should normally be decorative when the adjacent text already names
the race, class, background, or spell category. Use an empty `alt` value in
that situation to avoid repeating the same label to screen-reader users.

## Suggested display sizes

```css
.reference-card__icon {
  width: clamp(4rem, 8vw, 7rem);
  aspect-ratio: 1;
  object-fit: contain;
}

.result-row__icon {
  width: 3rem;
  height: 3rem;
  object-fit: contain;
}

.detail-panel__icon {
  width: 9rem;
  height: 9rem;
  object-fit: contain;
}
```

## Dynamic loading with Vite

```js
const raceIcons = import.meta.glob(
  "../../assets/icons/races/*.png",
  { eager: true, import: "default" },
);

export function getRaceIcon(raceId) {
  return raceIcons[`../../assets/icons/races/${raceId}.png`];
}
```

Normalize API identifiers to lowercase kebab case before resolving an icon.
For example, `Half-Elf` becomes `half-elf` and `Guild Artisan` becomes
`guild-artisan`.

## Color direction

- Terracotta: `#B45437`
- Moss: `#58705C`
- Brass: `#C48B38`
- Dark brown: `#34261F`
- Parchment: `#FFF7E8`

Keep the original 512-pixel files as the source assets. Generate optimized
WebP or AVIF copies during the production build if additional compression is
needed.
