# OpenMemory-Code: Simple Bulk Deployment Script
# Usage: .\deploy-now.ps1

param([string]$Username = "FatStinkyPanda")

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "OpenMemory-Code: Deploy to All Repositories" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

# Check gh CLI
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: GitHub CLI not installed. Get it from https://cli.github.com/" -ForegroundColor Red
    exit 1
}

# Check git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Git not installed" -ForegroundColor Red
    exit 1
}

Write-Host "INFO: Requirements met" -ForegroundColor Green
Write-Host ""

# Check auth
try {
    gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Host "ERROR: Not authenticated. Run: gh auth login" -ForegroundColor Red
    exit 1
}

Write-Host "INFO: Authenticated as $Username" -ForegroundColor Green
Write-Host ""

# Get root
$OpenMemoryRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSCommandPath))
Write-Host "INFO: OpenMemory-Code: $OpenMemoryRoot" -ForegroundColor Cyan
Write-Host ""

# Confirm
$confirm = Read-Host "Deploy to ALL repos for $Username? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Aborted" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "INFO: Fetching repositories..." -ForegroundColor Cyan

# Get repos
$reposJson = gh repo list $Username --limit 100 --json name,isFork
$repos = ($reposJson | ConvertFrom-Json) | Where-Object { $_.isFork -eq $false }

if (-not $repos) {
    Write-Host "ERROR: No repos found" -ForegroundColor Red
    exit 1
}

$total = ($repos | Measure-Object).Count
Write-Host "INFO: Found $total repositories" -ForegroundColor Green
Write-Host ""

# Counters
$success = 0
$skipped = 0
$failed = 0

# Process each repo
foreach ($repo in $repos) {
    $name = $repo.name
    Write-Host "-------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Processing: $name" -ForegroundColor Cyan

    $tempDir = Join-Path $env:TEMP "om-deploy-$name-$(Get-Random)"

    try {
        # Clone
        Write-Host "  Cloning..." -ForegroundColor Gray
        git clone --depth 1 "https://github.com/$Username/$name.git" $tempDir 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            Write-Host "  SKIP: Clone failed" -ForegroundColor Yellow
            $failed++
            continue
        }

        Push-Location $tempDir

        # Check if already set up
        if ((Test-Path ".openmemory") -and (Test-Path ".ai-agents")) {
            Write-Host "  SKIP: Already configured" -ForegroundColor Yellow
            $skipped++
            Pop-Location
            Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
            continue
        }

        # Fix .gitignore first (remove .openmemory if present)
        if (Test-Path ".gitignore") {
            $gitignoreContent = Get-Content .gitignore
            $needsFix = $gitignoreContent -contains ".openmemory"

            if ($needsFix) {
                Write-Host "  Fixing .gitignore (removing .openmemory)..." -ForegroundColor Gray
                $newContent = $gitignoreContent | Where-Object {
                    $_ -ne ".openmemory" -and
                    $_ -ne "# OpenMemory" -and
                    $_ -ne "# OpenMemory-Code"
                }
                $newContent | Set-Content .gitignore -Force
            }
        }

        # Create dirs
        Write-Host "  Creating .github..." -ForegroundColor Gray
        New-Item -ItemType Directory -Force -Path ".github\workflows" | Out-Null
        New-Item -ItemType Directory -Force -Path ".github\actions" | Out-Null

        # Remove incorrectly deployed workflows from previous runs
        Write-Host "  Removing non-OpenMemory workflows..." -ForegroundColor Gray
        $incorrectWorkflows = @("docker-build.yml", "publish-sdks.yml", "main.yml")
        foreach ($workflow in $incorrectWorkflows) {
            $workflowPath = ".github\workflows\$workflow"
            if (Test-Path $workflowPath) {
                Remove-Item $workflowPath -Force
                Write-Host "    Removed: $workflow" -ForegroundColor Yellow
            }
        }

        # Copy ONLY OpenMemory workflows (not project-specific ones like docker-build.yml)
        $wfSource = Join-Path $OpenMemoryRoot ".github\workflows"
        if (Test-Path $wfSource) {
            # Only copy workflows that start with "openmemory-"
            Get-ChildItem -Path $wfSource -Filter "openmemory-*.yml" | ForEach-Object {
                Copy-Item $_.FullName -Destination ".github\workflows\" -Force
            }
        }

        # Copy actions
        $actSource = Join-Path $OpenMemoryRoot ".github\actions"
        if (Test-Path $actSource) {
            Get-ChildItem -Path $actSource -Directory | ForEach-Object {
                Copy-Item $_.FullName -Destination ".github\actions\" -Recurse -Force
            }
        }

        # Check changes
        $status = git status --porcelain
        if (-not $status) {
            Write-Host "  SKIP: No changes" -ForegroundColor Yellow
            $skipped++
            Pop-Location
            Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
            continue
        }

        # Commit
        Write-Host "  Committing..." -ForegroundColor Gray
        git config user.name "OpenMemory-Code Bot"
        git config user.email "bot@openmemory-code.local"

        # Add .github
        git add .github

        # Add .gitignore only if it exists
        if (Test-Path ".gitignore") {
            git add .gitignore
        }

        # Force-add .openmemory if it exists (in case still in .gitignore)
        if (Test-Path ".openmemory") {
            git add -f .openmemory 2>&1 | Out-Null
        }

        git commit -m "Add OpenMemory-Code automation

- Added auto-initialization workflow
- Added enforcement validation workflow
- Added openmemory-setup composite action
- Fixed .gitignore to allow .openmemory tracking (if .gitignore exists)
- Removed project-specific workflows (docker-build, publish-sdks, main)

Deployed by: deploy-now.ps1" 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            Write-Host "  FAIL: Commit failed" -ForegroundColor Red
            $failed++
            Pop-Location
            Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
            continue
        }

        # Push
        Write-Host "  Pushing..." -ForegroundColor Gray
        git push origin main 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            git push origin master 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  FAIL: Push failed" -ForegroundColor Red
                $failed++
                Pop-Location
                Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
                continue
            }
        }

        # Trigger workflow
        Write-Host "  Triggering workflow..." -ForegroundColor Gray
        gh workflow run openmemory-auto-init.yml --repo "$Username/$name" 2>&1 | Out-Null

        Write-Host "  SUCCESS!" -ForegroundColor Green
        $success++

    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
        $failed++
    } finally {
        if (Test-Path $tempDir) {
            Pop-Location -ErrorAction SilentlyContinue
            Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
        }
    }
}

# Summary
Write-Host ""
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SUCCESS: $success repositories" -ForegroundColor Green
Write-Host "SKIPPED: $skipped repositories" -ForegroundColor Yellow
Write-Host "FAILED: $failed repositories" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "All repositories processed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Push to any repo triggers auto-init" -ForegroundColor Gray
    Write-Host "  2. Or trigger manually from Actions tab" -ForegroundColor Gray
    Write-Host "  3. Start OpenMemory backend: npm start" -ForegroundColor Gray
} else {
    Write-Host "Some repos failed - check errors above" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
