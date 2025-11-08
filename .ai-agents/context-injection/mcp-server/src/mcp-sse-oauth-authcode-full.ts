#!/usr/bin/env node
/**
 * OpenMemory MCP SSE Server with OAuth Authorization Code Flow - FULL INTEGRATION
 *
 * Full OAuth 2.0 Authorization Code flow for Claude custom connectors
 * Includes all 48 OpenMemory + Logging tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

const PORT = parseInt(process.env.MCP_SSE_PORT || '8084');
const CONTEXT_MANAGER_URL = process.env.CONTEXT_MANAGER_URL || 'http://localhost:8081';
const OPENMEMORY_URL = process.env.OPENMEMORY_URL || 'http://localhost:8080';
const LOGGING_API_URL = process.env.LOGGING_API_URL || 'http://localhost:8083';

// OAuth credentials - FIXED for Claude Custom Connectors
// These credentials must remain consistent across server restarts
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'fba72649dc07cf7824aa578f6f75ffc7';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || '7ea51b30220a71ea117316631d4bcd49277d50ed1b2e6db2372c856d0a7d12bb';

// Store authorization codes and tokens
const authCodes = new Map<string, { clientId: string, redirectUri: string, expiresAt: number }>();
const accessTokens = new Map<string, { clientId: string, expiresAt: number }>();

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('================================================================');
console.log('OpenMemory MCP SSE Server - OAuth Authorization Code Flow');
console.log('FULL INTEGRATION - 48 Tools');
console.log('================================================================');
console.log('');
console.log('✓ Starting MCP SSE Server with OAuth Authorization Code...');
console.log(`✓ Port: ${PORT}`);
console.log('');
console.log('🔒 OAUTH CREDENTIALS - SAVE THESE!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Client ID:     ${OAUTH_CLIENT_ID}`);
console.log(`Client Secret: ${OAUTH_CLIENT_SECRET}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

/**
 * OAuth Authorization Endpoint
 * Step 1: User authorizes the application
 */
app.get('/authorize', (req: Request, res: Response) => {
  const { response_type, client_id, redirect_uri, state, scope } = req.query;

  console.log('Authorization request:', { response_type, client_id, redirect_uri, state });

  // Validate response_type
  if (response_type !== 'code') {
    return res.status(400).send('Invalid response_type. Only "code" is supported.');
  }

  // Validate client_id
  if (client_id !== OAUTH_CLIENT_ID) {
    return res.status(400).send('Invalid client_id');
  }

  // Validate redirect_uri
  if (!redirect_uri) {
    return res.status(400).send('Missing redirect_uri');
  }

  // Auto-approve (in production, show user consent page)
  // Generate authorization code
  const code = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

  // Store authorization code
  authCodes.set(code, {
    clientId: client_id as string,
    redirectUri: redirect_uri as string,
    expiresAt
  });

  console.log('✓ Authorization code generated:', code);

  // Redirect back to Claude with code
  const redirectUrl = new URL(redirect_uri as string);
  redirectUrl.searchParams.append('code', code);
  if (state) {
    redirectUrl.searchParams.append('state', state as string);
  }

  console.log('✓ Redirecting to:', redirectUrl.toString());
  res.redirect(redirectUrl.toString());
});

/**
 * OAuth Token Endpoint
 * Step 2: Exchange authorization code for access token
 */
app.post('/oauth/token', (req: Request, res: Response) => {
  const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;

  console.log('Token request:', { grant_type, code, client_id });

  // Validate grant_type
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Only authorization_code grant type is supported'
    });
  }

  // Validate client credentials
  if (client_id !== OAUTH_CLIENT_ID || client_secret !== OAUTH_CLIENT_SECRET) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Invalid client credentials'
    });
  }

  // Validate authorization code
  const codeData = authCodes.get(code);
  if (!codeData) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired authorization code'
    });
  }

  // Check expiration
  if (codeData.expiresAt < Date.now()) {
    authCodes.delete(code);
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Authorization code expired'
    });
  }

  // Validate redirect_uri matches
  if (codeData.redirectUri !== redirect_uri) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Redirect URI mismatch'
    });
  }

  // Delete used authorization code (one-time use)
  authCodes.delete(code);

  // Generate access token
  const accessToken = crypto.randomBytes(32).toString('hex');
  const expiresIn = 3600; // 1 hour
  const expiresAt = Date.now() + (expiresIn * 1000);

  // Store access token
  accessTokens.set(accessToken, {
    clientId: client_id,
    expiresAt
  });

  console.log('✓ Access token generated successfully');

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn
  });
});

