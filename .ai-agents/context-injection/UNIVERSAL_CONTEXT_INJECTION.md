# Universal AI Context Injection System

**Goal**: Automatically inject OpenMemory context into ANY AI using ANY method
**Status**: 🚧 Implementation in progress
**Target**: 100% autonomous context injection across all AI interfaces

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANY AI INTERFACE                             │
│  Claude Desktop │ ChatGPT Web │ VS Code │ CLI │ API │ Cursor  │
└────────┬────────┴─────┬───────┴────┬────┴──┬──┴──┬──┴────┬────┘
         │              │            │       │     │       │
         ▼              ▼            ▼       ▼     ▼       ▼
    ┌─────────┐   ┌──────────┐  ┌──────┐ ┌───┐ ┌────┐ ┌──────┐
    │   MCP   │   │ Browser  │  │  VS  │ │CLI│ │HTTP│ │Shell │
    │ Server  │   │Extension │  │ Code │ │Wrap│ │Proxy│ │Hook │
    └────┬────┘   └────┬─────┘  └──┬───┘ └─┬─┘ └──┬─┘ └──┬───┘
         │             │            │       │      │      │
         └─────────────┴────────────┴───────┴──────┴──────┘
                                │
                                ▼
                  ┌──────────────────────────┐
                  │  Universal Context       │
                  │  Manager Service         │
                  │  (Port 8081)             │
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │  OpenMemory Backend      │
                  │  (Port 8080)             │
                  └──────────────────────────┘
```

---

## Components

### 1. Universal Context Manager (Core Service)

**Purpose**: Central service that provides context to all injection methods

**Location**: `~/.openmemory-global/context-service/`

**Features**:
- REST API on port 8081
- Queries OpenMemory for project context
- Formats context for different AI interfaces
- Caches context for performance
- Auto-refreshes on git commits
- Detects current project automatically

**Endpoints**:
```
GET  /context/:project_name          - Get formatted context
GET  /context/auto                   - Auto-detect project and get context
POST /context/record-action          - Record AI action
POST /context/record-decision        - Record AI decision
POST /context/refresh/:project_name  - Force refresh cache
GET  /health                         - Health check
```

### 2. MCP Server (Claude Desktop)

**Purpose**: Provide OpenMemory as MCP resource to Claude Desktop

**Location**: `~/.openmemory-global/mcp-server/`

**Works with**:
- ✅ Claude Desktop
- ✅ Any MCP-compatible client
- ✅ Future MCP-supporting AI tools

**How it works**:
1. Claude Desktop connects to MCP server
2. MCP server queries Universal Context Manager
3. Context provided as MCP resource
4. Claude automatically sees context on startup

### 3. HTTP Proxy (API-based AIs)

**Purpose**: Intercept and inject context into API calls

**Location**: `~/.openmemory-global/http-proxy/`

**Works with**:
- ✅ OpenAI API (ChatGPT, GPT-4)
- ✅ Anthropic API (Claude via API)
- ✅ Google AI API (Gemini)
- ✅ Local LLM APIs (Ollama, LM Studio)
- ✅ Any HTTP-based AI API

**How it works**:
1. Configure API clients to use proxy: `http://localhost:8082`
2. Proxy intercepts requests to AI APIs
3. Injects context into system message or first user message
4. Forwards to actual AI API
5. Records responses back to OpenMemory

### 4. Shell Integration (CLI Tools)

**Purpose**: Wrap CLI AI tools with automatic context injection

**Location**: `~/.openmemory-global/bin/ai-*`

**Wrappers created for**:
- ✅ `ai-aider` - Wraps aider CLI
- ✅ `ai-claude` - Wraps claude CLI
- ✅ `ai-gpt` - Wraps OpenAI CLI tools
- ✅ `ai-cursor` - Wraps cursor CLI
- ✅ `ai-copilot` - Wraps GitHub Copilot CLI
- ✅ `ai-any` - Generic wrapper for any AI CLI

**How it works**:
1. User runs `ai-aider` instead of `aider`
2. Wrapper fetches context from Context Manager
3. Prepends context to user's prompt
4. Calls actual CLI tool with enhanced prompt
5. Records interaction to OpenMemory

### 5. Browser Extension (Web UIs)

**Purpose**: Inject context into web-based AI interfaces

**Location**: `~/.openmemory-global/browser-extension/`

**Works with**:
- ✅ ChatGPT (chat.openai.com)
- ✅ Claude (claude.ai)
- ✅ Gemini (gemini.google.com)
- ✅ Perplexity (perplexity.ai)
- ✅ Any web-based AI chat

**How it works**:
1. Extension detects AI website
2. Queries Context Manager for current project
3. Adds "Load Context" button to chat UI
4. Auto-injects on new conversation start (configurable)
5. Records conversations back to OpenMemory

### 6. VS Code Extension (IDE Integration)

**Purpose**: Inject context into VS Code AI features

**Location**: `~/.openmemory-global/vscode-extension/`

**Works with**:
- ✅ GitHub Copilot Chat
- ✅ Claude Code
- ✅ Any VS Code AI extension
- ✅ VS Code native AI features

**How it works**:
1. Detects workspace and queries Context Manager
2. Hooks into VS Code AI API
3. Injects context before AI receives user message
4. Records AI actions/decisions automatically
5. Updates context on file saves/commits

---

## Implementation Priority

### Phase 1: Core Infrastructure (This Sprint) 🔴
**Estimated Time**: 1-2 days

1. **Universal Context Manager Service** ⭐ CRITICAL
   - REST API for context retrieval
   - Project auto-detection
   - Context formatting for different AIs
   - Action/decision recording endpoints

2. **Shell Integration** ⭐ QUICK WIN
   - CLI wrapper scripts
   - Works immediately with existing tools
   - No complex dependencies

### Phase 2: Desktop Integration (Next Sprint) 🟡
**Estimated Time**: 2-3 days

3. **MCP Server**
   - Full MCP protocol implementation
   - Claude Desktop configuration
   - Resource and tool providers

4. **HTTP Proxy**
   - Intercepts API calls
   - Supports multiple AI providers
   - TLS pass-through for HTTPS

### Phase 3: Web & IDE Integration (Future) 🟢
**Estimated Time**: 3-5 days

5. **Browser Extension**
   - Chrome/Firefox/Edge support
   - Site-specific injectors
   - Auto-detection of conversations

6. **VS Code Extension**
   - AI API hooks
   - Workspace integration
   - Auto-recording

---

## Quick Start: Core Service + CLI Wrappers

We'll implement the most universal and immediately useful components first.

---

## Next: Implementation Details

See individual implementation files:
- `CONTEXT_MANAGER_SERVICE.md` - Core service implementation
- `MCP_SERVER_IMPL.md` - MCP server implementation
- `HTTP_PROXY_IMPL.md` - HTTP proxy implementation
- `CLI_WRAPPERS_IMPL.md` - Shell integration implementation
- `BROWSER_EXTENSION_IMPL.md` - Browser extension implementation
- `VSCODE_EXTENSION_IMPL.md` - VS Code extension implementation
