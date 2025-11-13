###############################################################################
# OpenMemory-Code: Deploy to All Repositories Script (PowerShell)
###############################################################################
#
# This script automatically adds OpenMemory-Code automation to all your
# GitHub repositories.
#
# Usage:
#   .\deploy-to-all-repos.ps1 [-Username "your-username"]
#
# Requirements:
#   - GitHub CLI (gh) installed and authenticated
#   - Git installed
#
# What it does:
#   1. Lists all your repositories
#   2. For each repository:
#      - Clones it (shallow)
#      - Copies .github workflows and actions
#      - Commits and pushes changes
#      - Triggers the auto-init workflow
#
###############################################################################

param(
    [string]$Username = ""
)

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "ℹ  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check requirements
function Test-Requirements {
    Write-Info "Checking requirements..."

    # Check gh CLI
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Error-Custom "GitHub CLI (gh) is not installed"
        Write-Info "Install from: https://cli.github.com/"
        exit 1
    }

    # Check git
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error-Custom "Git is not installed"
        exit 1
    }

    # Check authentication
    try {
        gh auth status 2>&1 | Out-Null
    }
    catch {
        Write-Error-Custom "Not authenticated with GitHub CLI"
        Write-Info "Run: gh auth login"
        exit 1
    }

    Write-Success "All requirements met"
}

# Get OpenMemory-Code root
function Get-OpenMemoryRoot {
    # Script is in .github/scripts/, so go up two levels
    $scriptDir = Split-Path -Parent $PSCommandPath
    $openMemoryRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
    return $openMemoryRoot
}

# Get list of repositories
function Get-Repositories {
    param([string]$Username)

    Write-Info "Fetching repositories for user: $Username..."

    $reposJson = gh repo list $Username --limit 1000 --json name,isPrivate,isFork | ConvertFrom-Json
    $repos = $reposJson | Where-Object { $_.isFork -eq $false } | Select-Object -ExpandProperty name

    if (-not $repos) {
        Write-Error-Custom "No repositories found for user: $Username"
        exit 1
    }

    $count = ($repos | Measure-Object).Count
    Write-Success "Found $count repositories"

    return $repos
}

# Process a single repository
function Process-Repository {
    param(
        [string]$Username,
        [string]$Repo,
        [string]$OpenMemoryRoot,
        [string]$WorkDir
    )

    Write-Info "Processing: $Repo"

    $repoDir = Join-Path $WorkDir $Repo

    # Clone repository (shallow)
    Write-Info "  Cloning..."
    try {
        git clone --depth 1 "https://github.com/$Username/$Repo.git" $repoDir 2>&1 | Out-Null
    }
    catch {
        Write-Error-Custom "  Failed to clone $Repo"
        return $false
    }

    Push-Location $repoDir

    # Check if already set up
    if ((Test-Path ".openmemory") -and (Test-Path ".ai-agents")) {
        Write-Warning "  Already has OpenMemory-Code - skipping"
        Pop-Location
        return "skip"
    }

    # Create .github directories
    New-Item -ItemType Directory -Force -Path ".github/workflows" | Out-Null
    New-Item -ItemType Directory -Force -Path ".github/actions" | Out-Null

    # Copy workflows
    Write-Info "  Copying workflows..."
    $workflowsSource = Join-Path $OpenMemoryRoot ".github/workflows"
    if (Test-Path $workflowsSource) {
        Get-ChildItem -Path $workflowsSource -Filter "*.yml" | ForEach-Object {
            Copy-Item $_.FullName -Destination ".github/workflows/" -Force
        }
    }

    # Copy actions
    Write-Info "  Copying actions..."
    $actionsSource = Join-Path $OpenMemoryRoot ".github/actions"
    if (Test-Path $actionsSource) {
        Get-ChildItem -Path $actionsSource -Directory | ForEach-Object {
            Copy-Item $_.FullName -Destination ".github/actions/" -Recurse -Force
        }
    }

    # Check if there are changes
    $gitStatus = git status --porcelain
    if (-not $gitStatus) {
        Write-Warning "  No changes needed"
        Pop-Location
        return "skip"
    }

    # Configure git
    git config user.name "OpenMemory-Code Bot"
    git config user.email "bot@openmemory-code.local"

    # Commit changes
    Write-Info "  Committing changes..."
    git add .github
    git commit -m @"
🤖 Add OpenMemory-Code automation

- Added auto-initialization workflow
- Added enforcement validation workflow
- Added openmemory-setup composite action

OpenMemory-Code will automatically configure on next push.

Deployed by: deploy-to-all-repos.ps1
"@

    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "  Failed to commit"
        Pop-Location
        return $false
    }

    # Push changes
    Write-Info "  Pushing changes..."
    git push origin main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        git push origin master 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "  Failed to push to $Repo"
            Pop-Location
            return $false
        }
    }

    # Trigger the auto-init workflow
    Write-Info "  Triggering auto-init workflow..."
    gh workflow run openmemory-auto-init.yml --repo "$Username/$Repo" 2>&1 | Out-Null

    Pop-Location
    Write-Success "Completed: $Repo"
    return $true
}

