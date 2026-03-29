from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path("/Users/martendr.gray/Documents/New project/DJ-Website")
OUT = ROOT / "store-assets" / "variants"
DR_LOGO = ROOT / "drgray-logo.jpg"
MRS_LOGO = ROOT / "mrsdrgray-logo.png"

W, H = 4500, 5400
GOLD = "#f5c84c"
IVORY = "#f2efe8"
TAUPE = "#bba984"
SOFT = "#7f735d"

GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
DIN_BOLD = "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def canvas() -> Image.Image:
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def load_logo(path: Path, target_h: int) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    scale = target_h / image.height
    image = image.resize((int(image.width * scale), target_h), Image.Resampling.LANCZOS)
    return image


def centered_text(draw: ImageDraw.ImageDraw, text: str, y: int, fnt: ImageFont.FreeTypeFont, fill: str) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    x = (W - (bbox[2] - bbox[0])) // 2
    draw.text((x, y), text, font=fnt, fill=fill)
    return x, y


def tracked_text(draw: ImageDraw.ImageDraw, text: str, y: int, fnt: ImageFont.FreeTypeFont, fill: str, tracking: int = 0) -> None:
    widths = []
    height = 0
    for char in text:
        bbox = draw.textbbox((0, 0), char, font=fnt)
        widths.append(bbox[2] - bbox[0])
        height = max(height, bbox[3] - bbox[1])
    total = sum(widths) + max(len(text) - 1, 0) * tracking
    x = (W - total) // 2
    cursor = x
    for char, width in zip(text, widths):
        draw.text((cursor, y), char, font=fnt, fill=fill)
        cursor += width + tracking


def save(name: str, image: Image.Image) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    image.save(OUT / name, dpi=(300, 300))


def dr_front() -> None:
    image = canvas()
    draw = ImageDraw.Draw(image)
    tracked_text(draw, "DR. GRAY", 980, font(DIN_BOLD, 150), TAUPE, tracking=12)
    centered_text(draw, "KEIN", 1450, font(GEORGIA_BOLD, 300), IVORY)
    tracked_text(draw, "MAINSTREAM.", 1860, font(ARIAL_BOLD, 320), GOLD, tracking=8)
    draw.line((1040, 2380, 3460, 2380), fill=SOFT, width=10)
    tracked_text(draw, "TECHNO  CLUB  KOELN", 2500, font(DIN_BOLD, 100), TAUPE, tracking=10)
    save("dr-front-kein-mainstream.png", image)


def dr_front_treibend() -> None:
    image = canvas()
    draw = ImageDraw.Draw(image)
    tracked_text(draw, "DR. GRAY", 960, font(DIN_BOLD, 150), TAUPE, tracking=12)
    centered_text(draw, "TREIBEND.", 1410, font(GEORGIA_BOLD, 300), IVORY)
    centered_text(draw, "ROH.", 1810, font(GEORGIA_BOLD, 300), IVORY)
    tracked_text(draw, "EHRLICH.", 2220, font(ARIAL_BOLD, 290), GOLD, tracking=8)
    draw.line((980, 2730, 3520, 2730), fill=SOFT, width=10)
    tracked_text(draw, "PEAKTIME  PRESSURE  KOELN", 2870, font(DIN_BOLD, 98), TAUPE, tracking=10)
    save("dr-front-treibend-roh-ehrlich.png", image)


def dr_front_bass() -> None:
    image = canvas()
    draw = ImageDraw.Draw(image)
    tracked_text(draw, "DR. GRAY", 980, font(DIN_BOLD, 150), TAUPE, tracking=12)
    centered_text(draw, "BASS", 1480, font(GEORGIA_BOLD, 340), IVORY)
    tracked_text(draw, "IM BLUT.", 1920, font(ARIAL_BOLD, 300), GOLD, tracking=8)
    draw.rounded_rectangle((1180, 2480, 3320, 3050), radius=42, outline=SOFT, width=10)
    tracked_text(draw, "RAW  DARK  CLUB  ENERGY", 2640, font(DIN_BOLD, 96), TAUPE, tracking=12)
    tracked_text(draw, "NO MAINSTREAM  ONLY PRESSURE", 2830, font(DIN_BOLD, 84), IVORY, tracking=8)
    save("dr-front-bass-im-blut.png", image)


