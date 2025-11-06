/**
 * Process Manager
 *
 * Automatically manages dependent services (Context Manager, MCP Server)
 * when OpenMemory backend starts. Ensures all services start together
 * and shut down cleanly.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { env } from './cfg';

interface ManagedProcess {
  name: string;
  process: ChildProcess | null;
  port?: number;
  checkUrl?: string;
  enabled: boolean;
}

class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map();
  private shuttingDown = false;

  constructor() {
    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('exit', () => this.shutdown('exit'));
  }

  /**
   * Start all managed processes
   */
  async startAll(): Promise<void> {
    console.log('[Process Manager] Starting dependent services...');

    // Start Context Manager
    await this.startContextManager();

    // Wait a bit for Context Manager to be ready
    await this.sleep(2000);

    // MCP Server runs on stdio, so we don't auto-start it
    // It will be started by Claude Desktop when needed

    console.log('[Process Manager] All services started successfully');
  }

  /**
   * Start Context Manager service
   */
  private async startContextManager(): Promise<void> {
    const contextManagerPath = path.join(__dirname, '../../../.ai-agents/context-injection/context-manager');
    const indexPath = path.join(contextManagerPath, 'dist/index.js');

    // Check if context manager is enabled
    const enabled = process.env.ENABLE_CONTEXT_MANAGER !== 'false';
    if (!enabled) {
      console.log('[Process Manager] Context Manager disabled via ENABLE_CONTEXT_MANAGER=false');
      return;
    }

    // Check if context manager exists and is built
    if (!fs.existsSync(indexPath)) {
      console.log('[Process Manager] Context Manager not built, building now...');
      try {
        // Try to build it
        const { execSync } = require('child_process');
        execSync('npm run build', {
          cwd: contextManagerPath,
          stdio: 'inherit'
        });
      } catch (error) {
        console.warn('[Process Manager] Could not build Context Manager, skipping...');
        return;
      }
    }

    console.log('[Process Manager] Starting Context Manager on port 8081...');

    const contextManagerProcess = spawn('node', [indexPath], {
      cwd: contextManagerPath,
      env: {
        ...process.env,
        CONTEXT_MANAGER_PORT: '8081',
        OPENMEMORY_URL: `http://localhost:${env.port}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Log output
    contextManagerProcess.stdout?.on('data', (data) => {
      console.log(`[Context Manager] ${data.toString().trim()}`);
    });

    contextManagerProcess.stderr?.on('data', (data) => {
      console.error(`[Context Manager] ${data.toString().trim()}`);
    });

    contextManagerProcess.on('error', (error) => {
      console.error('[Process Manager] Context Manager error:', error);
    });

    contextManagerProcess.on('exit', (code) => {
      if (!this.shuttingDown) {
        console.error(`[Process Manager] Context Manager exited with code ${code}`);
        // Don't restart automatically - let user investigate
      }
    });

    this.processes.set('context-manager', {
      name: 'Context Manager',
      process: contextManagerProcess,
      port: 8081,
      checkUrl: 'http://localhost:8081/health',
      enabled: true,
    });

    // Wait for it to be ready
    await this.waitForService('http://localhost:8081/health', 10);
  }

  /**
   * Wait for a service to be ready
   */
  private async waitForService(url: string, maxAttempts: number = 10): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          console.log(`[Process Manager] Service ready: ${url}`);
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }
      await this.sleep(1000);
    }
    console.warn(`[Process Manager] Service did not become ready: ${url}`);
    return false;
  }

  /**
   * Shutdown all managed processes
   */
  private async shutdown(signal: string): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    console.log(`\n[Process Manager] Shutting down (${signal})...`);

    for (const [key, managed] of this.processes.entries()) {
      if (managed.process && !managed.process.killed) {
        console.log(`[Process Manager] Stopping ${managed.name}...`);
        managed.process.kill('SIGTERM');

        // Give it 5 seconds to shutdown gracefully
        await this.sleep(5000);

        if (!managed.process.killed) {
          console.log(`[Process Manager] Force killing ${managed.name}...`);
          managed.process.kill('SIGKILL');
        }
      }
    }

    console.log('[Process Manager] All services stopped');

    // Only exit if this was triggered by SIGINT/SIGTERM
    if (signal !== 'exit') {
      process.exit(0);
    }
  }

  /**
   * Get status of all managed processes
   */
  getStatus(): { name: string; running: boolean; port?: number }[] {
    const result: { name: string; running: boolean; port?: number }[] = [];
    this.processes.forEach((p) => {
      result.push({
        name: p.name,
        running: p.process !== null && !p.process.killed,
        port: p.port,
      });
    });
    return result;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const processManager = new ProcessManager();
