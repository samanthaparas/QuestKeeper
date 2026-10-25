"""Cuts the October 2026 art pack's source sheets into individual app-sized files.

The full-size sheets live (untracked) in design/source/questkeeper-art-pack-2026-10-24/.
This writes small optimized WebP copies into the frontend's assets folders and a
manifest saying what each file is for. Re-run it after changing the sizes below.

Needs Pillow:  python3 -m venv /tmp/qkvenv && /tmp/qkvenv/bin/pip install pillow
Run:           /tmp/qkvenv/bin/python scripts/extract_redesign_art_pack.py
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "design" / "source" / "questkeeper-art-pack-2026-10-24"
OUT = ROOT / "questkeeper-frontend" / "src" / "assets"
INSET = 5  # pixels trimmed from every cell edge, which removes divider lines and edge bleed

manifest = []


def save(img, folder, name, size, use, source, quality=82):
    target = OUT / folder
    target.mkdir(parents=True, exist_ok=True)
    if size:
        img = img.resize(size, Image.LANCZOS)
    path = target / f"{name}.webp"
    img.convert("RGB").save(path, "WEBP", quality=quality, method=6)
    manifest.append({"file": f"{folder}/{name}.webp", "pixels": list(img.size), "bytes": path.stat().st_size, "source": source, "use": use})


def grid(sheet, cols, rows):
    im = Image.open(SRC / sheet).convert("RGB")
    w, h = im.size
    cw, ch = w / cols, h / rows
    for r in range(rows):
        for c in range(cols):
            yield r * cols + c, im.crop((round(c * cw) + INSET, round(r * ch) + INSET, round((c + 1) * cw) - INSET, round((r + 1) * ch) - INSET))


# banners.png is not cut here any more: the website's banners come from the individual
# 2172x724 paintings (see scripts/make_hires_banners.py).

# campaigns.png: 2 x 2 landscapes, optional default art for table cards.
for i, tile in grid("campaigns.png", 2, 2):
    name, use = [
        ("village-bridge", "Table card art: riverside village and bridge"),
        ("forest-ruins", "Table card art: forest ruins"),
        ("mountain-lake", "Table card art: mountain lake and castle"),
        ("farm-cottage", "Table card art: farm cottage at sunset"),
    ][i]
    save(tile, "campaigns", name, (480, 360), use + " (generic sample art, not a real campaign location)", "campaigns.png", quality=78)

# characters.png: 4 x 3 generic adults, optional sample/selection art. Never a replacement for an uploaded portrait.
CHARS = ["human-male-warrior", "human-female-cleric", "elf-male-wizard", "elf-female-ranger", "dwarf-male", "dwarf-female",
         "halfling-male", "halfling-female", "dragonborn-brass", "tiefling-female", "gnome-scholar", "half-orc-female"]
for i, tile in grid("characters.png", 4, 3):
    save(tile, "characters", CHARS[i], (192, 192), "Optional generic sample portrait (fallback or picker art only)", "characters.png", quality=80)

# creatures.png: 4 x 3 creature portraits. Only exact confirmed creature ids may use these.
CREATURES = ["goblin", "kobold", "skeleton", "wolf", "ogre", "orc", "hobgoblin", "bugbear", "owlbear", "brown-bear", "giant-spider", "treant"]
for i, tile in grid("creatures.png", 4, 3):
    save(tile, "creature-portraits-new", CREATURES[i], (160, 160), "Creature thumbnail for the exact SRD id only; goblin, kobold, skeleton, wolf and ogre already have approved art", "creatures.png", quality=80)

# support.png: 4 x 4 small pictures with the espresso background baked in (NOT transparent).
SUPPORT = ["compass", "beginner-book", "party-mugs", "lantern", "melee-swords", "bow-quiver", "shield", "potion",
           "sealed-scroll", "map", "journal-quill", "chest", "magnifier", "speech-bubbles", "eye", "signpost"]
for i, tile in grid("support.png", 4, 4):
    save(tile, "support-new", SUPPORT[i], (96, 96), "Decorative symbol on its own dark tile (background baked in)", "support.png", quality=85)

# items.png: 4 x 4 decorative item illustrations.
ITEMS = ["bag", "cloak", "flaming-sword", "ring", "metal-rod", "sending-stones", "druid-staff", "winged-boots",
         "spectral-hand", "healing-hands", "magic-shield", "firebolt", "fighter-emblem", "ranger-emblem", "wizard-book", "cleric-sun"]
for i, tile in grid("items.png", 4, 4):
    save(tile, "items-new", ITEMS[i], (96, 96), "Decorative generic illustration; no rules data or provenance claims", "items.png", quality=82)

(OUT / "redesign-art-manifest.json").write_text(json.dumps(manifest, indent=1))
print(len(manifest), "files,", sum(m["bytes"] for m in manifest) // 1024, "KB")
