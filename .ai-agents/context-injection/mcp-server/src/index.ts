#!/usr/bin/env node
/**
 * OpenMemory MCP Server
 *
 * Provides OpenMemory context and tools to Claude Desktop and other MCP clients.
 * Implements the Model Context Protocol (MCP) specification.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

const CONTEXT_MANAGER_URL = process.env.CONTEXT_MANAGER_URL || 'http://localhost:8081';
const OPENMEMORY_URL = process.env.OPENMEMORY_URL || 'http://localhost:8080';

/**
 * Load project registry
 */
function loadProjectRegistry(): any[] {
  try {
    const registryPath = path.join(homedir(), '.openmemory-global', 'projects', 'registry.json');
    if (fs.existsSync(registryPath)) {
      const data = fs.readFileSync(registryPath, 'utf-8');
      const registry = JSON.parse(data);
      return registry.projects || [];
    }
  } catch (error) {
    console.error('[MCP Server] Error loading registry:', error);
  }
  return [];
}

/**
 * Auto-detect current project from working directory
 */
function detectCurrentProject(): string | null {
  try {
    // Try to find project by checking common project indicators
    const projects = loadProjectRegistry();

    // If only one project registered, use it
    if (projects.length === 1) {
      return projects[0].name;
    }

    // Try to detect from current working directory
    const cwd = process.cwd();

    // Check if CWD matches any registered project path
    for (const project of projects) {
      if (cwd.includes(project.path) || project.path.includes(cwd)) {
        return project.name;
      }
    }

    // Fallback: use the first registered project
    if (projects.length > 0) {
      return projects[0].name;
    }

    return null;
  } catch (error) {
    console.error('[MCP Server] Error detecting project:', error);
    return null;
  }
}

/**
 * Fetch context from Context Manager
 */
async function fetchContext(projectName: string): Promise<string> {
  try {
    const response = await fetch(`${CONTEXT_MANAGER_URL}/context/${projectName}?format=markdown`);
    const data = await response.json();
    return data.context || 'No context available';
  } catch (error: any) {
    console.error(`[MCP Server] Error fetching context for ${projectName}:`, error.message);
    return `Error fetching context: ${error.message}`;
  }
}

/**
 * Create MCP server
 */
