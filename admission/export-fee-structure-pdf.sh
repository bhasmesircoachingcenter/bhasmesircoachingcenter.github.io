#!/usr/bin/env bash
# Build fee-structure.pdf from fee-structure-flyer.html (local print handout — not on website).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
HTML="$DIR/fee-structure-flyer.html"
OUT="$DIR/fee-structure.pdf"

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
  echo "Chrome/Chromium not found. Open fee-structure-flyer.html in a browser → Print → Save as PDF."
  exit 1
fi

"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$OUT" \
  "file://$HTML"

echo "Saved $OUT"
