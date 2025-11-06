#!/bin/bash
#
# Universal AI Context Injection - Installation Script
#
# This script installs and configures all components for universal
# AI context injection across any AI tool or interface.
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directories
GLOBAL_DIR="${HOME}/.openmemory-global"
CONTEXT_INJECTION_DIR="${GLOBAL_DIR}/context-injection"
CONTEXT_MANAGER_DIR="${CONTEXT_INJECTION_DIR}/context-manager"
MCP_SERVER_DIR="${CONTEXT_INJECTION_DIR}/mcp-server"
CLI_WRAPPERS_DIR="${CONTEXT_INJECTION_DIR}/cli-wrappers"
BIN_DIR="${GLOBAL_DIR}/bin"

echo -e "${BLUE}===================================================================${NC}"
echo -e "${BLUE}Universal AI Context Injection - Installation${NC}"
echo -e "${BLUE}===================================================================${NC}"
echo ""

# Check requirements
echo -e "${BLUE}Checking requirements...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Please install Node.js v18+ from: https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Create directories
echo ""
echo -e "${BLUE}Creating directory structure...${NC}"
mkdir -p "${CONTEXT_INJECTION_DIR}"
mkdir -p "${BIN_DIR}"
echo -e "${GREEN}✓ Directories created${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================================================
# 1. Install Context Manager Service
# ============================================================================

echo ""
echo -e "${BLUE}[1/4] Installing Universal Context Manager Service...${NC}"

# Copy Context Manager files
cp -r "${SCRIPT_DIR}/context-manager" "${CONTEXT_INJECTION_DIR}/"

# Install dependencies
cd "${CONTEXT_MANAGER_DIR}"
echo "Installing dependencies..."
npm install --silent

# Build
echo "Building Context Manager..."
npm run build --silent

echo -e "${GREEN}✓ Context Manager installed${NC}"

# ============================================================================
# 2. Install MCP Server
# ============================================================================

echo ""
echo -e "${BLUE}[2/4] Installing MCP Server (for Claude Desktop)...${NC}"

# Copy MCP Server files
cp -r "${SCRIPT_DIR}/mcp-server" "${CONTEXT_INJECTION_DIR}/"

# Install dependencies
cd "${MCP_SERVER_DIR}"
echo "Installing dependencies..."
npm install --silent

# Build
echo "Building MCP Server..."
npm run build --silent

# Make executable
chmod +x "${MCP_SERVER_DIR}/dist/index.js"

echo -e "${GREEN}✓ MCP Server installed${NC}"

# ============================================================================
# 3. Install CLI Wrappers
# ============================================================================

echo ""
echo -e "${BLUE}[3/4] Installing CLI Wrappers...${NC}"

# Copy CLI wrappers
cp -r "${SCRIPT_DIR}/cli-wrappers" "${CONTEXT_INJECTION_DIR}/"

# Make wrappers executable
chmod +x "${CLI_WRAPPERS_DIR}/"*

# Create symlinks in bin directory
echo "Creating command symlinks..."
for wrapper in "${CLI_WRAPPERS_DIR}/ai-"*; do
    if [ -f "$wrapper" ] && [ -x "$wrapper" ]; then
        wrapper_name=$(basename "$wrapper")
        ln -sf "$wrapper" "${BIN_DIR}/${wrapper_name}"
        echo "  • ${wrapper_name}"
    fi
done

echo -e "${GREEN}✓ CLI Wrappers installed${NC}"

# ============================================================================
# 4. Create Management Scripts
# ============================================================================

echo ""
echo -e "${BLUE}[4/4] Creating management scripts...${NC}"

# Start script for Context Manager
cat > "${BIN_DIR}/context-manager-start" <<'STARTSCRIPT'
#!/bin/bash
# Start Universal Context Manager Service

CONTEXT_MANAGER_DIR="${HOME}/.openmemory-global/context-injection/context-manager"

