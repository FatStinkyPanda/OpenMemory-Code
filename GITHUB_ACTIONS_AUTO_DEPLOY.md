# GitHub Actions: Auto-Deploy OpenMemory-Code to All Repositories

This guide explains how to automatically deploy OpenMemory-Code to all your GitHub repositories, ensuring every project benefits from unlimited AI agent memory and enforcement.

---

## 🎯 Overview

The GitHub Actions automation system provides multiple strategies to deploy OpenMemory-Code:

1. **Automatic per-repository** - Each repo auto-initializes on first push
2. **Organization-wide templates** - All new repos get workflows automatically
3. **Bulk deployment script** - Deploy to all existing repos at once
4. **Manual workflows** - Trigger setup from Actions tab

---

## 🚀 Quick Start: Deploy to All Repositories

### Option 1: Using Deployment Script (Recommended)

#### Linux/macOS:
```bash
cd /path/to/OpenMemory-Code

# Make script executable
chmod +x .github/scripts/deploy-to-all-repos.sh

# Run deployment
bash .github/scripts/deploy-to-all-repos.sh [your-github-username]
```

#### Windows (PowerShell):
```powershell
cd C:\path\to\OpenMemory-Code

# Run deployment
.\. github\scripts\deploy-to-all-repos.ps1 -Username "your-github-username"
```

**What happens:**
- ✅ Script clones each repository
- ✅ Copies GitHub Actions workflows
- ✅ Copies composite actions
- ✅ Commits and pushes changes
- ✅ Triggers auto-initialization workflow
- ✅ OpenMemory-Code sets up on next push

---

### Option 2: Organization-Wide Templates

Set up once, applies to all new repositories automatically.

#### Step 1: Create `.github` repository

```bash
# In your GitHub organization, create a repo named exactly ".github"
gh repo create .github --public --confirm
```

#### Step 2: Add workflow templates

```bash
cd .github
mkdir -p workflow-templates

# Copy workflows
cp /path/to/OpenMemory-Code/.github/workflows/openmemory-auto-init.yml \
   workflow-templates/

cp /path/to/OpenMemory-Code/.github/workflows/openmemory-enforcement.yml \
   workflow-templates/
```

#### Step 3: Create properties files

```json
// workflow-templates/openmemory-auto-init.properties.json
{
  "name": "OpenMemory-Code Auto-Initialize",
  "description": "Automatically configure OpenMemory-Code for AI development",
  "iconName": "database",
  "categories": ["Automation", "AI", "Deployment"]
}
```

```json
// workflow-templates/openmemory-enforcement.properties.json
{
  "name": "OpenMemory-Code Enforcement",
  "description": "Validate OpenMemory-Code enforcement on commits",
  "iconName": "shield",
  "categories": ["Automation", "CI", "Enforcement"]
}
```

#### Step 4: Commit and push

```bash
git add .
git commit -m "Add OpenMemory-Code workflow templates"
git push
```

**Result:** All new repositories will see these workflows in the Actions tab!

---

### Option 3: Per-Repository Manual Setup

For individual repositories:

```bash
cd /path/to/your/project

# Create directories
mkdir -p .github/workflows .github/actions

# Copy workflows
cp /path/to/OpenMemory-Code/.github/workflows/*.yml .github/workflows/
cp -r /path/to/OpenMemory-Code/.github/actions/* .github/actions/

# Commit and push
git add .github
git commit -m "Add OpenMemory-Code automation"
git push
```

Then trigger manually from Actions tab or push a commit.

---

## 📋 What Gets Installed

### 1. Workflows

#### `openmemory-auto-init.yml`
- **Triggers:** Push to main/master/develop, manual dispatch
- **Purpose:** Automatically sets up OpenMemory-Code
- **Actions:**
  - Downloads OpenMemory-Code distribution
  - Copies .ai-agents folder
  - Creates .openmemory link file
  - Installs git hooks
  - Commits setup files
  - Generates setup summary

#### `openmemory-enforcement.yml`
- **Triggers:** All pushes, pull requests
- **Purpose:** Validates OpenMemory-Code configuration
- **Checks:**
  - Installation status
  - Enforcement configuration
  - File structure
  - JSON validity
  - Backend connectivity
  - Generates compliance report

### 2. Composite Action

#### `.github/actions/openmemory-setup`
- Reusable action for setup logic
- Can be called from custom workflows
- Inputs: URL, project name, skip options
- Outputs: Status, enforcement state

### 3. Deployment Scripts

#### `.github/scripts/deploy-to-all-repos.sh` (Linux/macOS)
- Bash script for bulk deployment
- Clones, configures, commits, pushes all repos
- Progress tracking and error handling

#### `.github/scripts/deploy-to-all-repos.ps1` (Windows)
- PowerShell equivalent for Windows users
- Same functionality as bash version

---

## 🔧 Configuration

