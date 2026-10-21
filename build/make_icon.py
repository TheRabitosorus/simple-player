#!/usr/bin/env python3
"""Generate the Simple Player app icon (rounded dark square, green play mark)
at high resolution, then export PNG previews and a multi-size .ico for
electron-builder."""
import math
from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
BG_TOP = (17, 21, 26, 255)      # #11151a
BG_BOTTOM = (9, 11, 12, 255)    # #090b0c
ACCENT = (62, 207, 142, 255)    # #3ecf8e (matches the app's accent color)
ACCENT_DIM = (62, 207, 142, 60)

def rounded_rect_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask

def main():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    # Background: vertical gradient, clipped to a rounded square
    grad = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    gd = ImageDraw.Draw(grad)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * t)
        g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * t)
        b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * t)
        gd.line([(0, y), (SIZE, y)], fill=(r, g, b, 255))
    mask = rounded_rect_mask(SIZE, radius=int(SIZE * 0.225))
    img.paste(grad, (0, 0), mask)

    draw = ImageDraw.Draw(img, "RGBA")

    # Subtle swoosh arc (hints at the swipe gesture), behind the play mark
    swoosh = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(swoosh)
    cx, cy = SIZE * 0.50, SIZE * 0.52
    for i, (rad, width, alpha) in enumerate([
        (SIZE * 0.40, SIZE * 0.028, 70),
        (SIZE * 0.465, SIZE * 0.024, 45),
    ]):
        bbox = [cx - rad, cy - rad, cx + rad, cy + rad]
        sd.arc(bbox, start=200, end=320, fill=(62, 207, 142, alpha), width=int(width))
    swoosh = swoosh.filter(ImageFilter.GaussianBlur(SIZE * 0.004))
    img.alpha_composite(swoosh)

    # Play triangle, slightly rounded corners via polygon + corner circles
    tri_h = SIZE * 0.40
    tri_w = tri_h * 0.86
    cx, cy = SIZE * 0.47, SIZE * 0.5
    p1 = (cx - tri_w * 0.42, cy - tri_h / 2)
    p2 = (cx - tri_w * 0.42, cy + tri_h / 2)
    p3 = (cx + tri_w * 0.62, cy)

    tri_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    td = ImageDraw.Draw(tri_layer)
    td.polygon([p1, p2, p3], fill=ACCENT)
    corner_r = SIZE * 0.028
    for (x, y) in [p1, p2, p3]:
        td.ellipse([x - corner_r, y - corner_r, x + corner_r, y + corner_r], fill=ACCENT)
    # soft drop shadow for the triangle
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd2 = ImageDraw.Draw(shadow)
    off = SIZE * 0.012
    sd2.polygon([(p1[0] + off, p1[1] + off), (p2[0] + off, p2[1] + off), (p3[0] + off, p3[1] + off)],
                fill=(0, 0, 0, 140))
    shadow = shadow.filter(ImageFilter.GaussianBlur(SIZE * 0.02))
    img.alpha_composite(shadow)
    img.alpha_composite(tri_layer)

    # Inner rim highlight for a bit of depth
    rim = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rim)
    rd.rounded_rectangle([SIZE * 0.015, SIZE * 0.015, SIZE - SIZE * 0.015, SIZE - SIZE * 0.015],
                          radius=int(SIZE * 0.21), outline=(255, 255, 255, 18), width=int(SIZE * 0.006))
    img.alpha_composite(rim)

    img.save("/home/claude/simple-player/build/icon_source_1024.png")

    # Export the Windows multi-size .ico
    sizes = [16, 24, 32, 48, 64, 128, 256]
    icons = [img.resize((s, s), Image.LANCZOS) for s in sizes]
    icons[-1].save("/home/claude/simple-player/build/icon.ico", sizes=[(s, s) for s in sizes])

    # Export a 512 PNG (tray icon source / Linux / previews)
    img.resize((512, 512), Image.LANCZOS).save("/home/claude/simple-player/build/icon.png")

    # Composite a quick preview grid (how it looks at a few real sizes, on light & dark)
    preview = Image.new("RGBA", (1040, 360), (30, 30, 34, 255))
    pd = ImageDraw.Draw(preview)
    pd.rectangle([0, 0, 1040, 180], fill=(235, 235, 238, 255))  # light half
    x = 20
    for s in [256, 128, 64, 32, 16]:
        icon_s = img.resize((s, s), Image.LANCZOS)
        y_light = 90 - s // 2
        y_dark = 270 - s // 2
        preview.alpha_composite(icon_s, (x, y_light))
        preview.alpha_composite(icon_s, (x, y_dark))
        x += s + 40
    preview.convert("RGB").save("/home/claude/simple-player/build/icon_preview.png")

    print("done")

if __name__ == "__main__":
    main()
