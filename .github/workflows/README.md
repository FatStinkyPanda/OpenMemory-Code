# OpenMemory-Code GitHub Actions Workflows

This directory contains GitHub Actions workflows for automatically deploying and enforcing OpenMemory-Code across all your repositories.

## 🚀 Workflows Overview

### 1. **openmemory-auto-init.yml** - Automatic Initialization
**Triggers:**
- On push to main/master/develop branches
- Manual dispatch (Actions tab)

**Purpose:** Automatically sets up OpenMemory-Code on first commit or when manually triggered.

**What it does:**
- ✅ Checks if OpenMemory-Code is already set up
- ✅ Downloads and installs .ai-agents folder
- ✅ Creates .openmemory link file
- ✅ Installs git hooks for enforcement
- ✅ Commits setup files
- ✅ Pushes changes back to repository

**Manual trigger:**
```
1. Go to Actions tab in your repository
2. Select "OpenMemory-Code Auto-Initialize"
3. Click "Run workflow"
4. (Optional) Check "Force re-initialization" to reset
```

---

### 2. **openmemory-enforcement.yml** - Enforcement Validation
**Triggers:**
- On all pushes to any branch
- On pull requests to main/master/develop

**Purpose:** Validates that OpenMemory-Code is properly configured and enforced.

**What it checks:**
- ✅ OpenMemory-Code installation status
- ✅ Enforcement status and git hooks
- ✅ .ai-agents folder structure
- ✅ Configuration file validity (JSON)
- ✅ OpenMemory backend connectivity (warns if unavailable)

**Reports:**
- GitHub Actions summary with enforcement status
- Warnings for missing components
- Errors for invalid configurations

---

## 🛠️ Custom Action: openmemory-setup

Located in `.github/actions/openmemory-setup/`, this is a reusable composite action that handles all setup logic.