### Repository Settings

**Required permissions:**
1. Settings → Actions → General
2. Set "Workflow permissions" to **"Read and write permissions"**
3. Check **"Allow GitHub Actions to create and approve pull requests"**

### Environment Variables

Create repository secrets/variables:

```yaml
# Settings → Secrets and variables → Actions
OPENMEMORY_URL=http://localhost:8080  # Or your backend URL
```

Update workflow to use:
```yaml
with:
  openmemory-url: ${{ secrets.OPENMEMORY_URL || 'http://localhost:8080' }}
```

### Customization

Edit workflows to customize behavior:

```yaml
# Skip certain repos
- name: 'Check if should skip'
  if: contains(github.repository, 'docs') == false
  # ...rest of workflow
```

```yaml
# Custom project naming
with:
  project-name: 'MyCustomName-${{ github.repository }}'
```

```yaml
# Skip hook installation for specific repos
with:
  install-hooks: ${{ github.repository != 'my-org/special-repo' }}
```

---

## 🎯 How It Works

### First Push Scenario:

```
Developer creates new repository
         ↓
Adds workflows (via template or manual)
         ↓
Makes first commit and pushes
         ↓
GitHub Actions triggers openmemory-auto-init.yml
         ↓
Action downloads OpenMemory-Code
         ↓
Copies .ai-agents folder and creates .openmemory link
         ↓
Installs git hooks for enforcement
         ↓
Commits setup files
         ↓
Pushes back to repository
         ↓
OpenMemory-Code fully configured! ✅
         ↓
All future commits enforced
```

### Enforcement Workflow:

```
Developer makes commit
         ↓
Local git hooks validate (if installed)
         ↓
Pushes to GitHub
         ↓
GitHub Actions triggers openmemory-enforcement.yml
         ↓
Validates installation and configuration
         ↓
Checks file structure and JSON validity
         ↓
Generates compliance report
         ↓
Passes or fails PR/push based on validation
```

---

## 📊 Monitoring and Reports

### View Workflow Status:

```bash
# Using GitHub CLI
gh run list --workflow=openmemory-auto-init.yml

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

### Check Setup Status:

Every workflow run generates a summary visible in:
- Actions tab → Select run → Scroll to bottom

### Example Summary:

```
## 🤖 OpenMemory-Code Initialized

✅ .ai-agents folder - Complete enforcement system
✅ .openmemory link - Connection to OpenMemory backend
✅ Git hooks - Automatic enforcement on commits
✅ Logging system - Track all AI agent actions
✅ Configuration files - Pre-configured templates

Next Steps:
1. Start OpenMemory backend: npm start
2. Pull changes: git pull
3. Start coding!
```

---

## 🔍 Troubleshooting

### Script Requirements Not Met

**Error:** `GitHub CLI (gh) is not installed`
**Solution:**
```bash
# Install GitHub CLI
# macOS: brew install gh
# Ubuntu: sudo apt install gh
# Windows: winget install GitHub.cli

