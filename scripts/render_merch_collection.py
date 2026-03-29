from __future__ import annotations

from pathlib import Path
from typing import Literal

from PIL import Image, ImageDraw, ImageFont


ROOT = Path("/Users/martendr.gray/Documents/New project/DJ-Website")
OUTPUT_DIR = ROOT / "store-assets" / "png"
PREVIEW_DIR = ROOT / "store-assets" / "previews"

CANVAS_W = 4500
CANVAS_H = 5400
GOLD = "#f5c84c"
IVORY = "#f2efe8"
TAUPE = "#bba984"
SOFT = "#7c725e"
PREVIEW_BG = "#070707"

GEORGIA_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
GEORGIA = "/System/Library/Fonts/Supplemental/Georgia.ttf"
ARIAL_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
DIN_BOLD = "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf"

DR_LOGO = ROOT / "drgray-logo.jpg"
MRS_LOGO = ROOT / "mrsdrgray-logo.png"


DESIGNS = [
    {
        "slug": "design-treibend-roh-ehrlich",
        "collection": "Maenner",
        "logo_mode": "dr",
        "headline": "TREIBEND.",
        "accent": "ROH. EHRLICH.",
        "subline": "KOELN CLUB NAECHTE FUER LEUTE OHNE FILTER",
        "style": "bars",
    },
    {
        "slug": "design-kein-mainstream",
        "collection": "Maenner",
        "logo_mode": "dr",
        "headline": "KEIN",
        "accent": "MAINSTREAM.",
        "subline": "FUER RAVER MIT HALTUNG UND ZU WENIG GEDULD FUER BELIEBIG",
        "style": "frame",
    },
    {
        "slug": "design-bass-im-blut",
        "collection": "Maenner",
        "logo_mode": "dr",
        "headline": "BASS",
        "accent": "IM BLUT.",
        "subline": "TREIBEND, DUNKEL, DIREKT NACH VORNE",
        "style": "pulse",
    },
    {
        "slug": "design-mrs-dr-gray",
        "collection": "Damen",
        "logo_mode": "mrs",
        "headline": "MRS.",
        "accent": "DR. GRAY",
        "subline": "STARK, SAUBER, UNUEBERSEHBAR",
        "style": "elegant-frame",
    },
    {
        "slug": "design-zu-wild-fuer-leise",
        "collection": "Damen",
        "logo_mode": "mrs",
        "headline": "ZU WILD",
        "accent": "FUER LEISE.",
        "subline": "MEHR DRUCK AUF DEM FLOOR ALS IM SMALLTALK",
        "style": "diagonal",
    },
    {
        "slug": "design-liebe-lauter",
        "collection": "Damen",
        "logo_mode": "mrs",
        "headline": "LIEBE",
        "accent": "LAUTER.",
        "subline": "TECHNO MIT HERZ, ABER NICHT BRAV",
        "style": "heartwave",
    },
    {
        "slug": "design-verheiratet-mit-dem-beat",
        "collection": "Couple",
        "logo_mode": "pair",
        "headline": "VERHEIRATET",
        "accent": "MIT DEM BEAT",
        "subline": "DR. GRAY X MRS. DR. GRAY",
        "style": "rings",
    },
    {
        "slug": "design-two-hearts-one-rhythm",
        "collection": "Couple",
        "logo_mode": "pair",
        "headline": "TWO HEARTS",
        "accent": "ONE RHYTHM",
        "subline": "FOR DUOS, LOVERS AND LATE-NIGHT SOULMATES",
        "style": "hearts",
    },
    {
        "slug": "design-his-beat-her-vibe",
        "collection": "Couple",
        "logo_mode": "pair",
        "headline": "HIS BEAT",
        "accent": "HER VIBE",
        "subline": "A PAIR SET WITH ATTITUDE, NOT KITSCH",
        "style": "split",
    },
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def fit_logo(image: Image.Image, target_height: int) -> Image.Image:
    scale = target_height / image.height
    new_size = (int(image.width * scale), target_height)
    return image.resize(new_size, Image.Resampling.LANCZOS)


def paste_center(base: Image.Image, overlay: Image.Image, x_center: int, y_top: int) -> tuple[int, int, int, int]:
    x = x_center - overlay.width // 2
    base.alpha_composite(overlay, (x, y_top))
    return (x, y_top, x + overlay.width, y_top + overlay.height)


def draw_centered_text(draw: ImageDraw.ImageDraw, text: str, y: int, fnt: ImageFont.FreeTypeFont, fill: str) -> tuple[int, int, int, int]:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (CANVAS_W - w) // 2
    draw.text((x, y), text, font=fnt, fill=fill)
    return (x, y, x + w, y + h)


def draw_tracking_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    fnt: ImageFont.FreeTypeFont,
    fill: str,
    tracking: int = 0,
) -> tuple[int, int, int, int]:
    widths = []
    height = 0
    for char in text:
        bbox = draw.textbbox((0, 0), char, font=fnt)
        widths.append(bbox[2] - bbox[0])
        height = max(height, bbox[3] - bbox[1])
    total_width = sum(widths) + tracking * max(len(text) - 1, 0)
    x = (CANVAS_W - total_width) // 2
    cursor = x
    for char, char_w in zip(text, widths):
        draw.text((cursor, y), char, font=fnt, fill=fill)
        cursor += char_w + tracking
    return (x, y, x + total_width, y + height)


