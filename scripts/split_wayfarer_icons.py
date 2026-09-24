from pathlib import Path
from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = PROJECT_ROOT / "questkeeper-frontend" / "src" / "assets" / "icons"
SOURCE_ROOT = PROJECT_ROOT / "design" / "source"

SHEETS = [
    {
                "source": SOURCE_ROOT / "icon-sheet-1-mixed.png",
        "columns": 4,
        "rows": 4,
        "icons": [
            ("races", "tiefling"),
            ("races", "elf"),
            ("races", "dwarf"),
            ("races", "dragonborn"),
            ("classes", "bard"),
            ("classes", "fighter"),
            ("classes", "wizard"),
            ("classes", "cleric"),
            ("backgrounds", "acolyte"),
            ("backgrounds", "criminal"),
            ("backgrounds", "outlander"),
            ("backgrounds", "sage"),
            ("spell-effects", "damage"),
            ("spell-effects", "healing"),
            ("spell-effects", "divination"),
            ("spell-effects", "control"),
        ],
    },
    {
                "source": SOURCE_ROOT / "icon-sheet-2-races.png",
        "columns": 5,
        "rows": 1,
        "icons": [
            ("races", "gnome"),
            ("races", "half-elf"),
            ("races", "half-orc"),
            ("races", "halfling"),
            ("races", "human"),
        ],
    },
    {
                "source": SOURCE_ROOT / "icon-sheet-3-classes.png",
        "columns": 4,
        "rows": 2,
        "icons": [
            ("classes", "barbarian"),
            ("classes", "druid"),
            ("classes", "monk"),
            ("classes", "paladin"),
            ("classes", "ranger"),
            ("classes", "rogue"),
            ("classes", "sorcerer"),
            ("classes", "warlock"),
        ],
    },
    {
                "source": SOURCE_ROOT / "icon-sheet-4-backgrounds.png",
        "columns": 4,
        "rows": 3,
        "icons": [
            ("backgrounds", "charlatan"),
            ("backgrounds", "entertainer"),
            ("backgrounds", "folk-hero"),
            ("backgrounds", "guild-artisan"),
            ("backgrounds", "hermit"),
            ("backgrounds", "noble"),
            ("backgrounds", "sailor"),
            ("backgrounds", "soldier"),
            ("backgrounds", "urchin"),
            ("backgrounds", "sage"),
            ("backgrounds", "criminal"),
            ("backgrounds", "outlander"),
        ],
    },
    {
                "source": SOURCE_ROOT / "icon-sheet-5-spell-schools.png",
        "columns": 4,
        "rows": 2,
        "icons": [
            ("spell-schools", "abjuration"),
            ("spell-schools", "conjuration"),
            ("spell-schools", "divination"),
            ("spell-schools", "enchantment"),
            ("spell-schools", "evocation"),
            ("spell-schools", "illusion"),
            ("spell-schools", "necromancy"),
            ("spell-schools", "transmutation"),
        ],
    },
    {
                "source": SOURCE_ROOT / "icon-sheet-6-effects-and-ui.png",
        "columns": 4,
        "rows": 4,
        "icons": [
            ("spell-effects", "damage"),
            ("spell-effects", "healing"),
            ("spell-effects", "defense"),
            ("spell-effects", "control"),
            ("spell-effects", "movement"),
            ("spell-effects", "summoning"),
            ("spell-effects", "utility"),
            ("spell-effects", "communication"),
            ("ui", "search-reference"),
            ("ui", "character"),
            ("ui", "dice"),
            ("ui", "inventory"),
            ("ui", "rest"),
            ("ui", "level-up"),
            ("ui", "notes"),
            ("ui", "settings"),
        ],
    },
]


def crop_cell(image, column, row, columns, rows):
    left = round(column * image.width / columns)
    top = round(row * image.height / rows)
    right = round((column + 1) * image.width / columns)
    bottom = round((row + 1) * image.height / rows)
    cell = image.crop((left, top, right, bottom)).convert("RGBA")

    alpha_bounds = cell.getchannel("A").getbbox()
    if alpha_bounds:
        cell = cell.crop(alpha_bounds)

    max_size = 432
    cell.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    x = (canvas.width - cell.width) // 2
    y = (canvas.height - cell.height) // 2
    canvas.alpha_composite(cell, (x, y))
    return canvas


def main():
    for sheet in SHEETS:
        image = Image.open(sheet["source"]).convert("RGBA")
        for index, (category, name) in enumerate(sheet["icons"]):
            column = index % sheet["columns"]
            row = index // sheet["columns"]
            icon = crop_cell(
                image,
                column,
                row,
                sheet["columns"],
                sheet["rows"],
            )
            destination = OUTPUT_ROOT / category
            destination.mkdir(parents=True, exist_ok=True)
            icon.save(destination / f"{name}.png", optimize=True)

    print(f"Created Wayfarer icons in {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
