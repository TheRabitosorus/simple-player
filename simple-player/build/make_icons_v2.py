#!/usr/bin/env python3
"""Six distinct icon concepts for Simple Player, rendered at high res and
composited into one contact-sheet preview, each on both dark and light
backgrounds so they can be judged on a Windows taskbar/Start menu."""
from PIL import Image, ImageDraw, ImageFilter
import math

SIZE = 512
ACCENT = (62, 207, 142, 255)       # #3ecf8e
ACCENT_SOFT = (62, 207, 142, 140)
DARK = (14, 17, 20, 255)
DARK2 = (9, 11, 12, 255)
CREAM = (242, 245, 243, 255)

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

def base_dark_square(size=SIZE, radius_ratio=0.225):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = vgradient(size, (17, 21, 26, 255), (9, 11, 12, 255))
    mask = rounded_mask(size, int(size * radius_ratio))
    img.paste(grad, (0, 0), mask)
    return img

def circle_mask(size, pad=0):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse([pad, pad, size - 1 - pad, size - 1 - pad], fill=255)
    return m

# ---------- Concept A: rounded-square play triangle (refined) ----------
def icon_a(size=SIZE):
    img = base_dark_square(size)
    draw = ImageDraw.Draw(img, "RGBA")
    tri_h = size * 0.42
    tri_w = tri_h * 0.88
    cx, cy = size * 0.47, size * 0.5
    p1 = (cx - tri_w * 0.4, cy - tri_h / 2)
    p2 = (cx - tri_w * 0.4, cy + tri_h / 2)
    p3 = (cx + tri_w * 0.62, cy)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.polygon([p1, p2, p3], fill=ACCENT)
    r = size * 0.03
    for p in (p1, p2, p3):
        d.ellipse([p[0]-r, p[1]-r, p[0]+r, p[1]+r], fill=ACCENT)
    img.alpha_composite(layer)
    return img

# ---------- Concept B: circular vinyl record with play notch ----------
def icon_b(size=SIZE):
    img = base_dark_square(size)
    cx, cy = size / 2, size / 2
    disc = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    dd = ImageDraw.Draw(disc)
    r_outer = size * 0.33
    dd.ellipse([cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer], fill=(230, 234, 232, 255))
    for rr, w, alpha in [(r_outer*0.78, size*0.012, 60), (r_outer*0.6, size*0.012, 50), (r_outer*0.42, size*0.012, 45)]:
        dd.ellipse([cx-rr, cy-rr, cx+rr, cy+rr], outline=(20, 24, 26, alpha), width=max(1,int(w)))
    dd.ellipse([cx - r_outer*0.22, cy - r_outer*0.22, cx + r_outer*0.22, cy + r_outer*0.22], fill=ACCENT)
    tri = r_outer * 0.11
    p1 = (cx - tri*0.4, cy - tri*0.62)
    p2 = (cx - tri*0.4, cy + tri*0.62)
    p3 = (cx + tri*0.75, cy)
    dd.polygon([p1, p2, p3], fill=(10, 13, 13, 255))
    img.alpha_composite(disc)
    return img

# ---------- Concept C: sound-wave bars ----------
def icon_c(size=SIZE):
    img = base_dark_square(size)
    draw = ImageDraw.Draw(img, "RGBA")
    heights = [0.28, 0.5, 0.74, 0.46, 0.3]
    n = len(heights)
    bar_w = size * 0.09
    gap = size * 0.05
    total_w = n * bar_w + (n - 1) * gap
    x0 = (size - total_w) / 2
    cy = size / 2
    for i, h in enumerate(heights):
        bh = size * h
        x = x0 + i * (bar_w + gap)
        color = ACCENT if i in (1, 2, 3) else (ACCENT[0], ACCENT[1], ACCENT[2], 170)
        draw.rounded_rectangle([x, cy - bh/2, x + bar_w, cy + bh/2], radius=bar_w/2, fill=color)
    return img

# ---------- Concept D: minimal flat play button, no extras ----------
def icon_d(size=SIZE):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = rounded_mask(size, int(size * 0.225))
    flat = Image.new("RGBA", (size, size), ACCENT)
    img.paste(flat, (0, 0), mask)
    draw = ImageDraw.Draw(img, "RGBA")
    tri_h = size * 0.38
    tri_w = tri_h * 0.86
    cx, cy = size * 0.47, size * 0.5
    p1 = (cx - tri_w * 0.4, cy - tri_h / 2)
    p2 = (cx - tri_w * 0.4, cy + tri_h / 2)
    p3 = (cx + tri_w * 0.62, cy)
    draw.polygon([p1, p2, p3], fill=(8, 10, 10, 255))
    return img

