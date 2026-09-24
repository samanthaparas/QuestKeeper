# Asset scripts

Python scripts that generated QuestKeeper's brand assets and Wayfarer icons.
They need Python 3 and Pillow:

```
pip install Pillow
```

Run them from the repo root, e.g. `python scripts/split_wayfarer_icons.py`.
Each script overwrites the committed assets it produces.

## Source images

The source artwork isn't committed (about 15 MB). The scripts read it from
`design/source/`, which is gitignored, so keep a backup of that folder.

| File                                                         | Used by                           |
| ------------------------------------------------------------ | --------------------------------- |
| `wayfinder-mark.png`                                         | `build_wayfinder_brand_assets.py` |
| `book-logo.png`                                              | `build_wayfinder_brand_assets.py` |
| `book-favicon.png`                                           | `build_wayfinder_brand_assets.py` |
| `compact-book-mark.png`                                      | `build_wayfinder_brand_assets.py` |
| `icon-sheet-1-mixed.png` … `icon-sheet-6-effects-and-ui.png` | `split_wayfarer_icons.py`         |

## Scripts

- `build_wayfinder_brand_assets.py`: builds every logo and favicon size,
  plus `.ico` files, into `questkeeper-frontend/src/assets/brand/`.
- `split_wayfarer_icons.py`: cuts the six icon sheets into individual 512px
  icons in `questkeeper-frontend/src/assets/icons/<category>/`.
- `build_brand_header_preview.py`: draws
  `questkeeper-detailed-header-preview.png`, a header mockup using the book
  logo. It loads fonts from `C:\Windows\Fonts`, so it only runs on Windows as
  written.