# Main function
function Main {
    Write-Host "═══════════════════════════════════════════════════════════════════"
    Write-Host "OpenMemory-Code: Deploy to All Repositories"
    Write-Host "═══════════════════════════════════════════════════════════════════"
    Write-Host ""

    # Check requirements
    Test-Requirements
    Write-Host ""

    # Get username
    if (-not $Username) {
        $Username = gh api user -q .login
    }
    Write-Info "GitHub user: $Username"
    Write-Host ""

    # Confirm
    $confirm = Read-Host "Deploy OpenMemory-Code to ALL repositories for $Username? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Warning "Aborted by user"
        exit 0
    }
    Write-Host ""

    # Get OpenMemory root
    $openMemoryRoot = Get-OpenMemoryRoot
    Write-Info "OpenMemory-Code location: $openMemoryRoot"
    Write-Host ""

    # Create work directory
    $workDir = Join-Path $env:TEMP "openmemory-deploy-$(Get-Random)"
    New-Item -ItemType Directory -Force -Path $workDir | Out-Null
    Write-Info "Work directory: $workDir"
    Write-Host ""

    # Get repositories
    $repos = Get-Repositories -Username $Username
    Write-Host ""

    # Process each repository
    $success = 0
    $failed = 0
    $skipped = 0

    foreach ($repo in $repos) {
        Write-Host "───────────────────────────────────────────────────────────────────"
        $result = Process-Repository -Username $Username -Repo $repo -OpenMemoryRoot $openMemoryRoot -WorkDir $workDir

        if ($result -eq $true) {
            $success++
        }
        elseif ($result -eq "skip") {
            $skipped++
        }
        else {
            $failed++
        }
        Write-Host ""
    }

    # Cleanup
    Write-Info "Cleaning up..."
    Remove-Item -Path $workDir -Recurse -Force

    # Summary
    Write-Host "═══════════════════════════════════════════════════════════════════"
    Write-Host "Deployment Summary"
    Write-Host "═══════════════════════════════════════════════════════════════════"
    Write-Host ""
    Write-Success "Successfully deployed: $success repositories"
    if ($skipped -gt 0) { Write-Warning "Skipped (already set up): $skipped repositories" }
    if ($failed -gt 0) { Write-Error-Custom "Failed: $failed repositories" }
    Write-Host ""

    if ($failed -eq 0) {
        Write-Success "All repositories processed successfully!"
        Write-Host ""
        Write-Info "Next steps:"
        Write-Host "  1. Push to any repository triggers auto-initialization"
        Write-Host "  2. Or manually trigger workflows from Actions tab"
        Write-Host "  3. Start OpenMemory backend: npm start"
        Write-Host ""
    }
    else {
        Write-Warning "Some repositories failed - check errors above"
    }
}

# Run main function
Main
