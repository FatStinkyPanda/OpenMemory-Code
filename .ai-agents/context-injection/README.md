# Universal AI Context Injection System

**Status**: ✅ **IMPLEMENTED AND READY TO USE**

Automatic OpenMemory context injection for ANY AI using ANY method.

---

## What is This?

This system automatically provides OpenMemory project context to **any AI tool** you use, regardless of how you interact with it:

- ✅ **Claude Desktop** - via MCP server
- ✅ **CLI Tools** (aider, claude-cli, etc.) - via shell wrappers
- ✅ **API-based tools** - via HTTP proxy (future)
- ✅ **Web UIs** (ChatGPT, Claude.ai, etc.) - via browser extension (future)
- ✅ **VS Code** - via extension (future)

**No more manually copying context!** The AI automatically sees your project history, decisions, patterns, and current state.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANY AI INTERFACE                             │
│  Claude Desktop │ Aider CLI │ VS Code │ ChatGPT │ API │ etc.  │
└────────┬────────┴─────┬─────┴────┬────┴────┬────┴──┬──┴───────┘
         │              │          │         │       │
         ▼              ▼          ▼         ▼       ▼
    ┌─────────┐   ┌──────────┐ ┌──────┐ ┌──────┐ ┌────┐
    │   MCP   │   │   CLI    │ │  VS  │ │Browser│ │HTTP│
    │ Server  │   │ Wrappers │ │ Code │ │  Ext  │ │Proxy│
    └────┬────┘   └────┬─────┘ └──┬───┘ └──┬───┘ └──┬─┘
         │             │           │        │        │
         └─────────────┴───────────┴────────┴────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ Universal Context       │
              │ Manager Service         │
              │ (Port 8081)             │
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │  OpenMemory Backend     │
              │  (Port 8080)            │
              └─────────────────────────┘
```

---

## Quick Start

### 1. Installation

```bash
# Navigate to context injection directory
cd ~/.openmemory-global/.ai-agents/context-injection

# Run installation script
chmod +x install-context-injection.sh
./install-context-injection.sh

# Reload shell
source ~/.bashrc  # or ~/.zshrc
```

### 2. Start Services

```bash
# Start OpenMemory backend (if not already running)
openmemory-start

# Start Context Manager service
context-manager-start

# Check status
context-manager-status
```

### 3. Use With Your AI Tools

#### Option A: Claude Desktop (MCP)

1. Restart Claude Desktop app
2. MCP server will automatically connect
3. Context is available as a resource
4. Claude can use tools to record decisions/actions

#### Option B: CLI Tools

```bash
# Instead of: aider
ai-aider

# Instead of: claude
ai-claude "How do I implement feature X?"

# Context is automatically injected!
```

#### Option C: Manual Context Fetch

```bash
# Get context for any tool
curl http://localhost:8081/context/auto

# Use in prompts
context=$(curl -s http://localhost:8081/context/auto | jq -r '.context')
echo "$context" | pbcopy  # macOS
# Then paste into your AI interface
```

---

## Components

### 1. Universal Context Manager

**Service**: http://localhost:8081
**Purpose**: Central service providing context to all AI interfaces

**Endpoints**:
```
GET  /health                        - Service health check
GET  /context/auto                  - Auto-detect project, get context
GET  /context/:project_name         - Get context for specific project
POST /context/refresh/:project_name - Force refresh cache
POST /context/record-action         - Record AI action
POST /context/record-decision       - Record AI decision
```

**Usage**:
```bash
# Get context
curl http://localhost:8081/context/my-project

# Record action
curl -X POST http://localhost:8081/context/record-action \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "my-project",
    "agent_name": "my-ai-tool",
    "action": "Implemented authentication",
    "outcome": "Success"
  }'
```

### 2. MCP Server (Claude Desktop)

**Purpose**: Provides OpenMemory as MCP resource/tools to Claude Desktop

**Configuration**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

**Features**:
- Claude automatically sees project context on startup
- Tools available: `record_decision`, `record_action`, `record_pattern`, `query_history`, `update_state`
- Resources available: All registered projects

**Usage**: Just use Claude Desktop normally - context is automatic!

### 3. CLI Wrappers

**Purpose**: Wrap CLI AI tools to inject context automatically

**Available Wrappers**:
- `ai-aider` - Aider AI coding assistant
- `ai-claude` - Claude CLI
- `ai-generic` - Template for any tool

**How it works**:
1. Detects current project
2. Fetches context from Context Manager
3. Prepends context to your prompt
4. Calls the actual AI tool

**Usage**:
```bash
# Use wrapped version
ai-aider "Implement feature X"

# Disable context injection for one command
INJECT_CONTEXT=no ai-aider "Quick question"
```

**Creating New Wrappers**:
```bash
# Copy template
cp ~/.openmemory-global/context-injection/cli-wrappers/ai-wrapper-template.sh \
   ~/.openmemory-global/bin/ai-mytool

# Edit to set TOOL_COMMAND
nano ~/.openmemory-global/bin/ai-mytool

# Make executable
chmod +x ~/.openmemory-global/bin/ai-mytool
```

---

## Management Commands

### Context Manager Service

```bash
# Start service
context-manager-start

# Stop service
context-manager-stop

# Check status
context-manager-status

