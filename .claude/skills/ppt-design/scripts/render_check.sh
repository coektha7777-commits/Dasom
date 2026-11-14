#!/usr/bin/env bash
# Render a .pptx to PNGs and one contact sheet for visual QA.
# Usage: render_check.sh deck.pptx outdir [dpi]
# Then open outdir/review.png and look for: titles wrapping to 2 lines, text overflowing
# boxes, labels overlapping shapes, cut-off figures, empty slides.
# Note: LibreOffice substitutes fonts (Malgun Gothic -> WenQuanYi etc.), so leave ~10% slack.
set -euo pipefail
deck="$1"; out="$2"; dpi="${3:-50}"
rm -rf "$out"; mkdir -p "$out"
soffice --headless --convert-to pdf --outdir "$out" "$deck" >/dev/null 2>&1
pdftoppm -r "$dpi" -png "$out"/*.pdf "$out/s"
python3 - "$out" <<'EOF'
import glob, sys
from PIL import Image
out = sys.argv[1]
fs = sorted(glob.glob(f"{out}/s-*.png")); ims = [Image.open(f) for f in fs]
w, h = ims[0].size; cols = 3; rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (w * cols + 10 * (cols - 1), (h + 10) * rows), "#888")
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (w + 10), (i // cols) * (h + 10)))
sheet.save(f"{out}/review.png"); print(f"{len(ims)} slides -> {out}/review.png")
EOF
