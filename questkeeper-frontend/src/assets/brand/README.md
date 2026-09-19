# QuestKeeper brand concepts

## Recommended: QK Open Book

The selected primary identity combines the readable initials **QK** with an
open reference book and a brass wayfinding star. A terracotta path runs
through the Q toward the book's center, connecting the mark to QuestKeeper's
purpose: helping players move from a question to a useful answer.

The primary logo and favicon use related but intentionally different levels
of detail. The full logo retains the moss backdrop and path. The favicon
removes those details so the QK, book, and star survive at 16 pixels.

### Everyday compact mark

The final compact mark replaces the dotted road with a solid terracotta Q
tail. Use this exact mark in the navigation and as the favicon so the browser
identity matches what users see in the application header.

- `questkeeper-compact-1024.png` — compact master
- `questkeeper-compact-512.png` — application icon
- `questkeeper-compact-192.png` — touch/web-app icon
- `questkeeper-compact-128.png` — large navigation or profile use
- `questkeeper-compact-64.png` — standard navigation use
- `questkeeper-compact-48.png` — compact navigation use
- `questkeeper-compact-32.png` — standard favicon
- `questkeeper-compact-16.png` — smallest favicon test
- `questkeeper-compact.ico` — multi-resolution browser favicon
- `questkeeper-compact-header-preview.png` — compact-mark header comparison
- `questkeeper-detailed-header-preview.png` — recommended detailed-logo header

### Open-book files

- `questkeeper-book-logo-master.png` — 1024px primary source
- `questkeeper-book-logo-512.png` — large application use
- `questkeeper-book-logo-192.png` — compact application use
- `questkeeper-book-logo-128.png` — navigation or profile use
- `questkeeper-book-logo-64.png` — compact navigation use
- `questkeeper-book-favicon-512.png` — favicon master
- `questkeeper-book-favicon-192.png` — web-app and touch icon
- `questkeeper-book-favicon-64.png` — high-density browser icon
- `questkeeper-book-favicon-32.png` — standard favicon
- `questkeeper-book-favicon-16.png` — smallest favicon test
- `questkeeper-book-favicon.ico` — multi-resolution browser icon

## Alternate: QK Wayfinder

The Wayfinder mark combines the readable initials **QK** with a compass and a
winding path. The compass represents reference discovery; the path represents
guiding players from a question to a useful answer.

The existing QuestKeeper logo and favicon have intentionally not been
overwritten.

### Wayfinder files

- `questkeeper-wayfinder-master.png` — 1024px source asset
- `questkeeper-wayfinder-512.png` — application and social use
- `questkeeper-wayfinder-192.png` — web-app icon
- `questkeeper-wayfinder-64.png` — navigation and shortcut use
- `questkeeper-wayfinder-32.png` — standard favicon fallback
- `questkeeper-wayfinder-16.png` — smallest favicon test
- `questkeeper-wayfinder.ico` — multi-resolution browser icon

All PNG files have transparent backgrounds.

## Recommended navigation lockup

Use the 64px mark next to a text wordmark rather than placing the full product
name inside the image:

```jsx
import questKeeperMark from "../../assets/brand/questkeeper-compact-64.png";

<a className="brand" href="/">
  <img src={questKeeperMark} alt="" aria-hidden="true" />
  <span>QuestKeeper</span>
</a>
```

```css
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: #34261f;
  text-decoration: none;
}

.brand img {
  width: 2.75rem;
  height: 2.75rem;
  object-fit: contain;
}

.brand span {
  font-family: "Fraunces", Georgia, serif;
  font-size: 1.3rem;
  font-weight: 600;
}
```

## Favicon example

```html
<link rel="icon" href="/src/assets/brand/questkeeper-compact.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/src/assets/brand/questkeeper-compact-32.png">
<link rel="apple-touch-icon" href="/src/assets/brand/questkeeper-compact-192.png">
```

For a Vite production site, copying the final favicon files into `public/`
will give them stable root URLs such as `/favicon.ico`.

## Palette

- Dark brown: `#34261F`
- Parchment: `#FFF7E8`
- Moss: `#58705C`
- Terracotta: `#B45437`
- Brass: `#C48B38`
