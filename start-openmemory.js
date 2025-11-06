#!/usr/bin/env node
/**
 * OpenMemory Unified Startup Script
 *
 * Starts the complete OpenMemory ecosystem with a single command:
 * - OpenMemory Backend (port 8080)
 * - Context Manager (port 8081) - auto-started by backend
 * - MCP Server (stdio) - instructions provided for Claude Desktop
 *
 * Usage:
 *   node start-openmemory.js
 *   npm start
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function printBanner() {
  console.log('');
  log('═'.repeat(70), colors.cyan);
  log('                   OpenMemory Startup Manager', colors.bright + colors.cyan);
  log('═'.repeat(70), colors.cyan);
  console.log('');
}

function printInstructions() {
  console.log('');
  log('═'.repeat(70), colors.green);
  log('✅ OpenMemory is running!', colors.bright + colors.green);
  log('═'.repeat(70), colors.green);
  console.log('');
  log('Services:', colors.bright);
  log('  • OpenMemory Backend: http://localhost:8080', colors.green);
  log('  • Context Manager:    http://localhost:8081', colors.green);
  log('  • MCP Server:         Stdio (for Claude Desktop)', colors.yellow);
  console.log('');
  log('For Claude Desktop integration:', colors.bright);
  log('  Add this to your Claude Desktop config:', colors.cyan);
  console.log('');
  console.log('  {');
  console.log('    "mcpServers": {');
  console.log('      "openmemory": {');
  console.log('        "command": "node",');
  const mcpPath = path.join(__dirname, '.ai-agents', 'context-injection', 'mcp-server', 'dist', 'index.js');
  console.log(`        "args": ["${mcpPath.replace(/\\/g, '\\\\')}"]`);
  console.log('      }');
  console.log('    }');
  console.log('  }');
  console.log('');
  log('Project Initialization:', colors.bright);
  log('  For new projects, run:', colors.cyan);
  log('    openmemory-init', colors.green);
  log('  Or navigate to your project and create a .openmemory file.', colors.cyan);
  console.log('');
  log('═'.repeat(70), colors.green);
  console.log('');
  log('Press Ctrl+C to stop all services', colors.yellow);
  console.log('');
}

async function checkPrerequisites() {
  log('Checking prerequisites...', colors.blue);

  // Check if backend exists
  const backendPath = path.join(__dirname, 'backend');
  if (!fs.existsSync(backendPath)) {
    log('❌ Backend directory not found!', colors.red);
    process.exit(1);
  }

  // Check if context manager is built
  const contextManagerDist = path.join(__dirname, '.ai-agents', 'context-injection', 'context-manager', 'dist');
  if (!fs.existsSync(contextManagerDist)) {
    log('⚠️  Context Manager not built, building now...', colors.yellow);
    try {
      const { execSync } = require('child_process');
      execSync('npm run build', {
        cwd: path.join(__dirname, '.ai-agents', 'context-injection', 'context-manager'),
        stdio: 'inherit',
      });
      log('✅ Context Manager built successfully', colors.green);
    } catch (error) {
      log('❌ Failed to build Context Manager', colors.red);
      process.exit(1);
    }
  }

  // Check if MCP server is built
  const mcpServerDist = path.join(__dirname, '.ai-agents', 'context-injection', 'mcp-server', 'dist');
  if (!fs.existsSync(mcpServerDist)) {
    log('⚠️  MCP Server not built, building now...', colors.yellow);
    try {
      const { execSync } = require('child_process');
      execSync('npm run build', {
        cwd: path.join(__dirname, '.ai-agents', 'context-injection', 'mcp-server'),
        stdio: 'inherit',
      });
      log('✅ MCP Server built successfully', colors.green);
    } catch (error) {
      log('❌ Failed to build MCP Server', colors.red);
      process.exit(1);
    }
  }

  log('✅ All prerequisites met', colors.green);
  console.log('');
}

async function startBackend() {
  log('Starting OpenMemory Backend...', colors.blue);

  const backendPath = path.join(__dirname, 'backend');

  // Check if we should use dev mode or production mode
  const useDevMode = process.argv.includes('--dev') || !fs.existsSync(path.join(backendPath, 'dist'));

  let backendProcess;

  if (useDevMode) {
    log('Using development mode (tsx)', colors.yellow);
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: backendPath,
      stdio: 'inherit',
      shell: true,
    });
  } else {
    log('Using production mode', colors.green);
    backendProcess = spawn('npm', ['start'], {
      cwd: backendPath,
      stdio: 'inherit',
      shell: true,
    });
  }

  backendProcess.on('error', (error) => {
    log(`❌ Backend error: ${error.message}`, colors.red);
    process.exit(1);
  });

  backendProcess.on('exit', (code) => {
    if (code !== 0) {
      log(`❌ Backend exited with code ${code}`, colors.red);
      process.exit(code || 1);
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('\nShutting down OpenMemory...', colors.yellow);
    backendProcess.kill('SIGTERM');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });

  process.on('SIGTERM', () => {
    backendProcess.kill('SIGTERM');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });

  // Wait a bit for startup messages, then print instructions
  setTimeout(() => {
    printInstructions();
  }, 3000);
}

async function main() {
  printBanner();
  await checkPrerequisites();
  await startBackend();
}

main().catch((error) => {
  log(`❌ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
