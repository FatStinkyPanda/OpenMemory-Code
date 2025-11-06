# OpenMemory Quick Start Guide

This guide shows you how to get OpenMemory running with a single command and initialize projects effortlessly.

## What's Changed?

OpenMemory now features **automatic service management**. When you start OpenMemory, everything you need starts automatically:

- ✅ **OpenMemory Backend** (port 8080) - Main memory system
- ✅ **Context Manager** (port 8081) - Automatically started with backend
- ✅ **MCP Server** - Ready for Claude Desktop integration
- ✅ **Process Management** - All services start together and shut down cleanly

**Before:** You had to manually start 3 separate services
**Now:** Just run `npm start` and everything works!

---

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/caviraoss/openmemory.git
cd openmemory
npm run install:all
```

This installs dependencies for:
- Backend
- Context Manager
- MCP Server

### 2. Build Everything

```bash
npm run build
```

This compiles TypeScript for all services.

### 3. Configure (Optional)

Copy the example environment file in the backend:

```bash
cd backend
cp .env.example .env
```

Edit `.env` to configure:
- Database type (SQLite by default)
- Embedding provider (local, OpenAI, Gemini, Ollama)
- API keys (if using cloud embeddings)

---

## Starting OpenMemory

### Single Command Startup

```bash
npm start
```

That's it! This starts:
1. OpenMemory Backend on port 8080
2. Context Manager on port 8081 (auto-started)
3. All background services (decay, watchdog, etc.)

You should see:

```
======================================================================
OpenMemory is ready!
======================================================================
OpenMemory Backend: http://localhost:8080
Context Manager:    http://localhost:8081
MCP Server:         Stdio (started by Claude Desktop)
======================================================================
```

### Development Mode

For development with hot reloading:

```bash
npm run dev
```

### Stopping OpenMemory

Press `Ctrl+C` in the terminal. All services will shut down gracefully.

---

## Initializing Projects

### For New Projects

```bash
# Navigate to your project directory
cd ~/Projects/MyNewProject

# Initialize OpenMemory
node /path/to/openmemory/openmemory-init.js

# Or if you're in the OpenMemory repo
node openmemory-init.js ~/Projects/MyNewProject
```

This creates:
- `.openmemory` link file in your project
- Registers the project in the global registry
- Adds `.openmemory` to `.gitignore` (if exists)

### What Gets Created?

The `.openmemory` file contains:

```
GLOBAL_DIR=/home/user/.openmemory-global
PROJECT_NAME=MyNewProject
OPENMEMORY_URL=http://localhost:8080
```

This tiny file connects your project to OpenMemory. That's all you need!

---

## Claude Desktop Integration

### Configure Claude Desktop

Add this to your Claude Desktop configuration file:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "openmemory": {
      "command": "node",
      "args": ["/absolute/path/to/openmemory/.ai-agents/context-injection/mcp-server/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/openmemory/` with your actual path.

### Using in Claude Desktop

Once configured, you can:

1. **Load project context**
   Use the `load_project_context` prompt to inject full context

2. **Quick summary**
   Use the `quick_context` prompt for a brief overview

3. **Record decisions**
   Use the `record_decision` tool to save architectural choices

4. **Record actions**
   Use the `record_action` tool to track development activities

5. **Record patterns**
   Use the `record_pattern` tool to save coding patterns

All context is automatically loaded based on your current working directory!

---

## Usage Examples

### Example 1: Starting Fresh

```bash
# 1. Start OpenMemory
cd openmemory
npm start

# 2. In another terminal, initialize a new project
cd ~/Projects/MyApp
node ~/openmemory/openmemory-init.js

# 3. Open the project in your IDE
code .

# 4. Use Claude Desktop
# Context is automatically available!
```

### Example 2: Multiple Projects

```bash
# Initialize multiple projects
node openmemory-init.js ~/Projects/ProjectA
node openmemory-init.js ~/Projects/ProjectB
node openmemory-init.js ~/Projects/ProjectC

# All projects share the same OpenMemory backend
# Each has isolated memory via project_name
```

### Example 3: Development Workflow