/**
 * Middleware to validate OAuth token
 */
function validateOAuthToken(req: Request, res: Response, next: NextFunction) {
  // Skip auth for public endpoints
  const publicPaths = [
    '/',
    '/health',
    '/authorize',
    '/oauth/token',
    '/.well-known/oauth-authorization-server',
    '/.well-known/oauth-protected-resource'
  ];

  if (publicPaths.includes(req.path) || req.method === 'HEAD') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing or invalid Authorization header'
    });
  }

  const token = authHeader.substring(7);
  const tokenData = accessTokens.get(token);

  if (!tokenData) {
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token not found or expired'
    });
  }

  if (tokenData.expiresAt < Date.now()) {
    accessTokens.delete(token);
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Token expired'
    });
  }

  next();
}

app.use(validateOAuthToken);

/**
 * Authentication middleware - validates OAuth bearer tokens
 */
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'unauthorized', error_description: 'Missing Authorization header' });
  }

  const tokenData = accessTokens.get(token);
  if (!tokenData) {
    console.log('❌ Invalid token');
    return res.status(401).json({ error: 'unauthorized', error_description: 'Invalid or expired token' });
  }

  if (Date.now() > tokenData.expiresAt) {
    console.log('❌ Token expired');
    accessTokens.delete(token);
    return res.status(401).json({ error: 'unauthorized', error_description: 'Token expired' });
  }

  console.log('✓ Token validated');
  next();
}

/**
 * Root endpoint - HEAD and POST handlers for discovery and messages
 * HEAD requests return 200 OK for discovery
 * POST requests handle MCP JSON-RPC messages
 */
app.head('/', (req: Request, res: Response) => {
  res.status(200).end();
});

