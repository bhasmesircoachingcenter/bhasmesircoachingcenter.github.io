#!/usr/bin/env bash
# Build admission-form.pdf from admission-form.html (print / WhatsApp handout).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
HTML="$DIR/admission-form.html"
OUT="$DIR/admission-form.pdf"
BACKUP="$DIR/admission-form-with-fonts.pdf"

CHROME=""
for c in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "google-chrome" \
  "chromium"; do
  if command -v "$c" >/dev/null 2>&1 || [[ -x "$c" ]]; then
    CHROME="$c"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  echo "Chrome/Chromium not found. Open admission-form.html in a browser → Print → Save as PDF."
  exit 1
fi

"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$OUT" \
  "file://$HTML"

cp "$OUT" "$BACKUP"
echo "Saved $OUT (font backup: $BACKUP)"
echo "Run ./outline-admission-pdf.sh then ./export-admission-jpeg.sh to refresh the 700 DPI JPEG."
