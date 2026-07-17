#!/usr/bin/env bash
# Convert all text in admission-form.pdf to vector curves (no embedded fonts).
# Keeps a backup of the font-based PDF.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PDF="$DIR/admission-form.pdf"
BACKUP="$DIR/admission-form-with-fonts.pdf"
TMP="$DIR/admission-form-outlined-tmp.pdf"
GS="${GS:-/opt/homebrew/bin/gs}"

if [[ ! -x "$GS" ]]; then
  echo "Ghostscript not found. Install: brew install ghostscript" >&2
  exit 1
fi

if [[ ! -f "$PDF" ]]; then
  echo "Missing $PDF" >&2
  exit 1
fi

if [[ ! -f "$BACKUP" ]]; then
  cp "$PDF" "$BACKUP"
  echo "Backup saved: $BACKUP"
fi

"$GS" -q -dNOPAUSE -dBATCH \
  -sDEVICE=pdfwrite \
  -dCompatibilityLevel=1.4 \
  -dNoOutputFonts \
  -dPDFSETTINGS=/prepress \
  -sOutputFile="$TMP" \
  "${BACKUP:-$PDF}"

mv "$TMP" "$PDF"
echo "Outlined PDF saved: $PDF"
echo "Run ./export-admission-jpeg.sh to refresh the 700 DPI JPEG."
