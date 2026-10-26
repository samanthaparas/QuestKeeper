# Redesign reference pack (October 24, 2026)

The visual references for the site-wide redesign live **outside git**, in the ignored `design/source/` folder (full-size artwork is never bundled into the app). On a fresh checkout, copy the pack back in from `~/Documents/ChatGPT/QuestKeeper/outputs/`.

| What | Where | Covers |
| --- | --- | --- |
| Page mockups | `design/source/site-redesign-reference-2026-10-24/` | `01-games.png` My Games, DM landing, player game page, sample table; `02-characters.png` Your Characters, creation, quiz; `03-reference.png` search and the seven reference pages; `04-dm-tools.png` Monster Library, Homebrew; `05-learning.png` Learn the Basics, About, Attributions; `06-account.png` sign-in, Settings, Messages, shared states; `character-sheet-subtle-refinement.png` small polish for the character sheet (supersedes the sheet panel in 02) |
| Hand-off guides | the same folder: `START-HERE-CLAUDE.md`, `README.md`; and `design/source/questkeeper-art-pack-2026-10-24/START-HERE-ART.md` | Rules for using the references |
| Artwork source sheets | `design/source/questkeeper-art-pack-2026-10-24/` | `banners`, `characters`, `creatures`, `support`, `items`, `campaigns` sheets, plus `existing-approved/` copies of what is already in the app |

## How the artwork gets into the app

Two scripts (they need Pillow: `python3 -m venv /tmp/qkvenv && /tmp/qkvenv/bin/pip install pillow`):

- `scripts/make_hires_banners.py` turns the seven individual 2172x724 paintings in `design/source/hires-banners-2026-10-24/` into the website's banners (`src/assets/banners/`, a 2172px and a half-size 1086px WebP of each). Banners are drawn right-anchored, never wider than 1086 CSS pixels (1:1 on a 2x screen), with their left edge feathered into the panel.
- `scripts/extract_redesign_art_pack.py` cuts the art-pack sheets (campaign landscapes, characters, creatures, support icons, items) into small WebP files and writes `src/assets/redesign-art-manifest.json`. Only the campaign landscapes are used by the app so far, so they are the only output committed. The character, creature, support and item pictures are not used yet: re-run the script to make them when a page needs them.
- `scripts/make_lantern_banner_crop.py` cuts the DM screen's lantern out of the original illustration at its own resolution.

`src/utils/redesignArt.js` is the one place that imports banners and campaign pictures, and says where each banner's focal point is.

- The prepared support pictures have a dark background baked in. They are not transparent, so show them on their own dark tile.
- Generated characters are generic sample art. They never replace an uploaded portrait.
- Creature pictures may only be used for an exact, confirmed creature id.
- Table cards use the campaign landscapes as generic sample art, picked from the table id. They are not real places.

## Which prepared art is used, and where (October 26, 2026)

Used by the app (committed, optimized):

| File | Where it shows |
| --- | --- |
| `src/assets/banners/*` | The page banners (seven names; Homebrew and the invite page use `bestiary`) |
| `src/assets/campaigns/*` | Sample landscapes on table cards |
| `src/assets/hero/inn-lantern-crop.webp` | The DM screen's lantern banner |
| `src/assets/support/journal-quill.webp` | Small tile beside "Nothing yet" on My Homebrew |
| `src/assets/support/sealed-scroll.webp` | The tile on the Homebrew invite card |
| `src/assets/support/lantern.webp` | The tile on the "Something went wrong" fallback |
| `src/assets/illustrations/lost-path.webp` | The 404 page (720x480 source in the finish kit; shown at most 320px wide) |

Prepared but **not used by any page**, on purpose. These were deleted from the working folder on October 26, 2026 (they were never committed). Byte-identical copies are in the redesign "finish kit" outside the repository, and the art-pack sheets and `scripts/extract_redesign_art_pack.py` in the ignored `design/source/` folder can make them again:

- **Characters:** generic portraits. They would suggest a look for a race or class, so they stay unused unless a mapping is approved. They never replace an uploaded portrait.
- **Creatures:** only exact, confirmed creature ids may use them, and none are mapped yet.
- **Items:** decorative, no verified exact mapping yet.
- **Other support icons** (potion, map, signpost, eye, shield and so on): kept for later empty states. The ones with a dark background baked in always sit on their own dark tile.

Subrace and subclass picker cards use a letter tile, not a parent race's or class's picture, so nothing suggests what a lineage or subclass looks like.

## Rules for the mockups

The boards are visual direction, not specifications. Their text, stats, dates, names, credits and the About portrait are placeholders, and features they depict (scheduling, extra login providers, notifications, new permissions, campaign metadata) are not requirements. Keep the existing storybook navigation, the character sheet's three-column layout, the finished homepage and DM Combat/Story/Players/Prep designs, and the real credits. Copy stays as it is until the later writing pass.