if [ ! -d "$CONTEXT_MANAGER_DIR" ]; then
    echo "Error: Context Manager not installed"
    exit 1
fi

cd "$CONTEXT_MANAGER_DIR"

# Check if already running
if pgrep -f "node.*context-manager" > /dev/null; then
    echo "Context Manager is already running"
    exit 0
fi

# Start in background
echo "Starting Universal Context Manager..."
nohup npm start > "${HOME}/.openmemory-global/logs/context-manager.log" 2>&1 &
echo $! > "${HOME}/.openmemory-global/context-manager.pid"

sleep 2

# Check if started successfully
if pgrep -f "node.*context-manager" > /dev/null; then
    echo "✓ Context Manager started successfully"
    echo "  Access at: http://localhost:8081"
    echo "  Logs: ~/.openmemory-global/logs/context-manager.log"
else
    echo "✗ Failed to start Context Manager"
    echo "  Check logs: ~/.openmemory-global/logs/context-manager.log"
    exit 1
fi
STARTSCRIPT

chmod +x "${BIN_DIR}/context-manager-start"

# Stop script
cat > "${BIN_DIR}/context-manager-stop" <<'STOPSCRIPT'
#!/bin/bash
# Stop Universal Context Manager Service

PID_FILE="${HOME}/.openmemory-global/context-manager.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping Context Manager (PID: $PID)..."
        kill "$PID"
        rm -f "$PID_FILE"
        echo "✓ Context Manager stopped"
    else
        echo "Context Manager not running (stale PID file)"
        rm -f "$PID_FILE"
    fi
else
    # Try pkill as fallback
    if pkill -f "node.*context-manager"; then
        echo "✓ Context Manager stopped"
    else
        echo "Context Manager not running"
    fi
fi
STOPSCRIPT

chmod +x "${BIN_DIR}/context-manager-stop"

# Status script
cat > "${BIN_DIR}/context-manager-status" <<'STATUSSCRIPT'
#!/bin/bash
# Check Context Manager status

if pgrep -f "node.*context-manager" > /dev/null; then
    PID=$(pgrep -f "node.*context-manager")
    echo "✓ Context Manager is running (PID: $PID)"
    echo "  Access at: http://localhost:8081"

    # Try to query health endpoint
    if command -v curl &> /dev/null; then
        echo ""
        echo "Health check:"
        curl -s http://localhost:8081/health | jq . 2>/dev/null || echo "  (jq not installed, showing raw JSON)"
    fi
else
    echo "✗ Context Manager is not running"
    echo ""
    echo "To start: context-manager-start"
fi
STATUSSCRIPT

chmod +x "${BIN_DIR}/context-manager-status"

echo -e "${GREEN}✓ Management scripts created${NC}"

# ============================================================================
# Configure PATH
# ============================================================================

echo ""
echo -e "${BLUE}Configuring PATH...${NC}"

# Detect shell
SHELL_RC=""
if [ -n "$BASH_VERSION" ]; then
    SHELL_RC="${HOME}/.bashrc"
elif [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="${HOME}/.zshrc"
else
    # Try to detect from SHELL env var
    case "$SHELL" in
        */bash)
            SHELL_RC="${HOME}/.bashrc"
            ;;
        */zsh)
            SHELL_RC="${HOME}/.zshrc"
            ;;
        *)
            echo -e "${YELLOW}⚠ Could not detect shell, skipping PATH configuration${NC}"
            ;;
    esac
fi

if [ -n "$SHELL_RC" ]; then
    # Check if already in PATH
    if ! grep -q "openmemory-global/bin" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        echo "# OpenMemory Universal Context Injection" >> "$SHELL_RC"
        echo "export PATH=\"\${HOME}/.openmemory-global/bin:\$PATH\"" >> "$SHELL_RC"
        echo -e "${GREEN}✓ PATH configured in ${SHELL_RC}${NC}"
    else
        echo -e "${GREEN}✓ PATH already configured${NC}"
    fi
