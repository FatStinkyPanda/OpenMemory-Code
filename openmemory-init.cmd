@echo off
REM OpenMemory-Code Project Initialization Batch Script
REM Wrapper for the Node.js initialization script

setlocal

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Remove trailing backslash
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

set INIT_SCRIPT=%SCRIPT_DIR%\openmemory-init.js

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Check if init script exists
if not exist "%INIT_SCRIPT%" (
    echo ERROR: Initialization script not found at: %INIT_SCRIPT%
    echo Please ensure you're running this from the OpenMemory-Code directory
    exit /b 1
)

REM Get project path (use argument if provided, otherwise current directory)
if "%~1"=="" (
    set PROJECT_PATH=%CD%
) else (
    set PROJECT_PATH=%~1
)

echo.
echo OpenMemory-Code Project Initialization
echo =======================================
echo.
echo Initializing project at: %PROJECT_PATH%
echo.

REM Run the Node.js initialization script
node "%INIT_SCRIPT%" "%PROJECT_PATH%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Project initialized
    echo.
    echo Quick Start:
    echo   1. Start OpenMemory backend:
    echo      cd %SCRIPT_DIR%
    echo      npm start
    echo.
    echo   2. Open your project in your IDE:
    echo      cd %PROJECT_PATH%
    echo.
    echo   3. Start coding with AI assistance!
    echo.
) else (
    echo.
    echo Initialization failed. Please check the errors above.
    exit /b 1
)

endlocal
