#!/usr/bin/env bash
# Convert admission-form.pdf → JPEG at 700 DPI (print / WhatsApp quality).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PDF="$DIR/admission-form.pdf"
OUT="$DIR/admission-form-700dpi.jpg"
DPI=700

python3 - <<PY
import fitz
doc = fitz.open("$PDF")
zoom = $DPI / 72.0
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    out = "$OUT" if doc.page_count == 1 else "$OUT".replace(".jpg", f"-page{i+1}.jpg")
    pix.save(out, jpg_quality=95)
    print(f"Saved {out} ({pix.width}x{pix.height}px @ {$DPI}dpi)")
PY