# Authenticate
gh auth login
```

### Workflow Not Triggering

**Problem:** Pushed code but workflow didn't run
**Solutions:**
1. Check workflow is in `.github/workflows/` directory
2. Verify workflow permissions (Settings → Actions)
3. Ensure YAML syntax is valid: `yamllint .github/workflows/*.yml`
4. Check branch name matches trigger (main vs master)

### Setup Fails

**Problem:** Action fails during setup
**Solutions:**
1. Check Actions logs for specific error
2. Verify write permissions enabled
3. Ensure git is configured
4. Try manual trigger with force option

### Hooks Not Installing

**Problem:** Git hooks not found after setup
**Solutions:**
```bash
# Manual installation
cd /path/to/project
bash .ai-agents/enforcement/git-hooks/install-hooks.sh "$(pwd)"

# Verify
ls -la .git/hooks/
```

### Backend Not Reachable

**Problem:** Workflow warns backend unavailable
**Solution:** This is expected! Backend only needed for local development, not CI/CD.

### Permission Denied

**Problem:** `Permission denied` when running scripts
**Solutions:**
```bash
# Make executable
chmod +x .github/scripts/deploy-to-all-repos.sh

# Or run with bash explicitly
bash .github/scripts/deploy-to-all-repos.sh
```

### Existing .openmemory File

**Problem:** Script skips repo with `.openmemory` already present
**Solutions:**
- Use force option in manual workflow trigger
- Delete `.openmemory` and `.ai-agents` then re-run
- This is expected behavior for already-configured repos

---

## 🚀 Advanced Usage

### Custom Workflow Combining Setup and Tests

```yaml
name: 'CI with OpenMemory'

on: [push, pull_request]

jobs:
  setup-test-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Setup OpenMemory-Code
      - name: 'Setup OpenMemory-Code'
        uses: ./.github/actions/openmemory-setup
        with:
          openmemory-url: 'http://localhost:8080'

      # Run your tests
      - name: 'Run tests'
        run: npm test

      # Validate enforcement
      - name: 'Check enforcement'
        run: |
          if [ ! -f ".ai-agents/enforcement-status.json" ]; then
            echo "Enforcement not configured!"
            exit 1
          fi
```

### Conditional Setup

```yaml
- name: 'Setup if needed'
  if: |
    !contains(github.event.head_commit.message, '[skip-openmemory]') &&
    hashFiles('.openmemory') == ''
  uses: ./.github/actions/openmemory-setup
```

### Multi-Environment Setup

```yaml
jobs:
  setup-dev:
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: ./.github/actions/openmemory-setup
        with:
          openmemory-url: 'http://dev.openmemory:8080'

  setup-prod:
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: ./.github/actions/openmemory-setup
        with:
          openmemory-url: 'http://prod.openmemory:8080'
```

### Integration with Other Actions

```yaml
- name: 'Setup dependencies'
  uses: actions/setup-node@v4

- name: 'Setup OpenMemory-Code'
  uses: ./.github/actions/openmemory-setup

- name: 'Build'
  run: npm run build

- name: 'Deploy'
  uses: some-deploy-action@v1
```

---

## 📈 Scaling to Large Organizations

### For 100+ Repositories:

1. **Use deployment script in batches:**
   ```bash
   # Process repos in chunks
   gh repo list --limit 1000 | head -n 50 > batch1.txt
   while read repo; do
     # Process each repo
   done < batch1.txt
   ```

2. **Run in parallel:**
   ```bash
   cat repos.txt | xargs -P 10 -I {} bash -c "process_repo {}"
   ```

3. **Monitor progress:**
   ```bash
   gh run list --limit 100 | grep "OpenMemory-Code"
   ```

### For Organizations with Custom Policies:

1. **Create branch protection rules**
2. **Require status checks to pass**
3. **Add `openmemory-enforcement` as required check**

---

## ✅ Verification

### Confirm Setup Succeeded:

```bash
# In your repository
ls -la .ai-agents/
ls -la .openmemory
ls -la .git/hooks/pre-commit

# Check enforcement status
cat .ai-agents/enforcement-status.json
```

Expected output:
```json
{
  "project": "YourProjectName",
  "git_hooks_installed": true,
  "enforcement_active": true,
  "timestamp": "2025-...",
  "automated_by": "github-actions"
}
```

### Test Enforcement:

```bash
# Make a test commit
echo "test" > test.txt
git add test.txt
git commit -m "test commit"

# Hooks should validate before commit
# Push should trigger enforcement workflow
git push
```

Check Actions tab for workflow run.

---

## 🎉 Success Criteria

Your OpenMemory-Code automation is working when:

- ✅ New repos automatically get workflows
- ✅ First push triggers auto-initialization
- ✅ `.ai-agents` folder appears after setup
- ✅ `.openmemory` link file created
- ✅ Git hooks installed locally
- ✅ Enforcement workflow runs on pushes
- ✅ PR checks validate configuration
- ✅ Compliance reports generated
- ✅ AI agents can use OpenMemory

---

## 📝 Summary

| Method | Speed | Scope | Best For |
|--------|-------|-------|----------|
| **Deployment Script** | Fast | All repos | Existing repos bulk setup |
| **Org Templates** | Auto | New repos | Future repos |
| **Per-Repo Manual** | Manual | Single repo | Testing, one-off setup |
| **Workflow Trigger** | On-demand | Single repo | Re-initialization |

**Recommended Approach:**
1. Use **organization templates** for automatic future coverage
2. Run **deployment script** once for all existing repos
3. Use **manual trigger** for re-initialization when needed

---

## 🔗 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Composite Actions](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)
- [Organization Workflow Templates](https://docs.github.com/en/actions/using-workflows/creating-starter-workflows-for-your-organization)
- [GitHub CLI](https://cli.github.com/)
- [OpenMemory-Code Repository](https://github.com/FatStinkyPanda/OpenMemory-Code)

---

## 💡 Tips

- **Start small:** Test on 1-2 repos before bulk deployment
- **Use dry-run:** Add echo statements to scripts to preview actions
- **Monitor workflows:** Check Actions tab regularly during bulk deployment
- **Handle failures:** Script continues on individual repo failures
- **Version control:** Commit workflow changes before deploying
- **Backup configs:** Keep backups of custom configurations
- **Document customizations:** Add comments to custom workflow edits

---

## 🆘 Support

**Issues:** https://github.com/FatStinkyPanda/OpenMemory-Code/issues
**Discussions:** https://github.com/FatStinkyPanda/OpenMemory-Code/discussions
**Email:** support@fatstinkypanda.com

---

**Made with ❤️ for automated AI agent development**

*OpenMemory-Code - Unlimited memory for AI coding assistants*
