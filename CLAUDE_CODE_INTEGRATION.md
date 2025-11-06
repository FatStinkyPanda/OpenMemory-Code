# Claude Code Integration with OpenMemory

**IMPORTANT:** Claude Code (CLI) does NOT have automatic OpenMemory integration built-in.

---

## ❌ What Claude Code CANNOT Do Automatically

Claude Code is a CLI wrapper and has **NO built-in knowledge** of OpenMemory:

- ❌ Cannot auto-detect `.openmemory` files
- ❌ Cannot query OpenMemory for project context
- ❌ Cannot record actions in OpenMemory
- ❌ Cannot use long-term memory across sessions
- ❌ Cannot be "forced" to use OpenMemory (except via git hooks)

**Why?** Claude Code is just a terminal interface to Claude. It has no plugins, extensions, or integration hooks.

---

## ✅ What DOES Work with Claude Code

### 1. Git Hook Enforcement (Blocking Only)

If git hooks are installed, they will **BLOCK invalid commits**:

```bash
$ git commit -m "test"

=====================================================================
AI Agent Enforcement - Pre-Commit Validation
=====================================================================

[1/6] Checking .ai-agents system...
✓ .ai-agents system verified
[2/6] Checking OpenMemory connection...
✓ OpenMemory is accessible
[3/6] Analyzing staged changes...
✓ 3 files staged
[4/6] Checking for recent AI agent activity...
⚠  No recent AI agent activity found in OpenMemory
    This may indicate actions were not recorded.
[5/6] Checking for state file updates...
✓ State files updated
[6/6] Validating autonomous mode compliance...
✓ No violations detected

✅ PRE-COMMIT VALIDATION PASSED (with warnings)
```

**However:** This only VALIDATES commits. It doesn't make Claude Code USE OpenMemory.

### 2. Manual API Integration

You can write code that explicitly calls OpenMemory:

```python
import requests

# Record an action
requests.post('http://localhost:8080/api/ai-agents/action', json={
    'project_name': 'myproject',
    'agent_name': 'developer',
    'action': 'Created database schema',
    'outcome': 'success',
    'user_id': 'ai-agent-system'
})

# Query context
response = requests.post('http://localhost:8080/api/ai-agents/query', json={
    'project_name': 'myproject',
    'query': 'database decisions',
    'user_id': 'ai-agent-system'
})
```

**Problem:** Claude Code won't do this automatically - you have to explicitly ask it to add these calls.

---

## ✅ Integration Options That WORK

### Option 1: Claude Desktop with MCP Server (RECOMMENDED)

**Works with:** Claude Desktop app (not Claude Code CLI)

**Setup:**
1. Start OpenMemory backend: `npm start`
2. Configure Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "openmemory": {
         "command": "node",
         "args": ["/path/to/OpenMemory-Code/.ai-agents/context-injection/mcp-server/dist/index.js"]
       }
     }
   }
   ```
3. Restart Claude Desktop
4. Claude now has OpenMemory tools/prompts built-in!

**Features:**
- ✅ Auto-loads project context
- ✅ Records actions automatically
- ✅ Stores decisions with rationale
- ✅ Tracks patterns
- ✅ Full memory integration

### Option 2: VS Code Extension

**Works with:** VS Code (not Claude Code CLI)

The VS Code extension (mentioned in README.old.md) provides:
- File change monitoring
- Automatic context injection
- Memory integration with GitHub Copilot, Cursor, etc.

**Install:** See VS Code Marketplace

### Option 3: Cline (VS Code Extension)

**Works with:** VS Code

Cline is an agentic coding assistant for VS Code that CAN be integrated with OpenMemory via MCP.

**Setup:**
1. Install Cline extension in VS Code
2. Configure MCP server
3. Cline will use OpenMemory for context

### Option 4: Git Hooks Only (Enforcement)

**Works with:** Any git repository, any tool

**What it does:**
- ✅ Blocks commits that violate rules
- ✅ Validates OpenMemory connection
- ✅ Checks for state updates
- ❌ Does NOT make tools use OpenMemory
- ❌ Does NOT inject context

**Good for:** Preventing bad commits, audit trail
**NOT good for:** Automatic memory integration

---

## 🔧 Fixing the Git Hook Installation Issue

If you initialized a project BEFORE running `git init`, hooks won't be installed.

### Check if Hooks are Installed:

```bash
ls -la .git/hooks/pre-commit
```

If you see "No such file", hooks are NOT installed even though `.ai-agents/` exists.

### Fix: Install Hooks After git init

```bash
# Method 1: Run the post-init installer
bash .ai-agents/enforcement/post-git-init-installer.sh

