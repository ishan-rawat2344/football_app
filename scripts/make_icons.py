"""Draw Touchline's PNG app icons (same design as public/favicon.svg).

Run from the repo root:  python3 scripts/make_icons.py
Needs Pillow (pip install pillow). Writes into public/icons/.

The PNGs are full-bleed squares with no rounded corners, because iOS and
Android apply their own icon mask.
"""
from pathlib import Path

from PIL import Image, ImageDraw

NAVY = (10, 31, 68)
RED = (230, 57, 62)
WHITE = (255, 255, 255)
LINE = (145, 154, 171)  # white at 55% over navy

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
SUPER = 1024  # draw large, then downscale for smooth edges


def stamp_path(draw, points, width, color, s):
    """Stroke a polyline with round caps and joins by stamping discs."""
    r = width * s / 2
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        steps = max(2, int(((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5 * s / 2))
        for i in range(steps + 1):
            t = i / steps
            x = (x0 + (x1 - x0) * t) * s
            y = (y0 + (y1 - y0) * t) * s
            draw.ellipse([x - r, y - r, x + r, y + r], fill=color)


def cubic(p0, p1, p2, p3, n=48):
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def draw_mark(size, content_scale=1.0):
    img = Image.new("RGB", (SUPER, SUPER), NAVY)
    d = ImageDraw.Draw(img)
    s = SUPER / 64 * content_scale
    off = SUPER * (1 - content_scale) / 2

    def tx(pts):
        return [(x + off / s, y + off / s) for x, y in pts]

    # touchline (square caps)
    d.rectangle(
        [(12 - 1.5) * s + off, 8 * s + off, (12 + 1.5) * s + off, 56 * s + off], fill=LINE
    )
    # the run: up the line, then curve inside (M22 46 V36 c0-9 6-14 15-14 h4)
    run = [(22, 46), (22, 36)] + cubic((22, 36), (22, 27), (28, 22), (37, 22))[1:] + [(41, 22)]
    stamp_path(d, tx(run), 6, RED, s)
    # arrowhead
    stamp_path(d, tx([(37, 14), (46, 22), (37, 30)]), 6, RED, s)
    # the ball
    cx, cy, r = 22 * s + off, 53 * s + off, 5.5 * s
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)

    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    draw_mark(192).save(OUT / "icon-192.png", optimize=True)
    draw_mark(512).save(OUT / "icon-512.png", optimize=True)
    draw_mark(180).save(OUT / "apple-touch-icon.png", optimize=True)
    # Maskable icons must keep content inside the central ~80% circle.
    draw_mark(512, content_scale=0.72).save(OUT / "icon-maskable-512.png", optimize=True)
    print("Wrote icons to", OUT)


if __name__ == "__main__":
    main()