def build_base_canvas() -> Image.Image:
    return Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))


def draw_style(draw: ImageDraw.ImageDraw, style: str, top: int, bottom: int) -> None:
    if style == "bars":
        bar_xs = [1100, 1530, 1960, 2390, 2820, 3250]
        heights = [250, 520, 760, 610, 390, 250]
        for x, h in zip(bar_xs, heights):
            draw.rounded_rectangle((x, top, x + 120, top + h), radius=40, fill=GOLD)
        draw.line((970, bottom, 3530, bottom), fill=SOFT, width=10)
    elif style == "frame":
        draw.rounded_rectangle((720, top + 80, 3780, bottom - 120), radius=90, outline=GOLD, width=18)
        draw.line((950, top + 350, 3550, top + 350), fill=SOFT, width=8)
        draw.line((950, bottom - 420, 3550, bottom - 420), fill=SOFT, width=8)
    elif style == "pulse":
        points = [
            (930, top + 390),
            (1380, top + 390),
            (1700, top + 390),
            (1860, top + 220),
            (2050, top + 600),
            (2250, top + 160),
            (2480, top + 500),
            (2730, top + 390),
            (3560, top + 390),
        ]
        draw.line(points, fill=GOLD, width=22, joint="curve")
        draw.arc((980, bottom - 820, 1940, bottom + 140), 180, 350, fill=SOFT, width=10)
        draw.arc((2560, bottom - 820, 3520, bottom + 140), 190, 0, fill=SOFT, width=10)
    elif style == "elegant-frame":
        draw.rounded_rectangle((860, top + 40, 3640, bottom - 40), radius=70, outline=SOFT, width=10)
        draw.line((1150, top + 280, 3350, top + 280), fill=GOLD, width=8)
        draw.line((1150, bottom - 260, 3350, bottom - 260), fill=GOLD, width=8)
    elif style == "diagonal":
        draw.line((850, bottom - 180, 1580, top + 160), fill=SOFT, width=18)
        draw.line((2940, bottom - 240, 3650, top + 100), fill=GOLD, width=18)
        draw.rounded_rectangle((1040, top + 100, 3460, bottom - 100), radius=80, outline=SOFT, width=12)
    elif style == "heartwave":
        draw.line((980, top + 250, 1690, top + 250), fill=SOFT, width=12)
        draw.line((2810, top + 250, 3520, top + 250), fill=SOFT, width=12)
        heart = [(2050, top + 350), (1820, top + 90), (1650, top + 280), (2250, top + 760), (2850, top + 280), (2680, top + 90), (2450, top + 350)]
        draw.line(heart, fill=GOLD, width=18, joint="curve")
    elif style == "rings":
        draw.ellipse((1180, top + 40, 2240, top + 1100), outline=GOLD, width=18)
        draw.ellipse((2260, top + 40, 3320, top + 1100), outline=GOLD, width=18)
        draw.line((2020, top + 570, 2480, top + 570), fill=IVORY, width=14)
    elif style == "hearts":
        draw.arc((1100, top + 30, 2080, top + 1030), 190, 15, fill=GOLD, width=18)
        draw.arc((2420, top + 30, 3400, top + 1030), 165, 350, fill=GOLD, width=18)
        draw.line((1880, top + 230, 2250, top + 660), fill=SOFT, width=16)
        draw.line((2620, top + 230, 2250, top + 660), fill=SOFT, width=16)
    elif style == "split":
        draw.line((2250, top + 80, 2250, bottom - 80), fill=SOFT, width=10)
        draw.rounded_rectangle((900, top + 70, 2060, top + 930), radius=60, outline=GOLD, width=12)
        draw.rounded_rectangle((2440, top + 70, 3600, top + 930), radius=60, outline=GOLD, width=12)


