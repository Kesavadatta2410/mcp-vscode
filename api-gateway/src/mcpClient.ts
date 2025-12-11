/**
 * MCP Client - Communicates with MCP servers via stdio
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MCPRequest {
    jsonrpc: string;
    id: number;
    method: string;
    params: Record<string, any>;
}

interface MCPResponse {
    jsonrpc: string;
    id: number;
    result?: any;
    error?: {
        code: number;
        message: string;
    };
}

class MCPServerClient {
    private process: ChildProcess | null = null;
    private serverPath: string;
    private requestId = 0;
    private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
    private buffer = '';

    constructor(serverName: string) {
        // Use process.cwd() which should be the project root when starting from api-gateway
        const projectRoot = path.resolve(process.cwd(), '..');
        this.serverPath = path.join(projectRoot, 'servers', `${serverName}-mcp-server`, 'dist', 'index.js');

        console.log(`[MCPClient] Looking for ${serverName} at: ${this.serverPath}`);
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Check if server file exists
            if (!fs.existsSync(this.serverPath)) {
                const error = new Error(
                    `MCP server not found at: ${this.serverPath}\n` +
                    `Please build the server first:\n` +
                    `  cd ${path.dirname(path.dirname(this.serverPath))}\n` +
                    `  npm install\n` +
                    `  npm run build`
                );
                reject(error);
                return;
            }

            this.process = spawn('node', [this.serverPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    ENABLE_CODE_EXECUTION: 'true',
                    PROJECT_PATH: process.cwd(),
                    ALLOWED_DIRECTORIES: process.cwd(),
                    GIT_REPO_PATH: process.cwd(),
                },
            });

            if (!this.process.stdout || !this.process.stdin) {
                reject(new Error('Failed to create stdio streams'));
                return;
            }

            this.process.stdout.on('data', (data: Buffer) => {
                this.handleOutput(data.toString());
            });

            this.process.stderr?.on('data', (data: Buffer) => {
                console.error(`[${path.basename(this.serverPath)}] stderr:`, data.toString());
            });

            this.process.on('error', (error) => {
                console.error(`[${path.basename(this.serverPath)}] error:`, error);
                reject(error);
            });

            this.process.on('exit', (code) => {
                console.log(`[${path.basename(this.serverPath)}] exited with code ${code}`);
            });

            // Give it a moment to start
            setTimeout(resolve, 500);
        });
    }

    private handleOutput(data: string): void {
        this.buffer += data;
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const response: MCPResponse = JSON.parse(line);
                const pending = this.pendingRequests.get(response.id);

                if (pending) {
                    this.pendingRequests.delete(response.id);
                    if (response.error) {
                        pending.reject(new Error(response.error.message));
                    } else {
                        pending.resolve(response.result);
                    }
                }
            } catch (error) {
                console.error('Failed to parse MCP response:', line, error);
            }
        }
    }

    async call(method: string, params: Record<string, any>): Promise<any> {
        if (!this.process || !this.process.stdin) {
            throw new Error('MCP server not started');
        }

        const id = ++this.requestId;
        const request: MCPRequest = {
            jsonrpc: '2.0',
            id,
            method,
            params,
        };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });

            this.process!.stdin!.write(JSON.stringify(request) + '\n');

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    stop(): void {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }
}

export class MCPClientManager {
    private clients = new Map<string, MCPServerClient>();

    async getClient(serverName: string): Promise<MCPServerClient> {
        if (!this.clients.has(serverName)) {
            const client = new MCPServerClient(serverName);
            await client.start();
            this.clients.set(serverName, client);
        }
        return this.clients.get(serverName)!;
    }

    stopAll(): void {
        for (const client of this.clients.values()) {
            client.stop();
        }
        this.clients.clear();
    }
}

export default MCPClientManager;
