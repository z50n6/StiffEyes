#!/usr/bin/env python3
"""Export 绷着脸 extension icons (Pillow, no Cairo)."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "icons"

TEAL = (15, 118, 110)       # #0f766e
WHITE = (250, 250, 250)     # #fafafa
DARK = (24, 24, 27)         # #18181b

SIZES = (16, 48, 128, 256)


def draw_icon(size: int, dark: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = max(1, int(size * 0.06))
    r = max(2, int(size * 0.22))
    bg = DARK if dark else TEAL
    fg = TEAL if dark else WHITE

    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=r, fill=bg)

    s = size / 128.0
    sw = max(1, round(5 * s))
    dot_r = max(1, round(5.5 * s))

    # 16px：只保留「两眼 + 直线嘴」，避免取景框糊成一团
    if size >= 32:
        inset = 28 * s
        arm = 8 * s
        corners = [
            (inset, inset + arm, inset, inset, inset + arm, inset),
            (size - inset - arm, inset, size - inset, inset, size - inset, inset + arm),
            (size - inset, size - inset - arm, size - inset, size - inset, size - inset - arm, size - inset),
            (inset + arm, size - inset, inset, size - inset, inset, size - inset - arm),
        ]
        for x1, y1, x2, y2, x3, y3 in corners:
            d.line([(x1, y1), (x2, y2), (x3, y3)], fill=fg, width=sw)

    for cx in (46 * s, 82 * s):
        d.ellipse(
            [cx - dot_r, 54 * s - dot_r, cx + dot_r, 54 * s + dot_r],
            fill=fg,
        )

    y = 78 * s
    d.line([(40 * s, y), (88 * s, y)], fill=fg, width=sw)

    return img


def main():
    ICONS.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        out = ICONS / f"icon{size}.png"
        draw_icon(size).save(out, "PNG")
        print(f"OK {out}")
        if size <= 128:
            legacy = ICONS / f"icon-{size}.png"
            draw_icon(size).save(legacy, "PNG")
    # README / dark preview
    draw_icon(256, dark=True).save(ICONS / "logo-dark-preview.png", "PNG")
  # save main svg companion as png for showcase
    draw_icon(128).save(ICONS / "logo-preview.png", "PNG")
    print("Done.")


if __name__ == "__main__":
    main()