def load_logo(kind: Literal["dr", "mrs"]) -> Image.Image:
    path = DR_LOGO if kind == "dr" else MRS_LOGO
    image = Image.open(path).convert("RGBA")
    return fit_logo(image, 980)


def render_logo_block(canvas: Image.Image, mode: str, style: str) -> int:
    top = 460
    bottom = 1720
    draw = ImageDraw.Draw(canvas)
    draw_style(draw, style, top, bottom)

    if mode == "dr":
        logo = load_logo("dr")
        paste_center(canvas, logo, CANVAS_W // 2, 520)
    elif mode == "mrs":
        logo = load_logo("mrs")
        paste_center(canvas, logo, CANVAS_W // 2, 520)
    elif mode == "pair":
        dr_logo = fit_logo(Image.open(DR_LOGO).convert("RGBA"), 860)
        mrs_logo = fit_logo(Image.open(MRS_LOGO).convert("RGBA"), 860)
        canvas.alpha_composite(dr_logo, (1120, 610))
        canvas.alpha_composite(mrs_logo, (CANVAS_W - 1120 - mrs_logo.width, 610))
    return bottom + 120


def render_design(config: dict[str, str]) -> Image.Image:
    canvas = build_base_canvas()
    start_y = render_logo_block(canvas, config["logo_mode"], config["style"])
    draw = ImageDraw.Draw(canvas)

    small_caps = font(DIN_BOLD, 110)
    serif_head = font(GEORGIA_BOLD, 360 if len(config["headline"]) < 12 else 300)
    serif_head_sm = font(GEORGIA_BOLD, 240)
    sans_accent = font(ARIAL_BOLD, 330 if len(config["accent"]) < 13 else 285)
    sub_font = font(DIN_BOLD, 104)
    footer_font = font(ARIAL_BOLD, 86)

    draw_tracking_text(draw, config["collection"].upper(), start_y, small_caps, TAUPE, tracking=16)
    y = start_y + 230
    head_font = serif_head if config["logo_mode"] != "pair" else serif_head_sm
    draw_centered_text(draw, config["headline"], y, head_font, IVORY)
    y += 440 if config["logo_mode"] != "pair" else 330
    accent_font = sans_accent if config["logo_mode"] != "pair" else font(ARIAL_BOLD, 240)
    draw_tracking_text(draw, config["accent"], y, accent_font, GOLD, tracking=6)
    y += 520 if config["logo_mode"] != "pair" else 420
    draw_tracking_text(draw, config["subline"], y, sub_font, TAUPE, tracking=7)

    footer_y = 4880
    draw.line((980, footer_y - 130, 3520, footer_y - 130), fill=SOFT, width=8)
    draw_tracking_text(draw, "DR. GRAY  •  MRS. DR. GRAY", footer_y, footer_font, IVORY, tracking=10)
    draw_tracking_text(draw, "TECHNO  •  MERCH  •  SCENE", footer_y + 130, small_caps, GOLD, tracking=10)
    return canvas


def export_preview(images: list[tuple[str, Image.Image]]) -> None:
    cols = 3
    thumb_w = 760
    thumb_h = 912
    gap = 80
    padding = 90
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new(
        "RGBA",
        (padding * 2 + cols * thumb_w + (cols - 1) * gap, padding * 2 + rows * (thumb_h + 130) + (rows - 1) * gap),
        PREVIEW_BG,
    )
    draw = ImageDraw.Draw(sheet)
    title_font = font(ARIAL_BOLD, 56)
    for index, (label, image) in enumerate(images):
        row = index // cols
        col = index % cols
        x = padding + col * (thumb_w + gap)
        y = padding + row * (thumb_h + 130 + gap)
        framed = Image.new("RGBA", (thumb_w, thumb_h), PREVIEW_BG)
        thumbnail = image.copy()
        thumbnail.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        px = (thumb_w - thumbnail.width) // 2
        py = (thumb_h - thumbnail.height) // 2
        framed.alpha_composite(thumbnail, (px, py))
        sheet.alpha_composite(framed, (x, y))
        draw.rounded_rectangle((x, y, x + thumb_w, y + thumb_h), radius=40, outline="#1a1a1a", width=6)
        draw.text((x, y + thumb_h + 24), label.replace("design-", "").replace("-", " ").upper(), font=title_font, fill=IVORY)
    sheet.save(PREVIEW_DIR / "collection-preview.png")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    rendered: list[tuple[str, Image.Image]] = []
    for config in DESIGNS:
        image = render_design(config)
        image.save(OUTPUT_DIR / f"{config['slug']}.png", dpi=(300, 300))
        rendered.append((config["slug"], image))

    export_preview(rendered)


if __name__ == "__main__":
    main()
