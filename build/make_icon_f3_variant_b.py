#!/usr/bin/env python3
"""Refine concept F: headphones + play, with the green circle enlarged so it
reads as the head of a person wearing the headphones."""
import math
from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
ACCENT = (62, 207, 142, 255)
CREAM = (232, 236, 234, 255)

def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m

def vgradient(size, top, bottom):
    g = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    d = ImageDraw.Draw(g)
    for y in range(size):
        t = y / (size - 1)
        px = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(4))
        d.line([(0, y), (size, y)], fill=px)
    return g

def base_dark_square(size, radius_ratio=0.225):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = vgradient(size, (17, 21, 26, 255), (9, 11, 12, 255))
    mask = rounded_mask(size, int(size * radius_ratio))
    img.paste(grad, (0, 0), mask)
    return img

def icon_f2(size=SIZE):
    img = base_dark_square(size)
    draw = ImageDraw.Draw(img, "RGBA")

    cx = size * 0.5
    GLYPH_SCALE = 1.2 * 1.1  # whole mark (headphones + head + play) scaled up, same center
    band_w = size * 0.05 * GLYPH_SCALE
    ear_w, ear_h = size * 0.135 * GLYPH_SCALE, size * 0.20 * GLYPH_SCALE

    # Ear-cup placement radius: fixed independently of the circle's own size,
    # so shrinking the circle opens up a gap instead of dragging the cups in.
    head_r_cups = ear_h * 0.44 * 1.5 * 1.1 * 1.1 * 1.12 * 1.2 * 0.85
    head_cy = size * 0.5
    ear_y = head_cy
    ear_dx = head_r_cups + ear_w / 2
    for sign in (-1, 1):
        ex = cx + sign * ear_dx
        draw.rounded_rectangle(
            [ex - ear_w / 2, ear_y - ear_h / 2, ex + ear_w / 2, ear_y + ear_h / 2],
            radius=ear_w / 2, fill=CREAM
        )

    # Headband arc: solved so its two ends land exactly on the top of each
    # ear cup, then extended a bit further round so it tucks into the cup's
    # rounded top with no gap (no dark notch at the join — same fill color).
    end_angle = math.radians(18)
    ear_top_y = ear_y - ear_h / 2
    r_arc = ear_dx / math.cos(end_angle)
    cy_arc = ear_top_y + r_arc * math.sin(end_angle)
    draw.arc([cx - r_arc, cy_arc - r_arc, cx + r_arc, cy_arc + r_arc],
              start=185, end=355, fill=CREAM, width=int(band_w))
    # Round caps for the arc's stroke ends (PIL's arc leaves flat/square
    # ends, which look notched against the curved cup) — patch with a disc.
    for theta_deg in (185, 355):
        theta = math.radians(theta_deg)
        ex = cx + r_arc * math.cos(theta)
        ey = cy_arc + r_arc * math.sin(theta)
        cr = band_w / 2
        draw.ellipse([ex - cr, ey - cr, ex + cr, ey + cr], fill=CREAM)

    # The green circle: a touch smaller again, leaving a visible gap to
    # the ear cups on both sides.
    head_r = head_r_cups * 0.86
    draw.ellipse([cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r], fill=ACCENT)

    # Play triangle on the "face" — plain triangle, no rounded tips
    tri_h = head_r * 0.75
    tri_w = tri_h * 0.86
    fcx, fcy = cx, head_cy
    p1 = (fcx - tri_w * 0.32, fcy - tri_h / 2)
    p2 = (fcx - tri_w * 0.32, fcy + tri_h / 2)
    p3 = (fcx + tri_w * 0.66, fcy)
    draw.polygon([p1, p2, p3], fill=(9, 12, 12, 255))

    return img

def main():
    icon = icon_f2()
    icon.save("/home/claude/simple-player/build/icon_variant_b_1024.png")

    sizes = [16, 24, 32, 48, 64, 128, 256]
    icons = [icon.resize((s, s), Image.LANCZOS) for s in sizes]
    icons[-1].save("/home/claude/simple-player/build/icon_variant_b.ico", sizes=[(s, s) for s in sizes])

    # Preview on light + dark
    preview = Image.new("RGBA", (1040, 360), (30, 30, 34, 255))
    pd = ImageDraw.Draw(preview)
    pd.rectangle([0, 0, 1040, 180], fill=(235, 235, 238, 255))
    x = 20
    for s in [256, 128, 64, 32, 16]:
        icon_s = icon.resize((s, s), Image.LANCZOS)
        y_light = 90 - s // 2
        y_dark = 270 - s // 2
        preview.alpha_composite(icon_s, (x, y_light))
        preview.alpha_composite(icon_s, (x, y_dark))
        x += s + 40
    preview.convert("RGB").save("/home/claude/simple-player/build/icon_variant_b_preview.png")
    print("done")

if __name__ == "__main__":
    main()
