#!/usr/bin/env node
/**
 * Universal Context Manager Service
 *
 * Central service that provides OpenMemory context to all AI interfaces.
 * Runs on port 8081 and provides REST API for context retrieval.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

const app = express();
const PORT = process.env.CONTEXT_MANAGER_PORT || 8081;
const OPENMEMORY_URL = process.env.OPENMEMORY_URL || 'http://localhost:8080';

// Middleware
app.use(cors());
app.use(express.json());

// Context cache
interface ContextCache {
  context: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const contextCache = new Map<string, ContextCache>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Auto-detect current project from working directory
 */
function detectCurrentProject(): string | null {
  try {
    // Try to find .openmemory link file in current directory or parents
    let dir = process.cwd();
    const root = path.parse(dir).root;

    while (dir !== root) {
      const linkFile = path.join(dir, '.openmemory');
      if (fs.existsSync(linkFile)) {
        // Found project, return directory name
        return path.basename(dir);
      }
      dir = path.dirname(dir);
    }

    // Fallback: use current directory name
    return path.basename(process.cwd());
  } catch (error) {
    console.error('[Context Manager] Error detecting project:', error);
    return null;
  }
}

/**
 * Query OpenMemory for project context
 */
async function fetchProjectContext(projectName: string): Promise<any> {
  try {
    // Query project state
    const stateResponse = await fetch(`${OPENMEMORY_URL}/ai-agents/state/${projectName}`);
    const state = stateResponse.ok ? await stateResponse.json() : null;

    // Query recent history
    const historyResponse = await fetch(`${OPENMEMORY_URL}/ai-agents/history/${projectName}`);
    const history = historyResponse.ok ? await historyResponse.json() : null;

    // Query consistency validation
    const validationResponse = await fetch(`${OPENMEMORY_URL}/ai-agents/validate/consistency/${projectName}`);
    const validation = validationResponse.ok ? await validationResponse.json() : null;

    return {
      project_name: projectName,
      state: state?.state || null,
      mode: state?.mode || 'INITIALIZE',
      history: history?.history || [],
      history_count: history?.count || 0,
      validation: validation || null,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error(`[Context Manager] Error fetching context for ${projectName}:`, error.message);
    return {
      project_name: projectName,
      state: null,
      mode: 'INITIALIZE',
      history: [],
      history_count: 0,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Format context for AI consumption
 */
function formatContext(contextData: any, format: string = 'markdown'): string {
  if (format === 'json') {
    return JSON.stringify(contextData, null, 2);
  }

  // Markdown format (default)
  const lines: string[] = [];

  lines.push('# OpenMemory Context');
  lines.push('');
  lines.push(`**Project**: ${contextData.project_name}`);
  lines.push(`**Mode**: ${contextData.mode}`);
  lines.push(`**Last Updated**: ${contextData.timestamp}`);
  lines.push(`**OpenMemory URL**: ${OPENMEMORY_URL}`);
  lines.push('');

  if (contextData.state) {
    lines.push('## Project State');
    lines.push('');
    const metadata = contextData.state.project_metadata || {};
    if (metadata.name) lines.push(`- **Name**: ${metadata.name}`);
    if (metadata.current_phase) lines.push(`- **Phase**: ${metadata.current_phase}`);
    if (metadata.progress_percentage !== undefined) {
      lines.push(`- **Progress**: ${metadata.progress_percentage}%`);
    }
    if (metadata.description) lines.push(`- **Description**: ${metadata.description}`);
    lines.push('');

    if (contextData.state.active_tasks && contextData.state.active_tasks.length > 0) {
      lines.push('## Active Tasks');
      lines.push('');
      contextData.state.active_tasks.forEach((task: any, idx: number) => {
        lines.push(`${idx + 1}. [${task.status || 'PENDING'}] ${task.description || task.name || 'Unnamed task'}`);
      });
      lines.push('');
    }
  }

  if (contextData.history && contextData.history.length > 0) {
    lines.push(`## Recent Activities (Last ${Math.min(10, contextData.history.length)})`);
    lines.push('');
    contextData.history.slice(0, 10).forEach((item: any, idx: number) => {
      const timestamp = item.updated_at || item.created_at || 'Unknown';
      const content = item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '');
      lines.push(`${idx + 1}. [${timestamp}] ${content}`);
    });
    lines.push('');
  }

  if (contextData.validation && contextData.validation.issues_found > 0) {
    lines.push('## Validation Issues');
    lines.push('');
    lines.push(`⚠️ ${contextData.validation.issues_found} issue(s) detected`);
    if (contextData.validation.issues && contextData.validation.issues.length > 0) {
      contextData.validation.issues.slice(0, 5).forEach((issue: any) => {
        lines.push(`- ${issue.type}: ${issue.message}`);
      });
    }
    lines.push('');
  }

  lines.push('## Instructions');
  lines.push('');
  lines.push('You are working with OpenMemory long-term memory system.');
  lines.push('- Record all decisions: `POST /ai-agents/decision`');
  lines.push('- Record all actions: `POST /ai-agents/action`');
  lines.push('- Record patterns: `POST /ai-agents/pattern`');
  lines.push('- Update state: `POST /ai-agents/state`');
  lines.push('');
  lines.push('This context represents the project\'s memory across sessions.');

  return lines.join('\n');
}

/**
 * Get context from cache or fetch fresh
 */
async function getContext(projectName: string, format: string = 'markdown'): Promise<string> {
  const cacheKey = `${projectName}:${format}`;
  const cached = contextCache.get(cacheKey);

  // Return cached if valid
  if (cached && (Date.now() - cached.timestamp < cached.ttl)) {
    console.log(`[Context Manager] Cache hit for ${projectName}`);
    return cached.context;
  }

  // Fetch fresh context
  console.log(`[Context Manager] Fetching fresh context for ${projectName}`);
  const contextData = await fetchProjectContext(projectName);
  const formatted = formatContext(contextData, format);

  // Cache it
  contextCache.set(cacheKey, {
    context: formatted,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  });

  return formatted;
}

// ============================================================================
// REST API Routes
// ============================================================================

/**
 * GET /health - Health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'openmemory-context-manager',
    version: '1.0.0',
    openmemory_url: OPENMEMORY_URL,
    cache_size: contextCache.size,
  });
});

/**
 * GET /context/auto - Auto-detect project and get context
 */
app.get('/context/auto', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'markdown';
    const projectName = detectCurrentProject();

    if (!projectName) {
      return res.status(404).json({
        error: 'Could not detect current project',
        help: 'Run this from a project directory with .openmemory file or specify project_name',
      });
    }

    const context = await getContext(projectName, format);

    res.json({
      success: true,
      project_name: projectName,
      format,
      context,
    });
  } catch (error: any) {
    console.error('[Context Manager] Error in /context/auto:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /context/:project_name - Get context for specific project
 */
app.get('/context/:project_name', async (req: Request, res: Response) => {
  try {
    const { project_name } = req.params;
    const format = (req.query.format as string) || 'markdown';

    const context = await getContext(project_name, format);

    res.json({
      success: true,
      project_name,
      format,
      context,
    });
  } catch (error: any) {
    console.error(`[Context Manager] Error in /context/${req.params.project_name}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /context/refresh/:project_name - Force refresh cache
 */
app.post('/context/refresh/:project_name', async (req: Request, res: Response) => {
  try {
    const { project_name } = req.params;

    // Clear cache for this project
    for (const key of contextCache.keys()) {
      if (key.startsWith(`${project_name}:`)) {
        contextCache.delete(key);
      }
    }

    // Fetch fresh
    const context = await getContext(project_name, 'markdown');

    res.json({
      success: true,
      project_name,
      message: 'Cache refreshed',
      context,
    });
  } catch (error: any) {
    console.error(`[Context Manager] Error in /context/refresh:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /context/record-action - Record AI action
 */
app.post('/context/record-action', async (req: Request, res: Response) => {
  try {
    const { project_name, agent_name, action, context, outcome } = req.body;

    if (!project_name || !agent_name || !action) {
      return res.status(400).json({
        error: 'project_name, agent_name, and action are required',
      });
    }

    // Forward to OpenMemory
    const response = await fetch(`${OPENMEMORY_URL}/ai-agents/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_name, agent_name, action, context, outcome }),
    });

    const data = await response.json();

    // Invalidate cache
    for (const key of contextCache.keys()) {
      if (key.startsWith(`${project_name}:`)) {
        contextCache.delete(key);
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error('[Context Manager] Error recording action:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /context/record-decision - Record AI decision
 */
app.post('/context/record-decision', async (req: Request, res: Response) => {
  try {
    const { project_name, agent_name, decision, rationale, impact } = req.body;

    if (!project_name || !agent_name || !decision || !rationale) {
      return res.status(400).json({
        error: 'project_name, agent_name, decision, and rationale are required',
      });
    }

    // Forward to OpenMemory
    const response = await fetch(`${OPENMEMORY_URL}/ai-agents/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_name, agent_name, decision, rationale, impact }),
    });

    const data = await response.json();

    // Invalidate cache
    for (const key of contextCache.keys()) {
      if (key.startsWith(`${project_name}:`)) {
        contextCache.delete(key);
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error('[Context Manager] Error recording decision:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log('================================================================');
  console.log('OpenMemory Universal Context Manager');
  console.log('================================================================');
  console.log('');
  console.log(`✓ Service running on http://localhost:${PORT}`);
  console.log(`✓ OpenMemory backend: ${OPENMEMORY_URL}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`  GET  /health`);
  console.log(`  GET  /context/auto`);
  console.log(`  GET  /context/:project_name`);
  console.log(`  POST /context/refresh/:project_name`);
  console.log(`  POST /context/record-action`);
  console.log(`  POST /context/record-decision`);
  console.log('');
  console.log('This service provides context to all AI interfaces.');
  console.log('================================================================');
});