fi

# ============================================================================
# MCP Server Configuration for Claude Desktop
# ============================================================================

echo ""
echo -e "${BLUE}Configuring Claude Desktop (MCP)...${NC}"

# Detect OS for config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    CLAUDE_CONFIG_DIR="${HOME}/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    CLAUDE_CONFIG_DIR="${APPDATA}/Claude"
else
    # Linux
    CLAUDE_CONFIG_DIR="${HOME}/.config/Claude"
fi

CLAUDE_CONFIG_FILE="${CLAUDE_CONFIG_DIR}/claude_desktop_config.json"

# Create config directory if it doesn't exist
mkdir -p "${CLAUDE_CONFIG_DIR}"

# Create or update config
if [ -f "${CLAUDE_CONFIG_FILE}" ]; then
    echo -e "${YELLOW}⚠ Claude Desktop config already exists${NC}"
    echo "  Location: ${CLAUDE_CONFIG_FILE}"
    echo "  Please manually add MCP server configuration (see post-install instructions)"
else
    # Create new config
    cat > "${CLAUDE_CONFIG_FILE}" <<MCPCONFIG
{
  "mcpServers": {
    "openmemory": {
      "command": "node",
      "args": ["${MCP_SERVER_DIR}/dist/index.js"],
      "env": {
        "CONTEXT_MANAGER_URL": "http://localhost:8081",
        "OPENMEMORY_URL": "http://localhost:8080"
      }
    }
  }
}
MCPCONFIG
    echo -e "${GREEN}✓ Claude Desktop configured${NC}"
    echo "  Config: ${CLAUDE_CONFIG_FILE}"
fi

# ============================================================================
# Create logs directory
# ============================================================================

mkdir -p "${GLOBAL_DIR}/logs"

# ============================================================================
# Installation Complete
# ============================================================================

echo ""
echo -e "${GREEN}===================================================================${NC}"
echo -e "${GREEN}✅ INSTALLATION COMPLETE${NC}"
echo -e "${GREEN}===================================================================${NC}"
echo ""
echo "Universal AI Context Injection has been installed!"
echo ""
echo -e "${BLUE}Installed Components:${NC}"
echo "  ✓ Universal Context Manager Service"
echo "  ✓ MCP Server (for Claude Desktop)"
echo "  ✓ CLI Wrappers (ai-aider, ai-claude, etc.)"
echo ""
echo -e "${BLUE}Available Commands:${NC}"
echo "  context-manager-start   - Start Context Manager service"
echo "  context-manager-stop    - Stop Context Manager service"
echo "  context-manager-status  - Check service status"
echo "  ai-aider               - Aider with OpenMemory context"
echo "  ai-claude              - Claude CLI with OpenMemory context"
echo ""
echo -e "${BLUE}Quick Start:${NC}"
echo "  1. Reload shell: source ~/.bashrc (or ~/.zshrc)"
echo "  2. Start Context Manager: context-manager-start"
echo "  3. Start OpenMemory backend: openmemory-start"
echo "  4. Use AI tools: ai-aider, ai-claude, etc."
echo "  5. For Claude Desktop: Restart app to load MCP server"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  • Context Manager: http://localhost:8081"
echo "  • OpenMemory Backend: http://localhost:8080"
echo "  • Claude Desktop MCP: ${CLAUDE_CONFIG_FILE}"
echo ""
echo -e "${YELLOW}⚠ Remember to:${NC}"
echo "  1. Reload your shell for PATH changes"
echo "  2. Start OpenMemory backend if not already running"
echo "  3. Start Context Manager service"
echo "  4. Restart Claude Desktop to enable MCP integration"
echo ""
echo "For more information, see:"
echo "  • Documentation: ~/.openmemory-global/context-injection/README.md"
echo "  • Logs: ~/.openmemory-global/logs/"
echo ""
echo -e "${GREEN}===================================================================${NC}"