def dr_back() -> None:
    image = canvas()
    logo = load_logo(DR_LOGO, 1700)
    x = (W - logo.width) // 2
    image.alpha_composite(logo, (x, 900))
    draw = ImageDraw.Draw(image)
    draw.line((980, 2960, 3520, 2960), fill=SOFT, width=10)
    tracked_text(draw, "DR. GRAY", 3110, font(DIN_BOLD, 150), GOLD, tracking=14)
    tracked_text(draw, "TECHNO MIT HALTUNG", 3300, font(DIN_BOLD, 96), TAUPE, tracking=10)
    save("dr-back-logo.png", image)


def mrs_front() -> None:
    image = canvas()
    logo = load_logo(MRS_LOGO, 980)
    x = (W - logo.width) // 2
    image.alpha_composite(logo, (x, 760))
    draw = ImageDraw.Draw(image)
    tracked_text(draw, "MRS. DR. GRAY", 1900, font(DIN_BOLD, 138), GOLD, tracking=12)
    centered_text(draw, "ZU WILD", 2340, font(GEORGIA_BOLD, 250), IVORY)
    tracked_text(draw, "FUER LEISE.", 2700, font(ARIAL_BOLD, 250), GOLD, tracking=6)
    draw.line((1180, 3200, 3320, 3200), fill=SOFT, width=10)
    tracked_text(draw, "SEXY  SERIOES  FRECH", 3340, font(DIN_BOLD, 92), TAUPE, tracking=10)
    save("mrs-front-zu-wild.png", image)


def mrs_front_liebe() -> None:
    image = canvas()
    logo = load_logo(MRS_LOGO, 920)
    x = (W - logo.width) // 2
    image.alpha_composite(logo, (x, 720))
    draw = ImageDraw.Draw(image)
    tracked_text(draw, "MRS. DR. GRAY", 1840, font(DIN_BOLD, 138), GOLD, tracking=12)
    centered_text(draw, "LIEBE", 2260, font(GEORGIA_BOLD, 270), IVORY)
    tracked_text(draw, "LAUTER.", 2640, font(ARIAL_BOLD, 250), GOLD, tracking=8)
    draw.line((1180, 3140, 3320, 3140), fill=SOFT, width=10)
    tracked_text(draw, "HEART  PRESSURE  NIGHTLIFE", 3290, font(DIN_BOLD, 90), TAUPE, tracking=10)
    save("mrs-front-liebe-lauter.png", image)


def mrs_front_signature() -> None:
    image = canvas()
    logo = load_logo(MRS_LOGO, 1060)
    x = (W - logo.width) // 2
    image.alpha_composite(logo, (x, 760))
    draw = ImageDraw.Draw(image)
    tracked_text(draw, "MRS. DR. GRAY", 2020, font(DIN_BOLD, 150), GOLD, tracking=12)
    tracked_text(draw, "NO PLASTIC RAVES", 2460, font(ARIAL_BOLD, 210), IVORY, tracking=6)
    draw.line((1080, 2930, 3420, 2930), fill=SOFT, width=10)
    tracked_text(draw, "SEXY  CLEAN  AFTERHOURS", 3070, font(DIN_BOLD, 92), TAUPE, tracking=10)
    save("mrs-front-signature.png", image)


def mrs_dress_front() -> None:
    image = canvas()
    draw = ImageDraw.Draw(image)
    tracked_text(draw, "MRS. DR. GRAY", 980, font(DIN_BOLD, 148), GOLD, tracking=12)
    centered_text(draw, "LIEBE", 1460, font(GEORGIA_BOLD, 330), IVORY)
    tracked_text(draw, "LAUTER.", 1880, font(ARIAL_BOLD, 300), GOLD, tracking=8)
    draw.arc((1450, 2300, 2250, 3100), 200, 20, fill=GOLD, width=18)
    draw.arc((2250, 2300, 3050, 3100), 160, 340, fill=GOLD, width=18)
    draw.line((1820, 2500, 2250, 2920), fill=SOFT, width=14)
    draw.line((2680, 2500, 2250, 2920), fill=SOFT, width=14)
    tracked_text(draw, "FEMININ  KLAR  NACHTTAUGLICH", 3280, font(DIN_BOLD, 92), TAUPE, tracking=10)
    save("mrs-dress-front-liebe-lauter.png", image)


