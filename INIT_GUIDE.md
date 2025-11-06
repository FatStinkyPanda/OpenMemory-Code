# OpenMemory-Code Project Initialization Guide

This guide explains how to initialize new projects to work with OpenMemory-Code.

## Quick Start

### Option 1: Using PowerShell Script (Recommended for Windows)

```powershell
# From the OpenMemory-Code directory, initialize any project:
.\openmemory-init.ps1 C:\Path\To\Your\Project

# Or initialize the current directory:
.\openmemory-init.ps1

# Or initialize a relative path:
.\openmemory-init.ps1 ..\MyNewProject
```

### Option 2: Using npm Script

```bash
# From the OpenMemory-Code directory:
npm run init-project C:\Path\To\Your\Project

# Or for current directory:
npm run init-project .
```

### Option 3: Using Node.js Directly

```bash
# From the OpenMemory-Code directory:
node openmemory-init.js C:\Path\To\Your\Project
```

### Option 4: Install Globally (One-time setup)

```bash
# Install OpenMemory-Code globally
cd C:\Path\To\OpenMemory-Code
npm link

# Now you can use it anywhere:
cd C:\Path\To\Any\Project
openmemory-init
```

## What Initialization Does

1. **Creates Global Registry** (`~/.openmemory-global/`)
   - Registers your project in the global OpenMemory registry
   - Tracks all projects using OpenMemory

2. **Creates `.openmemory` File** in your project
   - Links your project to the OpenMemory backend
   - Contains project-specific configuration
   - Automatically added to `.gitignore` if one exists

3. **Project Registration**
   - Stores project name and path
   - Enables OpenMemory context injection for AI agents

## After Initialization

### Start the OpenMemory Backend

```bash
cd C:\Path\To\OpenMemory-Code
npm start
```

The backend will run on `http://localhost:8080`

### Start Coding!

Open your initialized project in your IDE and start coding. AI agents will automatically:
- Store decisions and patterns in OpenMemory
- Remember context across sessions
- Track project progress
- Provide intelligent suggestions based on project history

## File Structure Created

```
Your-Project/
├── .openmemory          # OpenMemory link file (auto-generated)
└── .gitignore           # Updated with .openmemory entry

~/.openmemory-global/
└── projects/
    └── registry.json    # Global project registry
```

## `.openmemory` File Format

```env
GLOBAL_DIR=C:\Users\YourUser\.openmemory-global
PROJECT_NAME=YourProjectName
OPENMEMORY_URL=http://localhost:8080
```

## Troubleshooting

### "openmemory-init is not recognized"

**Solution 1:** Use the PowerShell script
```powershell
.\openmemory-init.ps1
```

**Solution 2:** Install globally
```bash
cd C:\Path\To\OpenMemory-Code
npm link
```

### "Project already registered"

This is normal if you've initialized the project before. The script will skip re-registration if the path matches.

### "Node.js not found"

Install Node.js from [nodejs.org](https://nodejs.org/)

### Backend Not Running

Make sure the OpenMemory backend is started:
```bash
cd C:\Path\To\OpenMemory-Code
npm start
```

## Advanced Usage

### Initialize Multiple Projects

```powershell
# Initialize several projects at once
.\openmemory-init.ps1 C:\Projects\Project1
.\openmemory-init.ps1 C:\Projects\Project2
.\openmemory-init.ps1 C:\Projects\Project3
```

### View Registered Projects

The registry is stored at: `~/.openmemory-global/projects/registry.json`

```powershell
# View registry
cat ~\.openmemory-global\projects\registry.json
```

### Unregister a Project

Simply delete the `.openmemory` file from your project and remove the entry from the registry.

## Integration with AI Agents

Once initialized, your project can use:

1. **Context Injection** - Automatic context from OpenMemory
2. **MCP Server** - Claude Desktop integration
3. **Agent Enforcement** - Mandatory memory usage for AI agents
4. **Progress Tracking** - Automatic project state management

## Next Steps

1. **Read the Main README** - `README.md` in OpenMemory-Code
2. **Configure AI Agents** - See `.ai-agents/` directory
3. **Start Building** - AI agents will automatically use OpenMemory
4. **Review Context** - Check `.ai-agents/project-state.json` as it evolves

## Support

- GitHub Issues: https://github.com/FatStinkyPanda/OpenMemory-Code/issues
- Documentation: https://github.com/FatStinkyPanda/OpenMemory-Code
