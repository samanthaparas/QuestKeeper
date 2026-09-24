from pathlib import Path
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = PROJECT_ROOT / "design" / "source"
WAYFINDER_SOURCE = SOURCE_ROOT / "wayfinder-mark.png"
BOOK_LOGO_SOURCE = SOURCE_ROOT / "book-logo.png"
BOOK_FAVICON_SOURCE = SOURCE_ROOT / "book-favicon.png"
COMPACT_BOOK_SOURCE = SOURCE_ROOT / "compact-book-mark.png"
OUTPUT = PROJECT_ROOT / "questkeeper-frontend" / "src" / "assets" / "brand"


def fit_square(image, size, content_ratio=0.88):
    image = image.convert("RGBA")
    bounds = image.getchannel("A").getbbox()
    if bounds:
        image = image.crop(bounds)

    content_size = max(1, round(size * content_ratio))
    image.thumbnail((content_size, content_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(
        image,
        ((size - image.width) // 2, (size - image.height) // 2),
    )
    return canvas


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(WAYFINDER_SOURCE).convert("RGBA")

    master = fit_square(source, 1024, content_ratio=0.9)
    master.save(OUTPUT / "questkeeper-wayfinder-master.png", optimize=True)

    sizes = [512, 192, 64, 32, 16]
    rendered = {}
    for size in sizes:
        icon = fit_square(source, size, content_ratio=0.9 if size >= 64 else 0.94)
        rendered[size] = icon
        icon.save(OUTPUT / f"questkeeper-wayfinder-{size}.png", optimize=True)

    rendered[512].save(
        OUTPUT / "questkeeper-wayfinder.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    book_source = Image.open(BOOK_LOGO_SOURCE).convert("RGBA")
    book_master = fit_square(book_source, 1024, content_ratio=0.92)
    book_master.save(OUTPUT / "questkeeper-book-logo-master.png", optimize=True)
    for size in [512, 192, 128, 64]:
        fit_square(book_source, size, content_ratio=0.92).save(
            OUTPUT / f"questkeeper-book-logo-{size}.png",
            optimize=True,
        )

    favicon_source = Image.open(BOOK_FAVICON_SOURCE).convert("RGBA")
    favicon_sizes = [512, 192, 64, 32, 16]
    favicon_rendered = {}
    for size in favicon_sizes:
        content_ratio = 0.9 if size >= 64 else 0.96
        icon = fit_square(favicon_source, size, content_ratio=content_ratio)
        favicon_rendered[size] = icon
        icon.save(OUTPUT / f"questkeeper-book-favicon-{size}.png", optimize=True)

    favicon_rendered[512].save(
        OUTPUT / "questkeeper-book-favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    compact_source = Image.open(COMPACT_BOOK_SOURCE).convert("RGBA")
    compact_sizes = [1024, 512, 192, 128, 64, 48, 32, 16]
    compact_rendered = {}
    for size in compact_sizes:
        content_ratio = 0.92 if size >= 64 else 0.98
        icon = fit_square(compact_source, size, content_ratio=content_ratio)
        compact_rendered[size] = icon
        icon.save(OUTPUT / f"questkeeper-compact-{size}.png", optimize=True)

    compact_rendered[512].save(
        OUTPUT / "questkeeper-compact.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    print(f"Created QuestKeeper brand assets in {OUTPUT}")


if __name__ == "__main__":
    main()
