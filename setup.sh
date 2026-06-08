#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── 1. System requirements ───────────────────────────────────────────────────
info "Checking system requirements..."

command -v node >/dev/null 2>&1 || error "Node.js is not installed. Install it from https://nodejs.org (v18+ recommended)."
command -v npm  >/dev/null 2>&1 || error "npm is not installed. It usually ships with Node.js."

NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
NODE_MAJOR="${NODE_VER%%.*}"
if [ "$NODE_MAJOR" -lt 18 ]; then
  warn "Node.js $NODE_VER detected — v18 or newer is recommended."
else
  success "Node.js $NODE_VER"
fi

# ─── 2. Backend dependencies ──────────────────────────────────────────────────
BACKEND_DIR="$REPO_ROOT/backend"
if [ -f "$BACKEND_DIR/package.json" ]; then
  info "Installing backend dependencies..."
  npm install --prefix "$BACKEND_DIR"
  success "Backend dependencies installed."
else
  warn "No backend/package.json found — skipping backend npm install."
fi

# ─── 3. Frontend dependencies ─────────────────────────────────────────────────
FRONTEND_DIR="$REPO_ROOT/frontend"
if [ -f "$FRONTEND_DIR/package.json" ]; then
  info "Installing frontend dependencies..."
  npm install --prefix "$FRONTEND_DIR"
  success "Frontend dependencies installed."
else
  warn "No frontend/package.json found — skipping frontend npm install."
fi

# ─── 4. Environment file ──────────────────────────────────────────────────────
ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/.env.example"

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    info "Created $ENV_FILE from .env.example — fill in your API keys."
  else
    info "Creating $ENV_FILE with placeholder values..."
    cat > "$ENV_FILE" <<'EOF'
# ── Server ────────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=development
JWT_SECRET=change_me_in_production

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=mongodb://localhost:27017/youtubeauto

# ── Video Generation Providers ────────────────────────────────────────────────
VEO3_API_KEY=
VEO3_API_ENDPOINT=

RUNWAY_API_KEY=
RUNWAY_API_ENDPOINT=

LEONARDO_API_KEY=
LEONARDO_API_ENDPOINT=

SYNTHESIA_API_KEY=
SYNTHESIA_API_ENDPOINT=

ELEVEN_API_KEY=
ELEVEN_API_ENDPOINT=

DESCRIPT_API_KEY=
DESCRIPT_API_ENDPOINT=

PIKA_API_KEY=
PIKA_API_ENDPOINT=

KLING_API_KEY=
KLING_API_ENDPOINT=

HEYGEN_API_KEY=
HEYGEN_API_ENDPOINT=

FLIKI_API_KEY=
FLIKI_API_ENDPOINT=

INVIDEO_API_KEY=
INVIDEO_API_ENDPOINT=

# ── Ollama (local LLM) ────────────────────────────────────────────────────────
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
EOF
    success "Created $ENV_FILE — edit it to add your API keys."
  fi
else
  success "$ENV_FILE already exists — skipping."
fi

# ─── 5. Ollama installation ───────────────────────────────────────────────────
info "Checking for Ollama..."

if command -v ollama >/dev/null 2>&1; then
  OLLAMA_VER=$(ollama --version 2>/dev/null | head -1 || echo "unknown version")
  success "Ollama already installed ($OLLAMA_VER)."
else
  info "Installing Ollama..."

  OS="$(uname -s)"
  case "$OS" in
    Linux)
      if command -v curl >/dev/null 2>&1; then
        curl -fsSL https://ollama.com/install.sh | sh
      else
        error "curl is required to install Ollama. Install it with: sudo apt install curl"
      fi
      ;;
    Darwin)
      if command -v brew >/dev/null 2>&1; then
        brew install ollama
      else
        warn "Homebrew not found. Download Ollama from https://ollama.com/download/mac"
      fi
      ;;
    *)
      warn "Unsupported OS ($OS). Download Ollama manually from https://ollama.com/download"
      ;;
  esac

  if command -v ollama >/dev/null 2>&1; then
    success "Ollama installed successfully."
  else
    warn "Ollama install may need a shell restart. Run: source ~/.bashrc (or ~/.zshrc)"
  fi
fi

# ─── 6. Pull default Ollama model ─────────────────────────────────────────────
DEFAULT_MODEL="llama3"

if command -v ollama >/dev/null 2>&1; then
  # Start Ollama service in background if it isn't running
  if ! curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
    info "Starting Ollama service..."
    ollama serve >/dev/null 2>&1 &
    OLLAMA_PID=$!
    sleep 3
    STARTED_OLLAMA=true
  else
    STARTED_OLLAMA=false
  fi

  info "Pulling default model ($DEFAULT_MODEL) — this may take a few minutes..."
  if ollama pull "$DEFAULT_MODEL"; then
    success "Model '$DEFAULT_MODEL' ready."
  else
    warn "Could not pull '$DEFAULT_MODEL'. Run manually: ollama pull $DEFAULT_MODEL"
  fi

  # Stop the background service we started (the user's system service will own it)
  if [ "${STARTED_OLLAMA:-false}" = "true" ]; then
    kill "$OLLAMA_PID" 2>/dev/null || true
  fi
fi

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Next steps:"
echo "  1. Edit backend/.env and fill in your API keys"
echo "  2. Start the backend:   npm --prefix backend start"
echo "  3. Start the frontend:  npm --prefix frontend start"
echo "  4. Ollama (local LLM):  ollama serve"
echo ""
