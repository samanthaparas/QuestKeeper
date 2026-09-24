from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BRAND_ROOT = PROJECT_ROOT / "questkeeper-frontend" / "src" / "assets" / "brand"
OUTPUT = BRAND_ROOT / "questkeeper-detailed-header-preview.png"


def font(path, size):
    return ImageFont.truetype(str(path), size=size)


def main():
    width, height = 1440, 160
    background = "#EFE2CF"
    surface = "#FFF7E8"
    text = "#34261F"
    muted = "#756154"
    accent = "#B45437"
    border = "#CFB493"

    canvas = Image.new("RGB", (width, height), background)
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((0, height - 2, width, height), fill=border)

    logo = Image.open(BRAND_ROOT / "questkeeper-book-logo-192.png").convert("RGBA")
    logo.thumbnail((104, 104), Image.Resampling.LANCZOS)
    canvas.paste(logo, (29, 27), logo)

    heading = font(Path(r"C:\Windows\Fonts\georgiab.ttf"), 34)
    body = font(Path(r"C:\Windows\Fonts\segoeui.ttf"), 15)
    nav = font(Path(r"C:\Windows\Fonts\segoeuib.ttf"), 15)

    draw.text((140, 42), "QuestKeeper", fill=text, font=heading)
    draw.text((142, 88), "Where every question finds a path forward", fill=muted, font=body)

    nav_items = ["Races", "Classes", "Backgrounds", "Spells", "Characters", "About"]
    x = 625
    for item in nav_items:
        color = accent if item == "Spells" else text
        draw.text((x, 70), item, fill=color, font=nav)
        box = draw.textbbox((x, 70), item, font=nav)
        x = box[2] + 26

    search_box = (1198, 53, 1394, 105)
    draw.rounded_rectangle(search_box, radius=15, fill=surface, outline=border, width=2)
    draw.ellipse((1214, 69, 1230, 85), outline=accent, width=2)
    draw.line((1227, 82, 1235, 90), fill=accent, width=2)
    draw.text((1244, 69), "Search references", fill=muted, font=body)

    canvas.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
