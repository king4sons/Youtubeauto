#!/usr/bin/env bash
set -euo pipefail

# Minimum required versions
MIN_CURL_VERSION="7.0"

log()  { echo "[ollama-install] $*"; }
err()  { echo "[ollama-install] ERROR: $*" >&2; exit 1; }

# Check that curl is available
if ! command -v curl &>/dev/null; then
  err "curl is required but not found. Install curl and retry."
fi

log "Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Verify the install succeeded
if ! command -v ollama &>/dev/null; then
  err "Ollama installation failed — 'ollama' not found in PATH."
fi

OLLAMA_VERSION=$(ollama --version 2>/dev/null || echo "unknown")
log "Ollama installed successfully: $OLLAMA_VERSION"

# Pull a default lightweight model if requested
DEFAULT_MODEL="${OLLAMA_MODEL:-}"
if [[ -n "$DEFAULT_MODEL" ]]; then
  log "Pulling model: $DEFAULT_MODEL"
  ollama pull "$DEFAULT_MODEL"
  log "Model '$DEFAULT_MODEL' ready."
fi

log "Done. Run 'ollama serve' to start the API server (default: http://localhost:11434)."
