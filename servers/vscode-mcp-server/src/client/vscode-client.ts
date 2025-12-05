/**
 * HTTP client for communicating with the VS Code headless service
 * Extended with full VS Code functionality support
 */

import type {
    DiagnosticsResponse,
    OpenFileResponse,
    CloseFileResponse,
    SaveFileResponse,
    HealthResponse,
    ExtensionListResponse,
    ExtensionOperationResponse,
    OpenFilesResponse,
    SettingsResponse,
    SettingsUpdateResponse,
    TextSearchResponse,
    SymbolSearchResponse,
    CodeActionsResponse,
    FormatResponse,
    DefinitionResponse,
    ReferencesResponse,
    CommandExecuteResponse,
    TerminalCreateResponse,
    TerminalSendResponse,
    TerminalReadResponse,
    TerminalCloseResponse,
    DebugStartResponse,
    DebugBreakpointResponse,
    DebugStopResponse,
    TaskListResponse,
    TaskRunResponse
} from '../types.js';

/**
 * Client for the VS Code headless service
 */
export class VSCodeServiceClient {
    private baseUrl: string;
    private timeout: number;

    constructor(baseUrl: string, timeout = 30000) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.timeout = timeout;
    }

    private async request<T>(
        method: 'GET' | 'POST' | 'DELETE',
        path: string,
        body?: Record<string, unknown>
    ): Promise<T> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            return await response.json() as T;
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timeout after ${this.timeout}ms`);
            }
            throw error;
        }
    }

    // ========== Core Operations ==========

    async health(): Promise<HealthResponse> {
        return this.request<HealthResponse>('GET', '/health');
    }

    async openFile(filePath: string): Promise<OpenFileResponse> {
        return this.request<OpenFileResponse>('POST', '/open', { path: filePath });
    }

    async closeFile(filePath: string): Promise<CloseFileResponse> {
        return this.request<CloseFileResponse>('POST', '/close', { path: filePath });
    }

    async saveFile(filePath: string, content?: string): Promise<SaveFileResponse> {
        return this.request<SaveFileResponse>('POST', '/workspace/save', { path: filePath, content });
    }

    async getDiagnostics(projectRoot?: string): Promise<DiagnosticsResponse> {
        const params = projectRoot ? `?projectRoot=${encodeURIComponent(projectRoot)}` : '';
        return this.request<DiagnosticsResponse>('GET', `/diagnostics${params}`);
    }

    async refreshDiagnostics(projectRoot: string): Promise<DiagnosticsResponse> {
        return this.request<DiagnosticsResponse>('POST', '/diagnostics/refresh', { projectRoot });
    }

    // ========== Extension Management ==========

    async listExtensions(): Promise<ExtensionListResponse> {
        return this.request<ExtensionListResponse>('GET', '/extensions');
    }

    async installExtension(extensionId: string): Promise<ExtensionOperationResponse> {
        return this.request<ExtensionOperationResponse>('POST', '/extensions/install', { extensionId });
    }

    async uninstallExtension(extensionId: string): Promise<ExtensionOperationResponse> {
        return this.request<ExtensionOperationResponse>('POST', '/extensions/uninstall', { extensionId });
    }

    async enableExtension(extensionId: string): Promise<ExtensionOperationResponse> {
        return this.request<ExtensionOperationResponse>('POST', '/extensions/enable', { extensionId });
    }

    async disableExtension(extensionId: string): Promise<ExtensionOperationResponse> {
        return this.request<ExtensionOperationResponse>('POST', '/extensions/disable', { extensionId });
    }

    // ========== Workspace Operations ==========

    async listOpenFiles(): Promise<OpenFilesResponse> {
        return this.request<OpenFilesResponse>('GET', '/workspace/open-files');
    }

    async getSettings(): Promise<SettingsResponse> {
        return this.request<SettingsResponse>('GET', '/workspace/settings');
    }

    async updateSettings(settings: Record<string, unknown>, scope: 'workspace' | 'user' = 'workspace'): Promise<SettingsUpdateResponse> {
        return this.request<SettingsUpdateResponse>('POST', '/workspace/settings', { settings, scope });
    }

    // ========== Search ==========

    async searchText(params: {
        query: string;
        path?: string;
        caseSensitive?: boolean;
        regex?: boolean;
        includes?: string[];
        excludes?: string[];
        maxResults?: number;
    }): Promise<TextSearchResponse> {
        return this.request<TextSearchResponse>('POST', '/search/text', params);
    }

    async searchSymbols(params: {
        query: string;
        path?: string;
        kind?: string;
    }): Promise<SymbolSearchResponse> {
        return this.request<SymbolSearchResponse>('POST', '/search/symbols', params);
    }

    // ========== Code Intelligence ==========

    async getCodeActions(params: {
        path: string;
        line?: number;
        character?: number;
    }): Promise<CodeActionsResponse> {
        return this.request<CodeActionsResponse>('POST', '/code/actions', params);
    }

    async formatDocument(filePath: string, options?: Record<string, unknown>): Promise<FormatResponse> {
        return this.request<FormatResponse>('POST', '/code/format', { path: filePath, options });
    }

    async goToDefinition(params: {
        path: string;
        symbol: string;
        line?: number;
        character?: number;
    }): Promise<DefinitionResponse> {
        return this.request<DefinitionResponse>('POST', '/code/definition', params);
    }

    async findReferences(params: {
        path: string;
        symbol: string;
        line?: number;
        character?: number;
    }): Promise<ReferencesResponse> {
        return this.request<ReferencesResponse>('POST', '/code/references', params);
    }

    // ========== Command Execution ==========

    async executeCommand(commandId: string, args?: unknown[]): Promise<CommandExecuteResponse> {
        return this.request<CommandExecuteResponse>('POST', '/command/execute', { commandId, args });
    }

    // ========== Terminal Operations ==========

    async createTerminal(cwd?: string, shell?: string): Promise<TerminalCreateResponse> {
        return this.request<TerminalCreateResponse>('POST', '/terminal/create', { cwd, shell });
    }

    async sendTerminalInput(terminalId: string, input: string): Promise<TerminalSendResponse> {
        return this.request<TerminalSendResponse>('POST', '/terminal/send', { terminalId, input });
    }

    async readTerminal(terminalId: string): Promise<TerminalReadResponse> {
        return this.request<TerminalReadResponse>('GET', `/terminal/${terminalId}`);
    }

    async closeTerminal(terminalId: string): Promise<TerminalCloseResponse> {
        return this.request<TerminalCloseResponse>('DELETE', `/terminal/${terminalId}`);
    }

    // ========== Debug Operations ==========

    async startDebug(config: Record<string, unknown>): Promise<DebugStartResponse> {
        return this.request<DebugStartResponse>('POST', '/debug/start', { config });
    }

    async setBreakpoint(sessionId: string, file: string, line: number, remove = false): Promise<DebugBreakpointResponse> {
        return this.request<DebugBreakpointResponse>('POST', '/debug/breakpoint', { sessionId, file, line, remove });
    }

    async stopDebug(sessionId: string): Promise<DebugStopResponse> {
        return this.request<DebugStopResponse>('DELETE', '/debug/stop', { sessionId });
    }

    // ========== Task Operations ==========

    async listTasks(): Promise<TaskListResponse> {
        return this.request<TaskListResponse>('GET', '/tasks');
    }

    async runTask(taskLabel: string, type?: string): Promise<TaskRunResponse> {
        return this.request<TaskRunResponse>('POST', '/tasks/run', { taskLabel, type });
    }
}

/**
 * Create a service client from environment variables
 */
export function createServiceClient(): VSCodeServiceClient {
    const baseUrl = process.env.VSCODE_SERVICE_URL || 'http://localhost:5007';
    const timeout = parseInt(process.env.VSCODE_SERVICE_TIMEOUT || '30000', 10);
    return new VSCodeServiceClient(baseUrl, timeout);
}