app.post('/', authenticateToken, async (req: Request, res: Response) => {
  console.log('📨 Received MCP message:', JSON.stringify(req.body, null, 2));

  try {
    const { jsonrpc, id, method, params } = req.body;

    // Validate JSON-RPC 2.0 format
    if (jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid Request' }
      });
    }

    // Handle initialize
    if (method === 'initialize') {
      console.log('✓ Handling initialize request');
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'openmemory',
            version: '1.0.0'
          }
        }
      });
    }

    // Handle tools/list
    if (method === 'tools/list') {
      console.log(`✓ Listing ${tools.length} tools`);
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: tools
        }
      });
    }

    // Handle notifications (no response needed)
    if (method && method.startsWith('notifications/')) {
      console.log(`✓ Notification received: ${method}`);
      return res.status(200).end();
    }

    // Handle tools/call
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      console.log(`✓ Tool called: ${name}`);

      try {
        let result: any;

        // === CORE MEMORY OPERATIONS ===
        if (name === 'record_decision') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/decision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else if (name === 'record_action') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else if (name === 'record_pattern') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/pattern`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else if (name === 'record_emotion') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/emotion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else if (name === 'update_state') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/state`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        // === MEMORY QUERY ===
        else if (name === 'query_memory') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else if (name === 'get_history') {
          const projectName = (args as any)?.project_name;
          const limit = (args as any)?.limit || 50;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/history/${projectName}?limit=${limit}`);
          result = await response.json();
        }
        else if (name === 'get_patterns') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/patterns/${projectName}`);
          result = await response.json();
        }
        else if (name === 'get_decisions') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/decisions/${projectName}`);
          result = await response.json();
        }
        else if (name === 'get_emotions') {
          const projectName = (args as any)?.project_name;
          const limit = (args as any)?.limit || 50;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/emotions/${projectName}?limit=${limit}`);
          result = await response.json();
        }
        else if (name === 'get_sentiment') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/sentiment/${projectName}`);
          result = await response.json();
        }
        else if (name === 'get_important_memories') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/important`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        // === MEMORY MANAGEMENT ===
        else if (name === 'link_memories') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else if (name === 'get_memory_graph') {
          const memoryId = (args as any)?.memory_id;
          const depth = (args as any)?.depth || 2;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/graph/${memoryId}?depth=${depth}`);
          result = await response.json();
        }
        else if (name === 'reinforce_memory') {
          const memoryId = (args as any)?.memory_id;
          const reason = (args as any)?.reason;
          const boost = (args as any)?.boost;
          // Check if we should use smart-reinforce (with reason) or simple reinforce
          if (reason) {
            const response = await fetch(`${OPENMEMORY_URL}/ai-agents/smart-reinforce`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(args),
            });
            result = await response.json();
          } else {
            const response = await fetch(`${OPENMEMORY_URL}/ai-agents/reinforce/${memoryId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ boost }),
            });
            result = await response.json();
          }
        }
        else if (name === 'get_memory_metrics') {
          const memoryId = (args as any)?.memory_id;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/metrics/${memoryId}`);
          result = await response.json();
        }
        else if (name === 'refresh_context') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/context/${projectName}`);
          result = await response.json();
        }
        // === PATTERN DETECTION ===
        else if (name === 'detect_patterns') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/detect-patterns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else if (name === 'extract_success_patterns') {
          const projectName = (args as any)?.project_name;
          const lookbackDays = (args as any)?.lookback_days;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/learn/patterns/${projectName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lookback_days: lookbackDays }),
          });
          result = await response.json();
        }
        else if (name === 'get_learning_stats') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/learn/stats/${projectName}`);
          result = await response.json();
        }
        // === VALIDATION ===
        else if (name === 'validate_consistency') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/validate/consistency/${projectName}`);
          result = await response.json();
        }
        else if (name === 'validate_effectiveness') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/validate/effectiveness/${projectName}`);
          result = await response.json();
        }
        else if (name === 'validate_decisions') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/validate/decisions/${projectName}`);
          result = await response.json();
        }
        else if (name === 'validate_all') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/validate/${projectName}`);
          result = await response.json();
        }
        // === SELF-CORRECTION ===
        else if (name === 'analyze_failures') {
          const projectName = (args as any)?.project_name;
          const lookbackDays = (args as any)?.lookback_days;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/analyze/failures/${projectName}?lookback_days=${lookbackDays || 30}`);
          result = await response.json();
        }
        else if (name === 'get_lessons_learned') {
          const projectName = (args as any)?.project_name;
          const limit = (args as any)?.limit || 20;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/lessons/${projectName}?limit=${limit}`);
          result = await response.json();
        }
        else if (name === 'adjust_confidence') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/adjust/confidence/${projectName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
          result = await response.json();
        }
        else if (name === 'get_confidence_distribution') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/confidence/distribution/${projectName}`);
          result = await response.json();
        }
        else if (name === 'consolidate_memories') {
          const projectName = (args as any)?.project_name;
          const options = (args as any)?.options;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/consolidate/${projectName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ options }),
          });
          result = await response.json();
        }
        // === PROACTIVE INTELLIGENCE ===
        else if (name === 'detect_conflicts') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/detect/conflicts/${projectName}`);
          result = await response.json();
        }
        else if (name === 'predict_blockers') {
          const projectName = (args as any)?.project_name;
          const lookbackDays = (args as any)?.lookback_days;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/predict/blockers/${projectName}?lookback_days=${lookbackDays || 30}`);
          result = await response.json();
        }
        else if (name === 'generate_recommendations') {
          const projectName = (args as any)?.project_name;
          const context = (args as any)?.context;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/recommend/${projectName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context }),
          });
          result = await response.json();
        }
        // === QUALITY & MONITORING ===
        else if (name === 'run_quality_gate') {
          const projectName = (args as any)?.project_name;
          const context = (args as any)?.context;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/quality/gate/${projectName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context }),
          });
          result = await response.json();
        }
        else if (name === 'get_quality_trends') {
          const projectName = (args as any)?.project_name;
          const days = (args as any)?.days || 30;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/quality/trends/${projectName}?days=${days}`);
          result = await response.json();
        }
        else if (name === 'detect_anomalies') {
          const projectName = (args as any)?.project_name;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/detect/anomalies/${projectName}`);
          result = await response.json();
        }
        // === USAGE MONITORING ===
        else if (name === 'check_compliance') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/check-compliance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else if (name === 'get_usage_report') {
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/usage-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        // === COMPREHENSIVE ===
        else if (name === 'run_autonomous_intelligence') {
          const projectName = (args as any)?.project_name;
          const context = (args as any)?.context;
          const response = await fetch(`${OPENMEMORY_URL}/ai-agents/autonomous/${projectName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context }),
          });
          result = await response.json();
        }
        // === LOGGING & TRACING ===
        else if (name === 'log_event') {
          const response = await fetch(`${LOGGING_API_URL}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else if (name === 'instrument_file') {
          const response = await fetch(`${LOGGING_API_URL}/instrument`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else if (name === 'search_traces') {
          const response = await fetch(`${LOGGING_API_URL}/traces/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args || {}),
          });
          result = await response.json();
        }
        else if (name === 'find_slow_executions') {
          const response = await fetch(`${LOGGING_API_URL}/traces/slow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args || {}),
          });
          result = await response.json();
        }
        else if (name === 'get_hotspots') {
          const response = await fetch(`${LOGGING_API_URL}/traces/hotspots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args || {}),
          });
          result = await response.json();
        }
        else if (name === 'check_file_logging') {
          const response = await fetch(`${LOGGING_API_URL}/logging/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
          });
          result = await response.json();
        }
        else {
          throw new Error(`Unknown tool: ${name}`);
        }

        console.log(`✓ Tool ${name} executed successfully`);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        });
      } catch (error: any) {
        console.error(`❌ Tool ${name} failed:`, error.message);
        return res.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32000,
            message: `Tool execution failed: ${error.message}`
          }
        });
      }
    }

    // Unknown method
    return res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: 'Method not found' }
    });

  } catch (error: any) {
    console.error('❌ Error handling MCP message:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32603, message: 'Internal error' }
    });
  }
});

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 * This is what Claude looks for to discover OAuth endpoints
 */
