# Fix .gitignore to allow .openmemory tracking
# This script removes .openmemory from .gitignore in all deployed repos

param([string]$Username = "FatStinkyPanda")

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "Fix .gitignore: Allow .openmemory Tracking" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
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

# Get repos
$reposJson = gh repo list $Username --limit 100 --json name,isFork
$repos = ($reposJson | ConvertFrom-Json) | Where-Object { $_.isFork -eq $false }

$total = ($repos | Measure-Object).Count
Write-Host "INFO: Found $total repositories" -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Fix .gitignore in all repos? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Aborted" -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Counters
$fixed = 0
$skipped = 0
$failed = 0

foreach ($repo in $repos) {
    $name = $repo.name
    Write-Host "-------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Processing: $name" -ForegroundColor Cyan

    $tempDir = Join-Path $env:TEMP "om-fix-$name-$(Get-Random)"

    try {
        # Clone
        git clone --depth 1 "https://github.com/$Username/$name.git" $tempDir 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
            Write-Host "  SKIP: Clone failed" -ForegroundColor Yellow
            $skipped++
            continue
        }

        Push-Location $tempDir

        # Check if .gitignore exists and contains .openmemory
        if (-not (Test-Path ".gitignore")) {
            Write-Host "  SKIP: No .gitignore file" -ForegroundColor Yellow
            $skipped++
            Pop-Location
            Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
            continue
        }

        $gitignore = Get-Content .gitignore -Raw
        if ($gitignore -notmatch '\.openmemory') {
            Write-Host "  SKIP: .openmemory not in .gitignore" -ForegroundColor Yellow
            $skipped++
            Pop-Location
            Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
            continue
        }

        # Remove .openmemory from .gitignore
        Write-Host "  Removing .openmemory from .gitignore..." -ForegroundColor Gray
        $newContent = (Get-Content .gitignore) | Where-Object {
            $_ -ne ".openmemory" -and
            $_ -ne "# OpenMemory" -and
            $_ -ne "# OpenMemory-Code"
        }

        # Write back
        $newContent | Set-Content .gitignore -Force

        # Force-add .openmemory if it exists
        if (Test-Path ".openmemory") {
            Write-Host "  Force-adding .openmemory to git..." -ForegroundColor Gray
            git add -f .openmemory 2>&1 | Out-Null
        }

        # Also add .gitignore
        git add .gitignore 2>&1 | Out-Null

        # Check for changes
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
        git commit -m "Fix: Allow .openmemory to be tracked in git

Remove .openmemory from .gitignore to enable team collaboration.
The .openmemory file contains project configuration and should be
tracked so all team members have the same setup.

Updated by: fix-gitignore-openmemory.ps1" 2>&1 | Out-Null

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

        Write-Host "  SUCCESS!" -ForegroundColor Green
        $fixed++

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
Write-Host "Fix Summary" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "FIXED: $fixed repositories" -ForegroundColor Green
Write-Host "SKIPPED: $skipped repositories" -ForegroundColor Yellow
Write-Host "FAILED: $failed repositories" -ForegroundColor Red
Write-Host ""

if ($fixed -gt 0) {
    Write-Host "All repositories can now track .openmemory!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: Rerun any failed workflows from Actions tab" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
