# Quick Deploy Guide: OpenMemory-Code to All Your GitHub Repositories

Get OpenMemory-Code on all your repositories in under 5 minutes!

---

## 🚀 Fastest Method: Bulk Deployment Script

### Linux/macOS:

```bash
# 1. Navigate to OpenMemory-Code
cd /path/to/OpenMemory-Code

# 2. Run the deployment script
bash .github/scripts/deploy-to-all-repos.sh your-github-username

# 3. Confirm when prompted
# Type 'y' and press Enter

# 4. Wait for completion (shows progress for each repo)

# ✅ Done! All repos now have OpenMemory-Code automation
```

### Windows (PowerShell):

```powershell
# 1. Navigate to OpenMemory-Code
cd C:\path\to\OpenMemory-Code

# 2. Run the deployment script
.\. github\scripts\deploy-to-all-repos.ps1 -Username "your-github-username"

# 3. Confirm when prompted
# Type 'y' and press Enter

# 4. Wait for completion

# ✅ Done!
```

---

## 📋 What Happens Next

### Immediately:
- ✅ All repositories get `.github/workflows/` added
- ✅ Auto-init workflow installed
- ✅ Enforcement workflow installed
- ✅ Changes committed and pushed

### On Next Push to Any Repo:
- ✅ Auto-init workflow triggers
- ✅ Downloads OpenMemory-Code
- ✅ Creates `.ai-agents/` folder
- ✅ Creates `.openmemory` link file
- ✅ Installs git hooks
- ✅ Commits setup files

### From Then On:
- 🧠 AI agents have unlimited long-term memory
- 🔒 All commits validated by enforcement
- 📊 Automatic logging and tracing
- 🎯 Context injection for all AI tools

---

## ✅ Verification

### Check a Repository:

```bash
cd /path/to/any/repo
git pull  # Get the automation commits

# Should see:
ls .github/workflows/
# openmemory-auto-init.yml
# openmemory-enforcement.yml

ls .github/actions/
# openmemory-setup/
```

### Trigger Setup Manually:

```bash
# Go to repository on GitHub
# → Actions tab
# → Select "OpenMemory-Code Auto-Initialize"
# → Click "Run workflow"
# → Click green "Run workflow" button
```

### After Setup Completes:

```bash
git pull

ls -la .ai-agents/      # Should exist
ls -la .openmemory      # Should exist
ls -la .git/hooks/pre-commit  # Should exist
```

---

## 🎯 Three Deployment Options

| Method | Time | Repos | When to Use |
|--------|------|-------|-------------|
| **Bulk Script** | 5 min | All existing | Deploy now to everything |
| **Org Templates** | 10 min | All future | Auto-apply to new repos |
| **Manual Per-Repo** | 2 min | One | Testing or single repo |

---

## 💡 Pro Tips

**Tip 1:** Run bulk script first, then set up org templates for future repos

**Tip 2:** Test on one repo before bulk deployment:
```bash
cd test-repo
cp -r /path/to/OpenMemory-Code/.github .
git add .github
git commit -m "Test OpenMemory-Code"
git push
# Check Actions tab to see if it works
```

**Tip 3:** If script fails on some repos, it continues with others

**Tip 4:** Re-run script anytime - it skips already-configured repos

---

## 🔧 Prerequisites

### Quick Check:

```bash
# Check if you have everything:
gh --version      # GitHub CLI (required)
git --version     # Git (required)
jq --version      # JSON processor (Linux/macOS only)
```

### Install if Missing:

**GitHub CLI:**
```bash
# macOS:
brew install gh

# Ubuntu/Debian:
sudo apt install gh

# Windows:
winget install GitHub.cli

# Then authenticate:
gh auth login
```

**jq (Linux/macOS only):**
```bash
# macOS:
brew install jq

# Ubuntu/Debian:
sudo apt install jq
```

---

## 📊 Expected Output

```
═══════════════════════════════════════════════════════════════════
OpenMemory-Code: Deploy to All Repositories
═══════════════════════════════════════════════════════════════════

ℹ  Checking requirements...
✅ All requirements met

ℹ  GitHub user: your-username
ℹ  Fetching repositories for user: your-username...
✅ Found 42 repositories

Deploy OpenMemory-Code to ALL repositories for your-username? (y/N): y

───────────────────────────────────────────────────────────────────
ℹ  Processing: repo1
ℹ    Cloning...
ℹ    Copying workflows...
ℹ    Copying actions...
ℹ    Committing changes...
ℹ    Pushing changes...
ℹ    Triggering auto-init workflow...
✅ Completed: repo1

───────────────────────────────────────────────────────────────────
ℹ  Processing: repo2
⚠️   Already has OpenMemory-Code - skipping

... (continues for all repos)

═══════════════════════════════════════════════════════════════════
Deployment Summary
═══════════════════════════════════════════════════════════════════

✅ Successfully deployed: 35 repositories
⚠️  Skipped (already set up): 5 repositories
❌ Failed: 2 repositories

✅ All repositories processed successfully!

Next steps:
  1. Push to any repository triggers auto-initialization
  2. Or manually trigger workflows from Actions tab
  3. Start OpenMemory backend: npm start
```

---

## 🆘 Troubleshooting

### "GitHub CLI not installed"
```bash
# Install gh CLI (see Prerequisites above)
gh --version
gh auth login
```

### "Permission denied"
```bash
chmod +x .github/scripts/deploy-to-all-repos.sh
```

### "Failed to push"
- Check repository permissions
- Ensure workflows are enabled in org settings
- Verify you have write access to repos

### "Workflow not triggering"
- Push a commit to trigger
- Or manually trigger from Actions tab
- Check workflow permissions in repo settings

---

## 🎉 Success Checklist

After running deployment:

- [ ] Script completed without errors
- [ ] All repos show new commits in history
- [ ] `.github/workflows/` visible in repos
- [ ] Actions tab shows workflows available
- [ ] Test push triggers auto-initialization
- [ ] After init, `.ai-agents/` folder exists
- [ ] After init, `.openmemory` file exists
- [ ] Enforcement workflow runs on commits

---

## 📞 Need Help?

- **Issues:** https://github.com/FatStinkyPanda/OpenMemory-Code/issues
- **Docs:** See `GITHUB_ACTIONS_AUTO_DEPLOY.md` for full documentation
- **Email:** support@fatstinkypanda.com

---

**That's it! You're ready to deploy OpenMemory-Code everywhere! 🚀**