# Method 2: Run install-hooks directly
bash .ai-agents/enforcement/git-hooks/install-hooks.sh

# Method 3: Re-run openmemory-init (safe, won't overwrite)
node /path/to/OpenMemory-Code/openmemory-init.js .
```

---

## 📊 Comparison: What Works Where

| Feature | Claude Code CLI | Claude Desktop + MCP | VS Code + Extension | Git Hooks |
|---------|----------------|---------------------|-------------------|-----------|
| **Auto context injection** | ❌ No | ✅ Yes | ✅ Yes | ❌ No |
| **Record actions** | ❌ Manual only | ✅ Automatic | ✅ Automatic | ❌ No |
| **Store decisions** | ❌ Manual only | ✅ Automatic | ✅ Automatic | ❌ No |
| **Query memories** | ❌ Manual only | ✅ Via tools | ✅ Via API | ❌ No |
| **Block invalid commits** | ✅ Yes (if hooks) | ✅ Yes (if hooks) | ✅ Yes (if hooks) | ✅ Yes |
| **Cross-session memory** | ❌ No | ✅ Yes | ✅ Yes | ❌ No |
| **Enforcement** | ⚠️ Git only | ✅ Full | ✅ Full | ⚠️ Git only |

---

## 💡 Recommendations

### For Claude Code CLI Users:

Since Claude Code has NO automatic integration:

1. **Use git hooks for enforcement** (blocks bad commits)
2. **Manually prompt Claude** to use OpenMemory:
   ```
   "Before starting, query OpenMemory for project context using this curl:
   curl http://localhost:8080/api/ai-agents/context/myproject

   Then record all actions via:
   curl -X POST http://localhost:8080/api/ai-agents/action ..."
   ```
3. **Or switch to Claude Desktop** for automatic integration

### For Automatic Integration:

**Use Claude Desktop with MCP server** - this is the ONLY way to get automatic OpenMemory integration with Claude's official tools.

### For VS Code Users:

Install the VS Code extension or use Cline with MCP integration.

---

## 🐛 Known Issues

### Issue #1: Hook Installation Timing

**Problem:** If you run `openmemory-init` before `git init`, hooks won't install.

**Symptoms:**
- `.openmemory` file exists
- `.ai-agents/` directory exists
- `enforcement-status.json` says hooks installed
- But `.git/hooks/pre-commit` doesn't exist

**Fix:**
```bash
bash .ai-agents/enforcement/post-git-init-installer.sh
```

### Issue #2: Claude Code Doesn't Use OpenMemory

**Problem:** Claude Code CLI has no built-in OpenMemory integration.

**Solution:** Switch to Claude Desktop with MCP server, or manually prompt Claude to use the API.

---

## 📝 Summary

**Claude Code (CLI):**
- ❌ NO automatic OpenMemory integration
- ✅ Git hooks can enforce (if installed)
- ⚠️ Requires manual prompting to use memory

**Claude Desktop + MCP:**
- ✅ FULL automatic integration
- ✅ All enforcement layers active
- ✅ Context injection automatic
- ✅ **RECOMMENDED for OpenMemory**

**VS Code + Extension:**
- ✅ FULL automatic integration
- ✅ Works with Copilot, Cursor, Cline
- ✅ Good alternative to Claude Desktop

---

**Last Updated:** 2025-01-06
**Affects:** Claude Code v2.0.34 and all CLI versions
**Recommendation:** Use Claude Desktop with MCP server for full OpenMemory integration
