<#
.SYNOPSIS
    Initialize a new project to work with OpenMemory-Code

.DESCRIPTION
    This PowerShell script initializes a new project for use with OpenMemory-Code.
    It creates the necessary configuration files and registers the project.

.PARAMETER ProjectPath
    The path to the project directory to initialize. Defaults to current directory.

.EXAMPLE
    .\openmemory-init.ps1
    Initialize the current directory

.EXAMPLE
    .\openmemory-init.ps1 C:\Projects\MyProject
    Initialize a specific project directory

.EXAMPLE
    .\openmemory-init.ps1 ..\MyNewProject
    Initialize a relative path project directory
#>

param(
    [Parameter(Position = 0)]
    [string]$ProjectPath = $PWD.Path
)

$ErrorActionPreference = "Stop"

# Get the directory where this script is located (OpenMemory-Code root)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InitScript = Join-Path $ScriptDir "openmemory-init.js"

Write-Host ""
Write-Host "OpenMemory-Code Project Initialization" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $null = Get-Command node -ErrorAction Stop
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if the init script exists
if (-not (Test-Path $InitScript)) {
    Write-Host "ERROR: Initialization script not found at: $InitScript" -ForegroundColor Red
    Write-Host "Please ensure you're running this from the OpenMemory-Code directory" -ForegroundColor Yellow
    exit 1
}

# Convert to absolute path
if (-not [System.IO.Path]::IsPathRooted($ProjectPath)) {
    $ProjectPath = Join-Path $PWD.Path $ProjectPath
}

# Resolve the project path to absolute
if (Test-Path $ProjectPath) {
    $ProjectPath = (Resolve-Path $ProjectPath).Path
} else {
    # If path doesn't exist, create it
    Write-Host "Creating directory: $ProjectPath" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $ProjectPath -Force | Out-Null
    $ProjectPath = (Resolve-Path $ProjectPath).Path
}

Write-Host "Initializing project at: $ProjectPath" -ForegroundColor Green
Write-Host ""

# Run the Node.js initialization script
try {
    & node $InitScript $ProjectPath

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS! Project initialized" -ForegroundColor Green
        Write-Host ""
        Write-Host "Quick Start:" -ForegroundColor Cyan
        Write-Host "  1. Start OpenMemory backend:" -ForegroundColor White
        Write-Host "     cd $ScriptDir" -ForegroundColor Gray
        Write-Host "     npm start" -ForegroundColor Green
        Write-Host ""
        Write-Host "  2. Open your project in your IDE:" -ForegroundColor White
        Write-Host "     cd $ProjectPath" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  3. Start coding with AI assistance!" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "Initialization failed. Please check the errors above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Failed to run initialization script" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