# View logs
tail -f ~/.openmemory-global/logs/context-manager.log
```

---

## Configuration

### Environment Variables

```bash
# Context Manager port (default: 8081)
export CONTEXT_MANAGER_PORT=8081

# OpenMemory backend URL (default: http://localhost:8080)
export OPENMEMORY_URL=http://localhost:8080

# Context Manager URL (for clients)
export CONTEXT_MANAGER_URL=http://localhost:8081
```

### Claude Desktop MCP Configuration

Location: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "openmemory": {
      "command": "node",
      "args": ["/Users/you/.openmemory-global/context-injection/mcp-server/dist/index.js"],
      "env": {
        "CONTEXT_MANAGER_URL": "http://localhost:8081",
        "OPENMEMORY_URL": "http://localhost:8080"
      }
    }
  }
}
```

---

## Examples

### Example 1: Using ai-aider with Context

```bash
cd ~/my-project
openmemory-init  # Initialize project if not already

# Start services
openmemory-start
context-manager-start

# Use aider with automatic context
ai-aider "Add authentication to the API"

# Aider receives:
# 1. Your prompt: "Add authentication to the API"
# 2. OpenMemory context:
#    - Project phase: development
#    - Progress: 60%
#    - Recent decisions about auth approach
#    - Active coding patterns
#    - Recent changes
```

### Example 2: Claude Desktop with MCP

```
1. Start OpenMemory: openmemory-start
2. Start Context Manager: context-manager-start
3. Open Claude Desktop
4. Start conversation
5. Claude automatically has access to:
   - All project context (as MCP resource)
   - Tools to record decisions/actions

User: "What's the current state of this project?"
Claude: "Based on OpenMemory, the project is at 60% completion
         in the development phase. Recent work focused on..."
```

### Example 3: Manual Context Injection

```bash
# Fetch context
context=$(curl -s http://localhost:8081/context/auto | jq -r '.context')

# Use with any AI tool
echo "$context" | pbcopy  # Copy to clipboard

# Or pipe directly to AI
echo "User question: How do I add caching?" | cat <(echo "$context") - | some-ai-tool
```

---

## Troubleshooting

### Context Manager Won't Start

```bash
# Check if port 8081 is already in use
lsof -i :8081

# Check logs
cat ~/.openmemory-global/logs/context-manager.log

# Try starting manually to see errors
cd ~/.openmemory-global/context-injection/context-manager
npm start
```

### Claude Desktop Not Seeing MCP Server

```bash
# Verify config exists
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Check MCP server can run
node ~/.openmemory-global/context-injection/mcp-server/dist/index.js

# Restart Claude Desktop completely
killall Claude  # Then relaunch
```

### CLI Wrapper Not Working

```bash
# Check wrapper is executable
ls -la ~/.openmemory-global/bin/ai-*

# Test Context Manager is accessible
curl http://localhost:8081/health

# Run wrapper with debug output (it logs to stderr)
ai-aider "test" 2>&1 | less
```

### No Context Returned

```bash
# Verify OpenMemory has data
curl http://localhost:8080/ai-agents/state/your-project

# Verify Context Manager can reach OpenMemory
curl http://localhost:8081/context/your-project

# Check you're in a project directory
ls -la .openmemory  # Should exist

# Try auto-detect
curl http://localhost:8081/context/auto
```

---

## Advanced Usage

### Custom Context Formatting

The Context Manager supports different output formats:

```bash
# Markdown (default)
curl http://localhost:8081/context/my-project?format=markdown

# JSON (for programmatic use)
curl http://localhost:8081/context/my-project?format=json
```

### Cache Management

Context is cached for 5 minutes by default. To force refresh:

```bash
curl -X POST http://localhost:8081/context/refresh/my-project
```

### Recording Actions Programmatically

```bash
# After your AI makes a change, record it
curl -X POST http://localhost:8081/context/record-action \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "my-project",
    "agent_name": "my-custom-ai",
    "action": "Refactored authentication module",
    "context": "User requested better error handling",
    "outcome": "Implemented try-catch blocks and logging"
  }'
```

---

## Future Enhancements

### Planned Components

1. **HTTP Proxy** - Intercept API calls to OpenAI, Anthropic, etc.
2. **Browser Extension** - For ChatGPT, Claude.ai, Perplexity, etc.
3. **VS Code Extension** - Deep IDE integration
4. **Slack/Discord Bot** - Context injection in chat
5. **Git Commit Hook Integration** - Auto-record on commits

### Contributing

To add support for a new AI tool:

1. Create a new CLI wrapper (copy `ai-wrapper-template.sh`)
2. Or create a plugin for the Context Manager
3. Or integrate directly with the Context Manager REST API

---

## System Requirements

- Node.js v18+
- OpenMemory backend running
- jq (optional, for CLI examples)

---

## Security Notes

- Context Manager runs locally (localhost:8081)
- No external network access
- All data stays on your machine
- MCP server only accessible to local Claude Desktop

---

## Support

- Documentation: This file
- Logs: `~/.openmemory-global/logs/`
- Issues: GitHub repository
- Health check: `http://localhost:8081/health`

---

**Last Updated**: 2025-11-06
**Version**: 1.0.0
**Status**: ✅ Production Ready