### Inputs:
- `openmemory-url` - OpenMemory backend URL (default: http://localhost:8080)
- `skip-backend-setup` - Skip backend setup if already running (default: false)
- `project-name` - Project name (defaults to repository name)
- `install-hooks` - Install git hooks (default: true)

### Outputs:
- `setup-status` - Status: success, partial, or failed
- `enforcement-active` - Whether enforcement is active
- `project-initialized` - Whether project was initialized

### Usage in your own workflows:
```yaml
- name: 'Setup OpenMemory-Code'
  uses: ./.github/actions/openmemory-setup
  with:
    openmemory-url: 'http://localhost:8080'
    install-hooks: 'true'
    project-name: ${{ github.event.repository.name }}
```

---

## 📋 Organization-Level Setup

### For All Repos in Your GitHub Account/Organization:

#### Option 1: Using Organization Workflow Templates

1. **Create a `.github` repository in your organization:**
   ```bash
   # This repo must be named exactly ".github"
   # It will apply templates to all repos in the organization
   ```

2. **Copy workflow templates:**
   ```bash
   mkdir -p workflow-templates
   cp .github/workflows/openmemory-auto-init.yml workflow-templates/
   cp .github/workflows/openmemory-enforcement.yml workflow-templates/
   ```

3. **Create properties files:**
   ```json
   // workflow-templates/openmemory-auto-init.properties.json
   {
     "name": "OpenMemory-Code Auto Setup",
     "description": "Automatically configure OpenMemory-Code for AI development",
     "iconName": "database",
     "categories": ["automation", "ai"]
   }
   ```

4. **All new repositories will see these workflows as templates**

#### Option 2: Using Repository Templates

1. **Create a template repository:**
   - Go to your OpenMemory-Code repository settings
   - Check "Template repository"

2. **When creating new repositories:**
   - Select "Use this template"
   - OpenMemory-Code will be pre-configured

#### Option 3: Using GitHub API/Scripts

Create a script to automatically add workflows to all repos:

```bash
#!/bin/bash
# add-openmemory-to-all-repos.sh

GITHUB_USERNAME="your-username"
GITHUB_TOKEN="your-token"

# Get all repositories
repos=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/users/$GITHUB_USERNAME/repos?per_page=100" \
  | jq -r '.[].name')

for repo in $repos; do
  echo "Setting up OpenMemory-Code for $repo..."

  # Clone repo
  git clone "https://github.com/$GITHUB_USERNAME/$repo.git" "/tmp/$repo"
  cd "/tmp/$repo"

  # Copy workflows
  mkdir -p .github/workflows .github/actions
  cp -r /path/to/OpenMemory-Code/.github/workflows/* .github/workflows/
  cp -r /path/to/OpenMemory-Code/.github/actions/* .github/actions/

  # Commit and push
  git add .github
  git commit -m "Add OpenMemory-Code automation"
  git push

  cd -
  rm -rf "/tmp/$repo"
done
```

---

## 🎯 Setup Instructions

### For Individual Repositories:

**Method 1: Copy workflows directly**
```bash
# In your project repository
mkdir -p .github/workflows .github/actions
cp -r /path/to/OpenMemory-Code/.github/* .github/
git add .github
git commit -m "Add OpenMemory-Code workflows"
git push
```

**Method 2: Use as submodule**
```bash
git submodule add https://github.com/FatStinkyPanda/OpenMemory-Code.git .openmemory-code
ln -s .openmemory-code/.github .github
```

**Method 3: Manual trigger after copying**
```bash
# Copy workflows, then go to Actions tab and manually trigger
```

### For All Repositories (Organization-wide):

1. **Create `.github` repository in your organization**
2. **Add workflow templates (see Option 1 above)**
3. **All new repos get templates automatically**
4. **For existing repos, use bulk script (see Option 3 above)**

---

## 🔧 Configuration

### Environment Variables

You can configure workflows using repository secrets/variables:

```yaml
# In your repository settings -> Secrets and variables -> Actions
OPENMEMORY_URL=http://your-backend:8080
```

Then update workflows to use:
```yaml
with:
  openmemory-url: ${{ secrets.OPENMEMORY_URL || 'http://localhost:8080' }}
```

### Workflow Permissions

Ensure your repository has proper workflow permissions:
1. Go to Settings -> Actions -> General
2. Set "Workflow permissions" to "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"

---

## 📊 Monitoring

### Check workflow status:
```bash
# Via GitHub CLI
gh run list --workflow=openmemory-auto-init.yml

# View specific run
gh run view <run-id>

# Download logs
gh run download <run-id>
```

### View enforcement reports:
- Go to Actions tab
- Click on any workflow run
- Scroll to bottom for enforcement report summary

---

## 🔍 Troubleshooting

### Workflow not triggering?
- Check workflow permissions in Settings -> Actions
- Ensure workflows are in `.github/workflows/` directory
- Verify YAML syntax: `yamllint .github/workflows/*.yml`

### Setup fails?
- Check workflow logs in Actions tab
- Verify git is properly configured
- Ensure repository has write permissions

### Hooks not installing?
- Run manual setup: `bash .ai-agents/enforcement/git-hooks/install-hooks.sh`
- Check that `.ai-agents/enforcement/git-hooks/` exists
- Verify shell script permissions

### Backend not reachable?
- This is expected in CI/CD (workflows run in GitHub's cloud)
- Backend only needs to be running for local development
- Workflows will warn but not fail if backend unavailable

---

## 🚀 Advanced Usage

### Custom workflow combining setup and tests:
```yaml
name: 'CI with OpenMemory'

on: [push, pull_request]

jobs:
  setup-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 'Setup OpenMemory-Code'
        uses: ./.github/actions/openmemory-setup

      - name: 'Run tests'
        run: npm test

      - name: 'Validate enforcement'
        run: |
          # Your custom enforcement checks
```

### Conditional setup based on file presence:
```yaml
- name: 'Setup if needed'
  if: |
    !contains(github.event.head_commit.message, '[skip-openmemory]') &&
    hashFiles('.openmemory') == ''
  uses: ./.github/actions/openmemory-setup
```

---

## 📝 License

Part of OpenMemory-Code - MIT License
Copyright (c) 2025 Daniel A Bissey

---

## 🔗 Links

- [OpenMemory-Code Repository](https://github.com/FatStinkyPanda/OpenMemory-Code)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Composite Actions Guide](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)
- [Workflow Templates](https://docs.github.com/en/actions/using-workflows/creating-starter-workflows-for-your-organization)

---

**Questions or issues?** [Open an issue](https://github.com/FatStinkyPanda/OpenMemory-Code/issues)
