#!/usr/bin/env bash
# Build fee-structure-700dpi.jpg from fee-structure.pdf (WhatsApp / print).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PDF="$DIR/fee-structure.pdf"
OUT="$DIR/fee-structure-700dpi.jpg"
DPI=700

if [[ ! -f "$PDF" ]]; then
  echo "Missing $PDF — run ./export-fee-structure-pdf.sh first." >&2
  exit 1
fi

python3 - <<PY
import fitz
doc = fitz.open("$PDF")
zoom = $DPI / 72.0
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    out = "$OUT" if doc.page_count == 1 else "$OUT".replace(".jpg", f"-page{i+1}.jpg")
    pix.save(out, jpg_quality=95)
    print(f"Saved {out} ({pix.width}x{pix.height}px @ {$DPI}dpi)")
    if i == 0 and doc.page_count > 1:
        pix.save("$OUT", jpg_quality=95)
        print(f"Also updated $OUT (page 1 preview)")
PY