const server = new Server(
  {
    name: 'openmemory',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// ============================================================================
// Resources - Provide project context as MCP resources
// ============================================================================

/**
 * List available resources (projects)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const projects = loadProjectRegistry();

  return {
    resources: projects.map((p) => ({
      uri: `openmemory://project/${p.name}`,
      name: `${p.name} - Project Context`,
      description: `OpenMemory context for project: ${p.name}`,
      mimeType: 'text/markdown',
    })),
  };
});

/**
 * Read a resource (fetch project context)
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  // Parse project name from URI: openmemory://project/PROJECT_NAME
  const match = uri.match(/^openmemory:\/\/project\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  const projectName = match[1];
  const context = await fetchContext(projectName);

  return {
    contents: [
      {
        uri,
        mimeType: 'text/markdown',
        text: context,
      },
    ],
  };
});

// ============================================================================
// Prompts - Provide pre-defined prompts for easy context injection
// ============================================================================

/**
 * List available prompts
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  const projects = loadProjectRegistry();

  return {
    prompts: [
      {
        name: 'load_project_context',
        description: 'Load complete OpenMemory context for a project (auto-detects current project if not specified)',
        arguments: [
          {
            name: 'project_name',
            description: 'Project name (optional - will auto-detect if not provided)',
            required: false,
          },
        ],
      },
      {
        name: 'quick_context',
        description: 'Load a brief summary of current project status',
        arguments: [
          {
            name: 'project_name',
            description: 'Project name (optional - will auto-detect if not provided)',
            required: false,
          },
        ],
      },
    ],
  };
});

/**
 * Get a specific prompt with context injected
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Determine project name
  let projectName = (args?.project_name as string) || null;
  if (!projectName) {
    projectName = detectCurrentProject();
    if (!projectName) {
      // Try to get from Context Manager auto-detect
      try {
        const response = await fetch(`${CONTEXT_MANAGER_URL}/context/auto?format=json`);
        const data = await response.json();
        projectName = data.project_name || 'unknown';
      } catch {
        projectName = 'unknown';
      }
    }
  }

  if (name === 'load_project_context') {
    // Handle case where project cannot be detected
    if (!projectName || projectName === 'unknown') {
      return {
        description: 'Could not detect project',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Could not auto-detect current project. Please specify project_name parameter, or ensure you have registered projects in OpenMemory.',
            },
          },
        ],
      };
    }

    // Fetch full context
    const context = await fetchContext(projectName);

    return {
      description: `Complete OpenMemory context for project: ${projectName}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I'm working on the "${projectName}" project. Here's the complete context from OpenMemory:\n\n${context}\n\nPlease use this context to inform your responses. You can record decisions and actions using the available tools.`,
          },
        },
      ],
    };
  }

  if (name === 'quick_context') {
    // Handle case where project cannot be detected
    if (!projectName || projectName === 'unknown') {
      return {
        description: 'Could not detect project',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Could not auto-detect current project. Please specify project_name parameter, or ensure you have registered projects in OpenMemory.',
            },
          },
        ],
      };
    }

    // Fetch context and extract just the summary
    try {
      const response = await fetch(`${CONTEXT_MANAGER_URL}/context/${projectName}?format=json`);
      const data = await response.json();
      const contextData = data;

      const summary = [
        `Project: ${projectName}`,
        `Mode: ${contextData.mode || 'INITIALIZE'}`,
        `Phase: ${contextData.state?.project_metadata?.current_phase || 'Unknown'}`,
        `Progress: ${contextData.state?.project_metadata?.progress_percentage || 0}%`,
        `Recent activities: ${contextData.history_count || 0} recorded`,
      ].join('\n');

      return {
        description: `Quick summary for project: ${projectName}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I'm working on "${projectName}". Here's a quick summary:\n\n${summary}\n\nFor full context, use the "load_project_context" prompt. You can record decisions and actions using the available tools.`,
            },
          },
        ],
      };
    } catch (error) {
      return {
        description: `Quick summary for project: ${projectName}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I'm working on "${projectName}". Could not fetch quick summary. Use "load_project_context" for full context.`,
            },
          },
        ],
      };
    }
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// ============================================================================
// Tools - Provide OpenMemory operations as MCP tools
// ============================================================================

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'record_decision',
        description: 'Record an architectural decision in OpenMemory',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Name of the project',
            },
            decision: {
              type: 'string',
              description: 'The decision made',
            },
            rationale: {
              type: 'string',
              description: 'Why this decision was made',
            },
            impact: {
              type: 'string',
              description: 'Expected impact of the decision (optional)',
            },
          },
          required: ['project_name', 'decision', 'rationale'],
        },
      },
      {
        name: 'record_action',
        description: 'Record a development action in OpenMemory',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Name of the project',
            },
            action: {
              type: 'string',
              description: 'The action performed',
            },
            context: {
              type: 'string',
              description: 'Context for the action (optional)',
            },
            outcome: {
              type: 'string',
              description: 'Outcome of the action (optional)',
            },
          },
          required: ['project_name', 'action'],
        },
      },
      {
        name: 'record_pattern',
        description: 'Record a coding pattern or best practice in OpenMemory',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Name of the project',
            },
            pattern_name: {
              type: 'string',
              description: 'Name of the pattern',
            },
            description: {
              type: 'string',
              description: 'Description of the pattern',
            },
            example: {
              type: 'string',
              description: 'Example code (optional)',
            },
          },
          required: ['project_name', 'pattern_name', 'description'],
        },
      },
      {
        name: 'query_history',
        description: 'Query project history from OpenMemory',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Name of the project',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'update_state',
        description: 'Update project state in OpenMemory',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Name of the project',
            },
            state: {
              type: 'object',
              description: 'Project state object',
            },
          },
          required: ['project_name', 'state'],
        },
      },
      {
        name: 'refresh_context',
        description: 'Force refresh the context cache for a project',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Name of the project',
            },
          },
          required: ['project_name'],
        },
      },
    ],
  };
});

/**
 * Execute tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'record_decision': {
        const response = await fetch(`${CONTEXT_MANAGER_URL}/context/record-decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...args,
            agent_name: 'claude-desktop',
          }),
        });
        const data = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'record_action': {
        const response = await fetch(`${CONTEXT_MANAGER_URL}/context/record-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...args,
            agent_name: 'claude-desktop',
          }),
        });
        const data = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'record_pattern': {
        const response = await fetch(`${OPENMEMORY_URL}/ai-agents/pattern`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...args,
            agent_name: 'claude-desktop',
            user_id: 'claude-desktop',
          }),
        });
        const data = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'query_history': {
        const { project_name, limit = 10 } = args as any;
        const response = await fetch(`${OPENMEMORY_URL}/ai-agents/history/${project_name}`);
        const data = await response.json();

        const history = data.history || [];
        const limited = history.slice(0, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ history: limited, count: limited.length }, null, 2),
            },
          ],
        };
      }

      case 'update_state': {
        const response = await fetch(`${OPENMEMORY_URL}/ai-agents/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...args,
            user_id: 'claude-desktop',
          }),
        });
        const data = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'refresh_context': {
        const { project_name } = args as any;
        const response = await fetch(`${CONTEXT_MANAGER_URL}/context/refresh/${project_name}`, {
          method: 'POST',
        });
        const data = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: `Context refreshed for project: ${project_name}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  console.error('================================================================');
  console.error('OpenMemory MCP Server');
  console.error('================================================================');
  console.error('');
  console.error('✓ MCP server starting...');
  console.error(`✓ Context Manager: ${CONTEXT_MANAGER_URL}`);
  console.error(`✓ OpenMemory Backend: ${OPENMEMORY_URL}`);
  console.error('');
  console.error('Capabilities:');
  console.error('  • Resources: Project context from OpenMemory');
  console.error('  • Tools: Record decisions, actions, patterns');
  console.error('  • Prompts: One-click context injection');
  console.error('');
  console.error('Available Prompts:');
  console.error('  • load_project_context - Full context with auto-detection');
  console.error('  • quick_context - Brief project summary');
  console.error('');
  console.error('Ready to accept connections from MCP clients.');
  console.error('================================================================');

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[MCP Server] Fatal error:', error);
  process.exit(1);
});