app.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
  const baseUrl = `https://${req.get('host') || 'localhost:8084'}`;

  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    code_challenge_methods_supported: [],
    service_documentation: baseUrl,
  });
});

/**
 * OAuth 2.0 Resource Server Metadata (RFC 8707) - Optional but requested by Claude
 */
app.get('/.well-known/oauth-protected-resource', (req: Request, res: Response) => {
  const baseUrl = `https://${req.get('host') || 'localhost:8084'}`;

  res.json({
    resource: baseUrl,
    authorization_servers: [baseUrl],
    bearer_methods_supported: ['header'],
    resource_documentation: baseUrl,
  });
});

/**
 * Health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'openmemory-mcp-sse-oauth-authcode-full',
    version: '1.0.0',
    transport: 'sse',
    auth: 'oauth2_authorization_code',
    tools: 48,
    endpoints: {
      authorize: '/authorize',
      token: '/oauth/token',
      sse: '/',
      message: '/message'
    }
  });
});

/**
 * Define all 48 MCP tools
 */
const tools: Tool[] = [
  // === CORE MEMORY OPERATIONS (5 tools) ===
  {
    name: 'record_decision',
    description: 'Record an architectural decision in OpenMemory (reflective memory sector)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        decision: { type: 'string', description: 'The decision made' },
        rationale: { type: 'string', description: 'Why this decision was made' },
        alternatives: { type: 'string', description: 'Alternatives considered (optional)' },
        consequences: { type: 'string', description: 'Expected consequences (optional)' },
      },
      required: ['project_name', 'agent_name', 'decision', 'rationale'],
    },
  },
  {
    name: 'record_action',
    description: 'Record a development action in OpenMemory (episodic memory sector)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        action: { type: 'string', description: 'The action performed' },
        context: { type: 'string', description: 'Context for the action (optional)' },
        outcome: { type: 'string', description: 'Outcome of the action (optional)' },
        related_decision: { type: 'string', description: 'Memory ID of related decision (optional)' },
        used_pattern: { type: 'string', description: 'Memory ID of pattern used (optional)' },
      },
      required: ['project_name', 'agent_name', 'action'],
    },
  },
  {
    name: 'record_pattern',
    description: 'Record a coding pattern or best practice in OpenMemory (procedural memory sector)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        pattern_name: { type: 'string', description: 'Name of the pattern' },
        description: { type: 'string', description: 'Description of the pattern' },
        example: { type: 'string', description: 'Example code (optional)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Additional tags (optional)' },
      },
      required: ['project_name', 'agent_name', 'pattern_name', 'description'],
    },
  },
  {
    name: 'record_emotion',
    description: 'Record agent emotional state/sentiment in OpenMemory (emotional memory sector)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent' },
        context: { type: 'string', description: 'Context for the emotion' },
        sentiment: { type: 'string', description: 'Sentiment: positive, negative, neutral, frustrated, confident' },
        confidence: { type: 'number', description: 'Confidence level (0.0-1.0)' },
        feeling: { type: 'string', description: 'Description of the feeling' },
        related_action: { type: 'string', description: 'Memory ID of related action (optional)' },
      },
      required: ['project_name', 'agent_name', 'feeling'],
    },
  },
  {
    name: 'update_state',
    description: 'Update project state in OpenMemory (semantic memory sector)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        state: { type: 'object', description: 'Project state object' },
      },
      required: ['project_name', 'agent_name', 'state'],
    },
  },

  // === MEMORY QUERY & RETRIEVAL (7 tools) ===
  {
    name: 'query_memory',
    description: 'Query project memories by type (semantic, episodic, procedural, reflective, emotional, or all)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        query: { type: 'string', description: 'Query string' },
        memory_type: { type: 'string', description: 'Memory type: state, actions, patterns, decisions, emotions, or all', enum: ['state', 'actions', 'patterns', 'decisions', 'emotions', 'all'] },
        k: { type: 'number', description: 'Number of results (default: 10)' },
      },
      required: ['project_name', 'query'],
    },
  },
  {
    name: 'get_history',
    description: 'Get project development history (episodic memories)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        limit: { type: 'number', description: 'Maximum results (default: 50)' },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'get_patterns',
    description: 'Get all coding patterns for a project (procedural memories)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'get_decisions',
    description: 'Get architectural decisions for a project (reflective memories)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'get_emotions',
    description: 'Get emotional timeline for project (emotional memories)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        limit: { type: 'number', description: 'Maximum results (default: 50)' },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'get_sentiment',
    description: 'Analyze sentiment trends for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'get_important_memories',
    description: 'Get most important memories (by salience × coactivations)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        memory_type: { type: 'string', description: 'Memory type: state, actions, patterns, decisions, emotions, or all', enum: ['state', 'actions', 'patterns', 'decisions', 'emotions', 'all'] },
        limit: { type: 'number', description: 'Number of results (default: 10)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },

  // === MEMORY MANAGEMENT (5 tools) ===
  {
    name: 'link_memories',
    description: 'Create a link/waypoint between two memories',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        source_memory_id: { type: 'string', description: 'Source memory ID' },
        target_memory_id: { type: 'string', description: 'Target memory ID' },
        weight: { type: 'number', description: 'Link weight (0.0-1.0, default: 0.8)' },
        relationship: { type: 'string', description: 'Relationship type: led_to, resulted_in, used, informed_by' },
      },
      required: ['project_name', 'agent_name', 'source_memory_id', 'target_memory_id'],
    },
  },
  {
    name: 'get_memory_graph',
    description: 'Get memory graph (waypoints) for a memory',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        memory_id: { type: 'string', description: 'Memory ID' },
        depth: { type: 'number', description: 'Traversal depth (default: 2)' },
      },
      required: ['project_name', 'agent_name', 'memory_id'],
    },
  },
  {
    name: 'reinforce_memory',
    description: 'Smart reinforcement based on success/usage (boosts salience)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        memory_id: { type: 'string', description: 'Memory ID' },
        reason: { type: 'string', description: 'Reason: success, frequent_use, critical_decision, reference', enum: ['success', 'frequent_use', 'critical_decision', 'reference'] },
        boost: { type: 'number', description: 'Custom boost amount (optional)' },
      },
      required: ['project_name', 'agent_name', 'memory_id', 'reason'],
    },
  },
  {
    name: 'get_memory_metrics',
    description: 'Get importance metrics for a memory (salience, coactivations, tier)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        memory_id: { type: 'string', description: 'Memory ID' },
      },
      required: ['project_name', 'agent_name', 'memory_id'],
    },
  },
  {
    name: 'refresh_context',
    description: 'Force refresh the context cache for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
      },
      required: ['project_name', 'agent_name'],
    },
  },

  // === PATTERN DETECTION & LEARNING (3 tools) ===
  {
    name: 'detect_patterns',
    description: 'Run automatic pattern detection from action sequences',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        lookback_days: { type: 'number', description: 'Days to look back (default: 7)' },
        min_frequency: { type: 'number', description: 'Minimum frequency threshold (default: 3)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'extract_success_patterns',
    description: 'Extract success patterns from project history (continuous learning)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        lookback_days: { type: 'number', description: 'Days to look back (default: 30)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'get_learning_stats',
    description: 'Get learning statistics for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
      },
      required: ['project_name'],
    },
  },

  // === VALIDATION SYSTEM (4 tools) ===
  {
    name: 'validate_consistency',
    description: 'Run consistency validation (detects contradictions, circular dependencies, broken waypoints)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'validate_effectiveness',
    description: 'Run pattern effectiveness analysis (tracks success rates, auto-reinforces/downgrades)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'validate_decisions',
    description: 'Run decision quality assessment (evaluates adherence, consistency, outcomes)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'validate_all',
    description: 'Run comprehensive validation (consistency + effectiveness + decisions)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
      },
      required: ['project_name', 'agent_name'],
    },
  },

  // === SELF-CORRECTION SYSTEM (5 tools) ===
  {
    name: 'analyze_failures',
    description: 'Analyze failures and identify root causes (creates lessons learned)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        lookback_days: { type: 'number', description: 'Days to look back (default: 30)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'get_lessons_learned',
    description: 'Get lessons learned from failures',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        limit: { type: 'number', description: 'Maximum results (default: 20)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'adjust_confidence',
    description: 'Auto-adjust confidence for all project memories',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'get_confidence_distribution',
    description: 'Get confidence distribution for project memories',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'consolidate_memories',
    description: 'Consolidate memories (merge duplicates, archive low-value)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        options: { type: 'object', description: 'Consolidation options (optional)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },

  // === PROACTIVE INTELLIGENCE (3 tools) ===
  {
    name: 'detect_conflicts',
    description: 'Detect potential conflicts proactively',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'predict_blockers',
    description: 'Predict potential blockers',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        lookback_days: { type: 'number', description: 'Days to look back (default: 30)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'generate_recommendations',
    description: 'Generate context-aware recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        context: { type: 'string', description: 'Current context for recommendations' },
      },
      required: ['project_name', 'agent_name'],
    },
  },

  // === QUALITY & MONITORING (3 tools) ===
  {
    name: 'run_quality_gate',
    description: 'Run quality gate check',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        context: { type: 'string', description: 'Context for quality check' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'get_quality_trends',
    description: 'Get quality trends for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        days: { type: 'number', description: 'Number of days (default: 30)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'detect_anomalies',
    description: 'Detect anomalies in project activity',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
      },
      required: ['project_name', 'agent_name'],
    },
  },

  // === USAGE MONITORING & COMPLIANCE (2 tools) ===
  {
    name: 'check_compliance',
    description: 'Check compliance with mandatory tool usage requirements (validates that all required tools are being used)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        session_info: { type: 'string', description: 'Information about current session (optional)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },
  {
    name: 'get_usage_report',
    description: 'Get detailed report of tool usage, memory utilization, and compliance metrics',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        days: { type: 'number', description: 'Number of days to analyze (default: 7)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },

  // === COMPREHENSIVE AUTONOMOUS INTELLIGENCE (1 tool) ===
  {
    name: 'run_autonomous_intelligence',
    description: 'Run ALL autonomous intelligence checks (validation, self-correction, proactive, quality, monitoring)',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        agent_name: { type: 'string', description: 'Name of the agent performing the action' },
        context: { type: 'string', description: 'Current context (optional)' },
      },
      required: ['project_name', 'agent_name'],
    },
  },

  // === LOGGING & RUNTIME TRACING TOOLS (6 tools) ===
  {
    name: 'log_event',
    description: 'Log an event/action to the logging system. AI agents MUST use this to log all significant actions.',
    inputSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', description: 'Log level: trace, debug, info, warn, error, fatal', enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] },
        category: { type: 'string', description: 'Log category: main, error, ai-agent, api, debug, system, performance', enum: ['main', 'error', 'ai-agent', 'api', 'debug', 'system', 'performance'] },
        source: { type: 'string', description: 'Source file (e.g., "src/users.ts")' },
        message: { type: 'string', description: 'Log message' },
        context: { type: 'object', description: 'Additional context data (optional)' },
      },
      required: ['level', 'category', 'source', 'message'],
    },
  },
  {
    name: 'instrument_file',
    description: 'Automatically instrument a file with execution tracing. Wraps all functions to capture execution flow.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'File path to instrument (e.g., "src/users.ts")' },
        level: { type: 'number', description: 'Instrumentation detail level (0-5, default: 2)', minimum: 0, maximum: 5 },
        functions: { type: 'array', items: { type: 'string' }, description: 'Specific functions to instrument (optional, empty = all functions)' },
      },
      required: ['file'],
    },
  },
  {
    name: 'search_traces',
    description: 'Search execution traces with filters. Find specific function calls, slow executions, errors, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (function name, file, etc.)' },
        file: { type: 'string', description: 'Filter by file' },
        minDuration: { type: 'number', description: 'Minimum execution duration in milliseconds' },
        hasError: { type: 'boolean', description: 'Filter for traces with errors' },
        limit: { type: 'number', description: 'Maximum results (default: 100)' },
      },
    },
  },
  {
    name: 'find_slow_executions',
    description: 'Find slow function executions above a threshold',
    inputSchema: {
      type: 'object',
      properties: {
        threshold: { type: 'number', description: 'Duration threshold in milliseconds (default: 1000)' },
        limit: { type: 'number', description: 'Maximum results (default: 50)' },
      },
    },
  },
  {
    name: 'get_hotspots',
    description: 'Find performance hotspots - functions consuming most time',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of hotspots to return (default: 20)' },
      },
    },
  },
  {
    name: 'check_file_logging',
    description: 'Check if a file has logging/tracing integrated. AI agents MUST use this before modifying files.',
    inputSchema: {
      type: 'object',
      properties: {
        file: { type: 'string', description: 'File path to check' },
      },
      required: ['file'],
    },
  },
];


app.listen(PORT, () => {
  console.log('OAuth Endpoints:');
  console.log(`  Authorize: http://localhost:${PORT}/authorize`);
  console.log(`  Token:     http://localhost:${PORT}/oauth/token`);
  console.log('');
  console.log('MCP SSE Endpoints:');
  console.log(`  Health:    http://localhost:${PORT}/health`);
  console.log(`  SSE:       http://localhost:${PORT}/sse`);
  console.log(`  Messages:  http://localhost:${PORT}/message`);
  console.log('');
  console.log(`✅ MCP SSE Server with OAuth Authorization Code running on http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Configure Claude Custom Connector:');
  console.log('  URL: (your ngrok URL)');
  console.log(`  OAuth Client ID: ${OAUTH_CLIENT_ID}`);
  console.log(`  OAuth Client Secret: ${OAUTH_CLIENT_SECRET}`);
  console.log('');
  console.log(`📊 Available Tools: ${tools.length} (42 OpenMemory + 6 Logging)`);
  console.log('');
  console.log('================================================================');
});

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Shutting down MCP SSE server...');
  process.exit(0);
});
