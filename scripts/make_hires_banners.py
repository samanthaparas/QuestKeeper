"""Makes the website's banner pictures from the individual 2172x724 source paintings.

Sources (git-ignored): design/source/hires-banners-2026-10-24/banner-*.png
Output: questkeeper-frontend/src/assets/banners/<name>.webp (2172 wide, for 2x screens)
        and <name>-1086.webp (half size, for 1x screens). Nothing is sharpened or upscaled.

Run: /tmp/qkvenv/bin/python scripts/make_hires_banners.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "design" / "source" / "hires-banners-2026-10-24"
OUT = ROOT / "questkeeper-frontend" / "src" / "assets" / "banners"
OUT.mkdir(parents=True, exist_ok=True)

for name in ["guild-table", "wilderness", "library", "bestiary", "learning-desk", "hearth", "player-game"]:
    image = Image.open(SRC / f"banner-{name}.png").convert("RGB")
    assert image.size == (2172, 724), (name, image.size)
    full = OUT / f"{name}.webp"
    image.save(full, "WEBP", quality=82, method=6)
    half = image.resize((1086, 362), Image.LANCZOS)  # a downscale, for 1x screens
    small = OUT / f"{name}-1086.webp"
    half.save(small, "WEBP", quality=84, method=6)
    print(f"{name}: {full.stat().st_size // 1024} KB (2172x724), {small.stat().st_size // 1024} KB (1086x362)")
