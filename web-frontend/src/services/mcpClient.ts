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
            // Backend returns { success: true, data: {...} }, extract the data field
            const backendResponse = response.data;
            if (backendResponse.success && backendResponse.data !== undefined) {
                return {
                    success: true,
                    data: backendResponse.data,
                };
            }
            return {
                success: backendResponse.success ?? true,
                data: backendResponse.data ?? backendResponse,
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
            args: { root_path: path || '/' },
        });
    }

    async getTree(maxDepth?: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'repo',
            tool: 'get_tree',
            args: { root_path: '.', max_depth: maxDepth || 5 },
        });
    }

    async readFile(filePath: string): Promise<MCPResponse<{ content: string; lines: number }>> {
        return this.call({
            server: 'repo',
            tool: 'read_file',
            args: { path: filePath },
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

    async deleteFile(filePath: string): Promise<MCPResponse<any>> {
        return this.call({
            server: 'repo',
            tool: 'delete_file',
            args: { path: filePath },
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

    async searchText(query: string, path?: string): Promise<MCPResponse<any>> {
        return this.call({
            server: 'vscode',
            tool: 'search_text',
            args: { query, path },
        });
    }

    async searchSymbol(query: string): Promise<MCPResponse<any>> {
        return this.call({
            server: 'vscode',
            tool: 'search_symbol',
            args: { query },
        });
    }

    async formatDocument(filePath: string): Promise<MCPResponse<any>> {
        return this.call({
            server: 'vscode',
            tool: 'format_document',
            args: { path: filePath },
        });
    }

    async goToDefinition(filePath: string, line: number, column: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'vscode',
            tool: 'go_to_definition',
            args: { path: filePath, line, column },
        });
    }

    async findReferences(filePath: string, line: number, column: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'vscode',
            tool: 'find_references',
            args: { path: filePath, line, column },
        });
    }

    async getCodeActions(filePath: string, startLine: number, endLine: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'vscode',
            tool: 'get_code_actions',
            args: { path: filePath, startLine, endLine },
        });
    }

    // Exec MCP tools
    async runPythonFile(filePath: string, args?: string[], timeoutSeconds?: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'exec',
            tool: 'run_python_file',
            args: {
                file_path: filePath,
                args: args || [],
                timeoutSeconds: timeoutSeconds || 30,
            },
        });
    }

    async runJsFile(filePath: string, args?: string[], timeoutSeconds?: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'exec',
            tool: 'run_javascript_file',
            args: {
                file_path: filePath,
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

    async gitLog(limit?: number): Promise<MCPResponse<any>> {
        return this.call({
            server: 'git',
            tool: 'git_log',
            args: { limit: limit || 10 },
        });
    }

    async gitDiff(file?: string): Promise<MCPResponse<any>> {
        return this.call({
            server: 'git',
            tool: 'git_diff',
            args: file ? { file } : {},
        });
    }

    async gitBranch(): Promise<MCPResponse<any>> {
        return this.call({
            server: 'git',
            tool: 'git_branch',
            args: {},
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

    /**
     * Generic call for AI-planned actions
     */
    async callTool(server: string, tool: string, args: Record<string, any>): Promise<MCPResponse<any>> {
        return this.call({
            server: server as any,
            tool,
            args,
        });
    }
}

export const mcpClient = new MCPClient();
export default mcpClient;

