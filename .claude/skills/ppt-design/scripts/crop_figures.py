#!/usr/bin/env python3
"""Render PDF pages and crop original figures without redrawing them.

Step 1, find figure positions (prints vertical content blocks per page, in px at --dpi):
    python3 crop_figures.py blocks paper.pdf --pages 4-9 --out work/

Step 2, crop with a JSON spec {"fig1": [page, y0, y1], ...}; whitespace is trimmed:
    python3 crop_figures.py crop paper.pdf spec.json --out work/

A contact sheet (work/sheet.png) is written after cropping: open it and check that no
axis label, legend or panel letter is cut and no caption/body text leaked in.
Requires: pdftoppm (poppler), Pillow, numpy.
"""
import argparse, json, os, subprocess, sys

import numpy as np
from PIL import Image


def render(pdf, out, dpi, first, last):
    os.makedirs(os.path.join(out, "pages"), exist_ok=True)
    cmd = ["pdftoppm", "-r", str(dpi), "-png", "-f", str(first), "-l", str(last), pdf, os.path.join(out, "pages", "p")]
    subprocess.run(cmd, check=True)


def page_path(out, page, total_digits=2):
    for d in (total_digits, 1, 3):
        p = os.path.join(out, "pages", f"p-{page:0{d}d}.png")
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"page {page} not rendered; run `blocks` for that page first")


def blocks(img, min_gap=18, min_h=40):
    a = np.array(img.convert("L")) < 200
    rows = a.sum(1) > 0
    out, start, last = [], None, 0
    for y, r in enumerate(rows):
        if r:
            start = y if start is None else start
            last = y
        elif start is not None and y - last > min_gap:
            out.append((start, last)); start = None
    if start is not None:
        out.append((start, last))
    return [b for b in out if b[1] - b[0] > min_h]


def tight(img, y0, y1, pad=8):
    a = np.array(img.convert("L").crop((0, y0, img.width, y1))) < 200
    cols, rows = np.where(a.sum(0) > 0)[0], np.where(a.sum(1) > 0)[0]
    if not len(cols):
        raise ValueError(f"empty region {y0}-{y1}")
    return img.crop((max(cols[0] - 10, 0), y0 + rows[0] - pad, min(cols[-1] + 10, img.width), y0 + rows[-1] + pad))


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("blocks"); b.add_argument("pdf"); b.add_argument("--pages", required=True)
    c = sub.add_parser("crop"); c.add_argument("pdf"); c.add_argument("spec")
    for p in (b, c):
        p.add_argument("--out", default="work"); p.add_argument("--dpi", type=int, default=200)
    a = ap.parse_args()

    if a.cmd == "blocks":
        f, _, l = a.pages.partition("-")
        f, l = int(f), int(l or f)
        render(a.pdf, a.out, a.dpi, f, l)
        for p in range(f, l + 1):
            im = Image.open(page_path(a.out, p))
            print(f"page {p} ({im.width}x{im.height}):", blocks(im))
        return

    spec = json.load(open(a.spec))
    pages = sorted({v[0] for v in spec.values()})
    render(a.pdf, a.out, a.dpi, pages[0], pages[-1])
    crops = []
    for name, (p, y0, y1) in spec.items():
        im = tight(Image.open(page_path(a.out, p)), y0, y1)
        im.save(os.path.join(a.out, f"{name}.png")); crops.append(im)
        print(f"{name}: {im.size}")
    cols, cell = 3, 900
    sheet = Image.new("RGB", (cols * cell, ((len(crops) + cols - 1) // cols) * cell), "white")
    for i, im in enumerate(crops):
        t = im.copy(); t.thumbnail((cell - 10, cell - 10)); sheet.paste(t, ((i % cols) * cell, (i // cols) * cell))
    sheet.save(os.path.join(a.out, "sheet.png"))
    print("contact sheet:", os.path.join(a.out, "sheet.png"))


if __name__ == "__main__":
    sys.exit(main())
