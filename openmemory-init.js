#!/usr/bin/env node
/**
 * OpenMemory Project Initialization Script
 *
 * Initializes a new project to work with OpenMemory.
 * Creates .openmemory link file and registers the project.
 *
 * Usage:
 *   node openmemory-init.js [project-directory]
 */

const fs = require('fs');
const path = require('path');
const { homedir } = require('os');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function ensureGlobalDir() {
  const globalDir = path.join(homedir(), '.openmemory-global');

  if (!fs.existsSync(globalDir)) {
    log('Creating global OpenMemory directory...', colors.blue);
    fs.mkdirSync(globalDir, { recursive: true });
    fs.mkdirSync(path.join(globalDir, 'projects'), { recursive: true });

    // Create registry file
    const registryPath = path.join(globalDir, 'projects', 'registry.json');
    const registry = {
      version: '1.0',
      projects: {},
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

    log('✅ Global directory created', colors.green);
  }

  return globalDir;
}

function loadRegistry(globalDir) {
  const registryPath = path.join(globalDir, 'projects', 'registry.json');

  if (!fs.existsSync(registryPath)) {
    return {
      version: '1.0',
      projects: {},
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
  }

  return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
}

function saveRegistry(globalDir, registry) {
  const registryPath = path.join(globalDir, 'projects', 'registry.json');
  registry.updated = new Date().toISOString();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

function initializeProject(projectDir) {
  // Ensure absolute path
  projectDir = path.resolve(projectDir);

  log(`\nInitializing OpenMemory for: ${projectDir}`, colors.blue);

  // Get project name from directory
  const projectName = path.basename(projectDir);

  // Ensure global directory exists
  const globalDir = ensureGlobalDir();

  // Load registry
  const registry = loadRegistry(globalDir);

  // Check if already registered
  if (registry.projects[projectName]) {
    log(`⚠️  Project "${projectName}" is already registered`, colors.yellow);
    log(`   Path: ${registry.projects[projectName].path}`, colors.yellow);

    // Check if it's the same path
    if (registry.projects[projectName].path === projectDir) {
      log('   Skipping registration (same path)', colors.yellow);
    } else {
      log('   WARNING: Different path! Please use a unique project name.', colors.red);
      return false;
    }
  } else {
    // Register project
    registry.projects[projectName] = {
      name: projectName,
      path: projectDir,
      created: new Date().toISOString(),
      initialized: new Date().toISOString(),
    };
    saveRegistry(globalDir, registry);
    log(`✅ Project registered: ${projectName}`, colors.green);
  }

  // Create .openmemory link file
  const linkFilePath = path.join(projectDir, '.openmemory');
  const linkFileContent = `GLOBAL_DIR=${globalDir}
PROJECT_NAME=${projectName}
OPENMEMORY_URL=http://localhost:8080
`;

  if (fs.existsSync(linkFilePath)) {
    log('⚠️  .openmemory file already exists', colors.yellow);
  } else {
    fs.writeFileSync(linkFilePath, linkFileContent);
    log('✅ Created .openmemory link file', colors.green);
  }

  // Create .gitignore entry (if .gitignore exists)
  const gitignorePath = path.join(projectDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.openmemory')) {
      fs.appendFileSync(gitignorePath, '\n# OpenMemory\n.openmemory\n');
      log('✅ Added .openmemory to .gitignore', colors.green);
    }
  }

  // Success message
  console.log('');
  log('═'.repeat(70), colors.green);
  log('✅ Project initialized successfully!', colors.green);
  log('═'.repeat(70), colors.green);
  console.log('');
  log('Project Details:', colors.blue);
  log(`  Name: ${projectName}`, colors.cyan);
  log(`  Path: ${projectDir}`, colors.cyan);
  log(`  Global Dir: ${globalDir}`, colors.cyan);
  console.log('');
  log('Next Steps:', colors.blue);
  log('  1. Ensure OpenMemory backend is running:', colors.cyan);
  log('     npm start', colors.green);
  log('  2. Start coding in your project!', colors.cyan);
  log('  3. Your AI assistant will automatically use OpenMemory context', colors.cyan);
  console.log('');

  return true;
}

function main() {
  // Get project directory from args or use current directory
  const projectDir = process.argv[2] || process.cwd();

  // Check if directory exists
  if (!fs.existsSync(projectDir)) {
    log(`❌ Directory does not exist: ${projectDir}`, colors.red);
    log('Creating directory...', colors.yellow);
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Initialize project
  const success = initializeProject(projectDir);

  if (!success) {
    process.exit(1);
  }
}

main();