# ---------- Concept E: "S" monogram as a playful ribbon/play shape ----------
def icon_e(size=SIZE):
    img = base_dark_square(size)
    draw = ImageDraw.Draw(img, "RGBA")
    cx, cy = size/2, size/2
    r = size * 0.26
    # Two overlapping play-triangle shapes forming an S-like swoosh
    for ang_off, alpha in [(0, 255), (180, 140)]:
        layer = Image.new("RGBA", (size, size), (0,0,0,0))
        ld = ImageDraw.Draw(layer)
        rad = math.radians(ang_off)
        ox, oy = cx + r*0.35*math.cos(rad), cy + r*0.35*math.sin(rad)
        tri_h = size*0.30
        tri_w = tri_h*0.86
        p1 = (ox - tri_w*0.4, oy - tri_h/2)
        p2 = (ox - tri_w*0.4, oy + tri_h/2)
        p3 = (ox + tri_w*0.62, oy)
        col = (ACCENT[0], ACCENT[1], ACCENT[2], alpha)
        ld.polygon([p1, p2, p3], fill=col)
        layer = layer.rotate(ang_off*0 , resample=Image.BICUBIC)
        img.alpha_composite(layer)
    return img

# ---------- Concept F: headphone arc + play dot ----------
def icon_f(size=SIZE):
    img = base_dark_square(size)
    draw = ImageDraw.Draw(img, "RGBA")
    cx, cy = size/2, size*0.46
    r = size*0.26
    draw.arc([cx-r, cy-r, cx+r, cy+r], start=200, end=340, fill=(230,234,232,255), width=int(size*0.045))
    ear_w, ear_h = size*0.11, size*0.16
    for sign in (-1, 1):
        ex = cx + sign*r*math.cos(math.radians(200 if sign<0 else -20))
        ey = cy + r*math.sin(math.radians(200 if sign<0 else -20))
    # simpler: two rounded rects at the arc ends
    left_x = cx - r*math.cos(math.radians(20))
    right_x = cx + r*math.cos(math.radians(20))
    y_ends = cy + r*math.sin(math.radians(20))
    draw.rounded_rectangle([left_x-ear_w/2, y_ends-ear_h/2, left_x+ear_w/2, y_ends+ear_h/2], radius=ear_w/2, fill=(230,234,232,255))
    draw.rounded_rectangle([right_x-ear_w/2, y_ends-ear_h/2, right_x+ear_w/2, y_ends+ear_h/2], radius=ear_w/2, fill=(230,234,232,255))
    dotr = size*0.1
    draw.ellipse([cx-dotr, cy+size*0.02-dotr, cx+dotr, cy+size*0.02+dotr], fill=ACCENT)
    tri = dotr*0.65
    p1=(cx-tri*0.3, cy+size*0.02-tri*0.55); p2=(cx-tri*0.3, cy+size*0.02+tri*0.55); p3=(cx+tri*0.7, cy+size*0.02)
    draw.polygon([p1,p2,p3], fill=(8,10,10,255))
    return img

def contact_sheet(icons, labels):
    cols = 3
    rows = 2
    cell = 300
    pad = 24
    sheet_w = cols*cell + (cols+1)*pad
    sheet_h = rows*(cell+40) + (rows+1)*pad
    sheet = Image.new("RGB", (sheet_w, sheet_h), (235, 235, 238))
    for i, (icon, label) in enumerate(zip(icons, labels)):
        col = i % cols
        row = i // cols
        x = pad + col*(cell+pad)
        y = pad + row*(cell+40+pad)
        thumb = icon.resize((220,220), Image.LANCZOS)
        # checker/dark tile behind so transparency + dark bg icons read correctly
        tile = Image.new("RGBA", (240,240), (40,44,46,255))
        tile.alpha_composite(thumb, (10,10))
        sheet.paste(tile.convert("RGB"), (x + (cell-240)//2, y))
        d = ImageDraw.Draw(sheet)
        d.text((x+cell//2-10, y+cell+6), label, fill=(30,30,30))
    sheet.save("/home/claude/simple-player/build/icon_options.png")

def main():
    icons = [icon_a(), icon_b(), icon_c(), icon_d(), icon_e(), icon_f()]
    labels = ["A: Play triangle", "B: Vinyl record", "C: Sound bars", "D: Flat play", "E: Swoosh", "F: Headphones"]
    for i, icon in zip("ABCDEF", icons):
        icon.save(f"/home/claude/simple-player/build/icon_option_{i}.png")
    contact_sheet(icons, labels)
    print("done")

if __name__ == "__main__":
    main()