```bash
# Start OpenMemory in dev mode
npm run dev

# Work on your project
cd ~/Projects/MyApp

# AI assistants automatically:
# - Load project context from OpenMemory
# - Record decisions and actions
# - Build persistent memory across sessions
# - Cannot bypass enforcement (git hooks validate)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenMemory Ecosystem                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    Auto-starts    ┌──────────────────┐   │
│  │ OpenMemory       │ ──────────────────>│ Context Manager  │   │
│  │ Backend          │                    │ (port 8081)      │   │
│  │ (port 8080)      │                    └──────────────────┘   │
│  └──────────────────┘                                           │
│         │                                                        │
│         │ Manages                                                │
│         ▼                                                        │
│  ┌──────────────────┐                    ┌──────────────────┐   │
│  │ Process Manager  │                    │ MCP Server       │   │
│  │ (automatic)      │                    │ (stdio)          │   │
│  └──────────────────┘                    └──────────────────┘   │
│         │                                         │              │
│         │                                         │              │
│         ▼                                         ▼              │
│  ┌──────────────────┐                    ┌──────────────────┐   │
│  │ Watchdog         │                    │ Claude Desktop   │   │
│  │ Enforcement      │                    │ Integration      │   │
│  └──────────────────┘                    └──────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Your Projects       │
                    ├─────────────────────┤
                    │ .openmemory (3 lines)│
                    └─────────────────────┘
```

---

## Key Benefits

### 1. Single Command Startup ✅
No more juggling multiple terminals. One command starts everything.

### 2. Automatic Service Management ✅
Context Manager starts automatically with the backend. No manual coordination needed.

### 3. Clean Project Directories ✅
Projects only need a 3-line `.openmemory` file. No complex setup per project.

### 4. Seamless Integration ✅
Works with Claude Desktop, VS Code Extension, and any MCP client.

### 5. Enforced Memory Usage ✅
AI agents cannot bypass OpenMemory (git hooks, middleware, watchdog).

### 6. Cross-Session Continuity ✅
Memory persists across all sessions. Never lose context again.

---

## Troubleshooting

### OpenMemory won't start

**Check if ports are available:**
```bash
# Check port 8080
netstat -an | grep 8080

# Check port 8081
netstat -an | grep 8081
```

**Kill existing processes:**
```bash
# Kill process on port 8080
# macOS/Linux:
lsof -ti:8080 | xargs kill -9

# Windows:
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Context Manager fails to start

**Rebuild it:**
```bash
cd .ai-agents/context-injection/context-manager
npm run build
```

**Check logs:**
The Process Manager logs all Context Manager output to the console.

### MCP Server not working in Claude Desktop

**Verify the path:**
Make sure the path in `claude_desktop_config.json` points to the actual location of `dist/index.js`.

**Rebuild MCP Server:**
```bash
cd .ai-agents/context-injection/mcp-server
npm run build
```

**Restart Claude Desktop:**
After changing config, completely quit and restart Claude Desktop.

### Project initialization fails

**Check permissions:**
Ensure you have write access to:
- `~/.openmemory-global/` (global directory)
- Your project directory

**Manually create `.openmemory`:**
```bash
cd YourProject
cat > .openmemory << EOF
GLOBAL_DIR=$HOME/.openmemory-global
PROJECT_NAME=YourProject
OPENMEMORY_URL=http://localhost:8080
EOF
```

---

## Advanced Configuration

### Disable Context Manager

If you don't want the Context Manager to auto-start:

```bash
ENABLE_CONTEXT_MANAGER=false npm start
```

### Custom Ports

Set environment variables before starting:

```bash
# Backend port
export OM_PORT=9000

# Context Manager port
export CONTEXT_MANAGER_PORT=9001

npm start
```

### Production Deployment

For production, build everything first:

```bash
npm run build
```

Then start with:

```bash
cd backend
npm start
```

The Process Manager will handle the rest.

---

## What's Next?

Now that OpenMemory is running:

1. **Initialize your projects** with `openmemory-init.js`
2. **Configure Claude Desktop** to use the MCP server
3. **Start coding** - memory is automatic!
4. **Check the dashboard** at http://localhost:3000 (if running)

For more details:
- [Full README](./README.md)
- [AI Agent Enforcement Guide](./.ai-agents/enforcement/README.md)
- [MCP Integration Guide](./.ai-agents/context-injection/README.md)

---

## Summary

**Before:**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd .ai-agents/context-injection/context-manager && npm run dev

# Terminal 3
# Manually configure MCP...

# Terminal 4
# Initialize project...
```

**Now:**
```bash
# One command
npm start

# Initialize project
node openmemory-init.js ~/Projects/MyApp

# Done!
```

🎉 **That's it!** OpenMemory is now fully automated and ready to use.