def couple_front() -> None:
    image = canvas()
    dr_logo = load_logo(DR_LOGO, 760)
    mrs_logo = load_logo(MRS_LOGO, 760)
    image.alpha_composite(dr_logo, (930, 820))
    image.alpha_composite(mrs_logo, (W - 930 - mrs_logo.width, 820))
    draw = ImageDraw.Draw(image)
    draw.ellipse((1400, 930, 2300, 1830), outline=GOLD, width=16)
    draw.ellipse((2200, 930, 3100, 1830), outline=GOLD, width=16)
    centered_text(draw, "VERHEIRATET", 2260, font(GEORGIA_BOLD, 250), IVORY)
    tracked_text(draw, "MIT DEM BEAT", 2620, font(ARIAL_BOLD, 248), GOLD, tracking=8)
    tracked_text(draw, "DR. GRAY  X  MRS. DR. GRAY", 3100, font(DIN_BOLD, 96), TAUPE, tracking=10)
    save("couple-front-verheiratet.png", image)


def couple_front_two_hearts() -> None:
    image = canvas()
    dr_logo = load_logo(DR_LOGO, 720)
    mrs_logo = load_logo(MRS_LOGO, 720)
    image.alpha_composite(dr_logo, (980, 860))
    image.alpha_composite(mrs_logo, (W - 980 - mrs_logo.width, 860))
    draw = ImageDraw.Draw(image)
    draw.line((1020, 1930, 3480, 1930), fill=SOFT, width=10)
    centered_text(draw, "TWO HEARTS.", 2250, font(GEORGIA_BOLD, 250), IVORY)
    tracked_text(draw, "ONE RHYTHM.", 2610, font(ARIAL_BOLD, 250), GOLD, tracking=8)
    tracked_text(draw, "COUPLE  EDITION  TECHNO  LOVE", 3070, font(DIN_BOLD, 94), TAUPE, tracking=10)
    save("couple-front-two-hearts.png", image)


def accessory_cap() -> None:
    image = canvas()
    logo = load_logo(DR_LOGO, 1200)
    x = (W - logo.width) // 2
    image.alpha_composite(logo, (x, 980))
    draw = ImageDraw.Draw(image)
    tracked_text(draw, "DR. GRAY", 2360, font(DIN_BOLD, 150), GOLD, tracking=12)
    tracked_text(draw, "RETRO  TRUCKER  CAP", 2560, font(DIN_BOLD, 108), IVORY, tracking=10)
    tracked_text(draw, "CLEAN  FRONT  LOGO", 2870, font(DIN_BOLD, 92), TAUPE, tracking=12)
    save("accessory-dr-retro-cap.png", image)


def unisex_back_choice_sheet() -> None:
    image = canvas()
    draw = ImageDraw.Draw(image)
    tracked_text(draw, "UNISEX BACKPRINT OPTIONEN", 620, font(DIN_BOLD, 132), GOLD, tracking=10)

    dr_logo = load_logo(DR_LOGO, 980)
    mrs_logo = load_logo(MRS_LOGO, 980)
    image.alpha_composite(dr_logo, (760, 1280))
    image.alpha_composite(mrs_logo, (W - 760 - mrs_logo.width, 1280))
    draw.rounded_rectangle((620, 1120, 2080, 2880), radius=64, outline=SOFT, width=10)
    draw.rounded_rectangle((2420, 1120, 3880, 2880), radius=64, outline=SOFT, width=10)
    tracked_text(draw, "OPTION A  DR. GRAY", 3050, font(DIN_BOLD, 108), IVORY, tracking=8)
    tracked_text(draw, "OPTION B  MRS. DR. GRAY", 3240, font(DIN_BOLD, 108), GOLD, tracking=8)
    tracked_text(draw, "FRONT CLEAN  BACK WAHLWEISE", 3720, font(DIN_BOLD, 96), TAUPE, tracking=10)
    save("unisex-backprint-options.png", image)


def main() -> None:
    dr_front()
    dr_front_treibend()
    dr_front_bass()
    dr_back()
    mrs_front()
    mrs_front_liebe()
    mrs_front_signature()
    mrs_dress_front()
    couple_front()
    couple_front_two_hearts()
    accessory_cap()
    unisex_back_choice_sheet()


if __name__ == "__main__":
    main()
