/**
 * MCP Client Service
 * Handles all communication with MCP servers
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface MCPCallOptions {
    server: 'repo' | 'git' | 'github' | 'vscode' | 'exec';
    tool: string;
    args: Record<string, any>;
}

interface MCPResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        type: string;
        message: string;
    };
}

class MCPClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    /**
     * Call an MCP tool
     */
    async call<T = any>(options: MCPCallOptions): Promise<MCPResponse<T>> {
        try {
            const response = await this.client.post(`/mcp/${options.server}/${options.tool}`, options.args);
            return {
                success: true,
                data: response.data,
            };
        } catch (error: any) {
            console.error(`MCP call failed: ${options.server}.${options.tool}`, error);
            return {
                success: false,
                error: {
                    type: error.response?.data?.type || 'NetworkError',
                    message: error.response?.data?.message || error.message || 'Unknown error',
                },
            };
        }
    }

    // Repo MCP tools
    async listFiles(path?: string): Promise<MCPResponse<string[]>> {
        return this.call({
            server: 'repo',
            tool: 'list_files',
            args: { path: path || '/' },
        });
    }

    async getTree(maxDepth?: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'repo',
            tool: 'get_tree',
            args: { max_depth: maxDepth || 5 },
        });
    }

    async readFile(filePath: string): Promise<MCPResponse<{ content: string; lines: number }>> {
        return this.call({
            server: 'repo',
            tool: 'read_file',
            args: { file_path: filePath },
        });
    }

    async writeFile(filePath: string, content: string): Promise<MCPResponse<{ success: boolean }>> {
        return this.call({
            server: 'repo',
            tool: 'write_file',
            args: { file_path: filePath, content },
        });
    }

    async applyPatch(patch: string): Promise<MCPResponse<any>> {
        return this.call({
            server: 'repo',
            tool: 'apply_patch',
            args: { patch },
        });
    }

    // VSCode MCP tools
    async getDiagnostics(filePath?: string): Promise<MCPResponse<any>> {
        return this.call({
            server: 'vscode',
            tool: 'get_diagnostics',
            args: filePath ? { file_path: filePath } : {},
        });
    }

    // Exec MCP tools
    async runPythonFile(filePath: string, args?: string[], timeoutSeconds?: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'exec',
            tool: 'run_python_file',
            args: {
                path: filePath,
                args: args || [],
                timeoutSeconds: timeoutSeconds || 30,
            },
        });
    }

    async runJsFile(filePath: string, args?: string[], timeoutSeconds?: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'exec',
            tool: 'run_js_file',
            args: {
                path: filePath,
                args: args || [],
                timeoutSeconds: timeoutSeconds || 30,
            },
        });
    }

    async runPythonSnippet(code: string, args?: Record<string, any>, timeoutSeconds?: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'exec',
            tool: 'run_python_snippet',
            args: {
                code,
                args: args || {},
                timeoutSeconds: timeoutSeconds || 30,
            },
        });
    }

    async runJsSnippet(code: string, args?: Record<string, any>, timeoutSeconds?: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'exec',
            tool: 'run_js_snippet',
            args: {
                code,
                args: args || {},
                timeoutSeconds: timeoutSeconds || 30,
            },
        });
    }

    // Git MCP tools
    async gitStatus(repoPath?: string): Promise<MCPResponse<any>> {
        return this.call({
            server: 'git',
            tool: 'git_status',
            args: repoPath ? { repo_path: repoPath } : {},
        });
    }

    async gitCommit(message: string, files?: string[]): Promise<MCPResponse<any>> {
        return this.call({
            server: 'git',
            tool: 'git_commit',
            args: { message, files: files || [] },
        });
    }

    // GitHub MCP tools
    async githubGetRepos(username: string): Promise<MCPResponse<any>> {
        return this.call({
            server: 'github',
            tool: 'github_get_repos',
            args: { username },
        });
    }

    async githubCreateIssue(repo: string, title: string, body?: string, labels?: string[]): Promise<MCPResponse<any>> {
        return this.call({
            server: 'github',
            tool: 'github_create_issue',
            args: { repo, title, body: body || '', labels: labels || [] },
        });
    }
}

export const mcpClient = new MCPClient();
export default mcpClient;
