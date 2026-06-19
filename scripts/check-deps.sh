#!/usr/bin/env bash
# Checks that all runtime dependencies for watch.py are present.
set -e

ok=true

for bin in python3 yt-dlp ffmpeg ffprobe; do
  if command -v "$bin" &>/dev/null; then
    echo "  [ok] $bin ($(command -v $bin))"
  else
    echo "  [missing] $bin"
    ok=false
  fi
done

if python3 -c "import faster_whisper" 2>/dev/null; then
  echo "  [ok] faster-whisper (Python package)"
else
  echo "  [optional] faster-whisper not installed — videos without captions will have no transcript"
  echo "             Install with: pip install faster-whisper"
fi

if $ok; then
  echo ""
  echo "All required dependencies are present."
else
  echo ""
  echo "Install missing tools:"
  echo "  yt-dlp  : pip install yt-dlp   OR  brew install yt-dlp"
  echo "  ffmpeg  : https://ffmpeg.org/download.html  OR  brew install ffmpeg"
  exit 1
fi
