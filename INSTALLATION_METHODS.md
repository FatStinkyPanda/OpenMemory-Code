# OpenMemory Installation Methods

OpenMemory supports **three installation methods** depending on your use case:

## Method 1: Global System Installation (Recommended for Production)

**Best for:** Managing multiple projects, production use, keeping project directories clean

**How it works:**
- Installs to `~/.openmemory-global/`
- Provides global commands: `openmemory-start`, `openmemory-init`, etc.
- Projects only need a 3-line `.openmemory` file
- Includes project watcher for auto-detection

**Installation:**

```powershell
# Windows PowerShell
cd OpenMemory
& .\.ai-agents\enforcement\install-global.ps1
```

```bash
# Linux/macOS
cd OpenMemory
./.ai-agents/enforcement/install-global.sh
```

**Usage:**

```bash
# Start backend (keeps running)
openmemory-start

# Initialize project
cd ~/Projects/MyApp
openmemory-init

# Optional: Start watcher for auto-detection
openmemory-watch start
```

**Repository used:** https://github.com/FatStinkyPanda/OpenMemory

---

## Method 2: Direct Repository with NPM Scripts (Development)

**Best for:** Contributing to OpenMemory, development, testing new features

**How it works:**
- Run directly from the cloned repository
- Uses npm scripts for convenience
- Auto-starts Context Manager with backend
- No global installation needed

**Installation:**

```bash
# Clone repository
git clone https://github.com/FatStinkyPanda/OpenMemory.git
cd OpenMemory

# Install all dependencies
npm run install:all

# Build everything
npm run build
```

**Usage:**

```bash
# Start everything (backend + context manager)
npm start

# Or development mode with hot reload
npm run dev

# Initialize a project
node openmemory-init.js ~/Projects/MyApp
```

**Note:** This method uses the automatic startup system we just built!

---

## Method 3: Docker (Simplest for Quick Start)

**Best for:** Quick testing, deployment, containerized environments

**Installation:**

```bash
git clone https://github.com/FatStinkyPanda/OpenMemory.git
cd OpenMemory
docker compose up --build -d
```

**Usage:**
- Backend runs on http://localhost:8080
- All services containerized
- Data persists in `/data/openmemory.sqlite`

---

## Comparison

| Feature | Global System | NPM Scripts | Docker |
|---------|--------------|-------------|--------|
| **Installation Location** | `~/.openmemory-global/` | Repository directory | Container |
| **Global Commands** | ✅ Yes | ❌ No | ❌ No |
| **Multiple Projects** | ✅ Excellent | ⚠️ Manual | ⚠️ Manual |
| **Auto-detection** | ✅ Optional watcher | ❌ No | ❌ No |
| **Development Mode** | ⚠️ Manual | ✅ Easy (`npm run dev`) | ⚠️ Rebuild needed |
| **Context Manager** | ⚠️ Manual start | ✅ Auto-starts | ✅ Auto-starts |
| **MCP Server** | ✅ Built-in | ✅ Built-in | ⚠️ Manual |
| **Project Init** | ✅ `openmemory-init` | ⚠️ `node openmemory-init.js` | ❌ Manual |
| **Updates** | ⚠️ Reinstall | ✅ `git pull` | ⚠️ Rebuild |
| **Best for** | Production use | Development | Quick testing |

---

## Which Method Should I Use?

### Use Global System Installation if:
- ✅ You want to manage multiple projects easily
- ✅ You prefer global commands (`openmemory-start`)
- ✅ You want the cleanest project directories
- ✅ You're deploying for production use
- ✅ You want automatic project detection

### Use NPM Scripts if:
- ✅ You're developing or contributing to OpenMemory
- ✅ You want the latest features immediately
- ✅ You prefer working directly in the repository
- ✅ You need hot reload during development
- ✅ You want automatic Context Manager startup

### Use Docker if:
- ✅ You just want to try OpenMemory quickly
- ✅ You prefer containerized deployments
- ✅ You're deploying to cloud infrastructure
- ✅ You want isolated environments

---

## Combining Methods

**You can use both Global System + NPM Scripts!**

Example workflow:
```bash
# 1. Install global system for production use
./.ai-agents/enforcement/install-global.sh

# 2. Use global commands for projects
openmemory-start  # Production backend

# 3. Develop in repository with npm
cd ~/OpenMemory
npm run dev  # Development with hot reload
```

This gives you:
- Global commands for production
- Easy development in repository
- Best of both worlds!

---

## Current Status: Your Installation

Based on your terminal output, you have:

✅ **Global System Installed**
- Location: `C:\Users\dbiss\.openmemory-global\`
- Commands available: `openmemory-start`, `openmemory-init`, etc.
- Backend running on port 8080
- Watchdog active

✅ **Context Manager Built and Running**
- Manually started on port 8081
- Working correctly

**Next Steps for You:**

1. **For production:** Continue using global system
   ```bash
   openmemory-start
   ```

2. **For development:** Use npm scripts (with auto Context Manager)
   ```bash
   npm start  # Starts backend + context manager automatically
   ```

3. **To avoid manual Context Manager start:**
   - Use `npm start` from repository (auto-starts everything)
   - OR: Update the global `openmemory-start` script to use our process manager

---

## Updating Global System to Use Automatic Startup

To make the global system automatically start Context Manager:

1. **Rebuild backend with process manager:**
   ```bash
   cd ~/.openmemory-global/backend
   npm run build
   ```

2. **The process manager is already integrated**, so next time you run:
   ```bash
   openmemory-start
   ```
   It will automatically start the Context Manager!

---

## Summary

- **Global System** = Production, multiple projects, clean setup
- **NPM Scripts** = Development, automatic services, hot reload
- **Docker** = Quick start, containerized deployment

All three methods are valid and can coexist. Choose based on your needs!
