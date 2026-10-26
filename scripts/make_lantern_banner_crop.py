"""Crops the DM screen's lantern out of the full 2000x667 illustration at its own
resolution (no resizing), so the title banner can show the whole lantern in a
shallow strip without magnifying a slice of the picture.

Source (git-ignored): design/source/inn-lantern-dm-banner.webp
Output: questkeeper-frontend/src/assets/hero/inn-lantern-crop.webp

Run: /tmp/qkvenv/bin/python scripts/make_lantern_banner_crop.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / "design" / "source" / "inn-lantern-dm-banner.webp").convert("RGB")
# The lantern spans about x 1395-1555 and y 145-450 in the 2000x667 original.
# This box keeps all of it, with its ring on top and its base on the table,
# plus the book, mug and chair beside it.
box = (1060, 112, 2000, 482)
crop = source.crop(box)
out = ROOT / "questkeeper-frontend" / "src" / "assets" / "hero" / "inn-lantern-crop.webp"
crop.save(out, "WEBP", quality=88, method=6)
print(out.name, crop.size, out.stat().st_size // 1024, "KB")
