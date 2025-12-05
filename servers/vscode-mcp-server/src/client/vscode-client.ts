/**
 * HTTP client for communicating with the VS Code diagnostics service
 * running inside the Docker container
 */

import type {
    DiagnosticsResponse,
    OpenFileResponse,
    CloseFileResponse,
    HealthResponse
} from '../types.js';

/**
 * Client for the VS Code diagnostics service
 */
export class VSCodeServiceClient {
    private baseUrl: string;
    private timeout: number;

    /**
     * Create a new VSCode service client
     * 
     * @param baseUrl - Base URL of the diagnostics service (e.g., http://localhost:5007)
     * @param timeout - Request timeout in milliseconds (default: 30000)
     */
    constructor(baseUrl: string, timeout = 30000) {
        // Remove trailing slash
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.timeout = timeout;
    }

    /**
     * Make an HTTP request to the service
     */
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
                headers: {
                    'Content-Type': 'application/json',
                },
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

    /**
     * Check if the service is healthy
     */
    async health(): Promise<HealthResponse> {
        return this.request<HealthResponse>('GET', '/health');
    }

    /**
     * Open a file in VS Code and wait for diagnostics
     * 
     * @param filePath - Absolute path to the file
     */
    async openFile(filePath: string): Promise<OpenFileResponse> {
        return this.request<OpenFileResponse>('POST', '/open', { path: filePath });
    }

    /**
     * Close a file in VS Code
     * 
     * @param filePath - Absolute path to the file
     */
    async closeFile(filePath: string): Promise<CloseFileResponse> {
        return this.request<CloseFileResponse>('POST', '/close', { path: filePath });
    }

    /**
     * Get diagnostics for the project or specific files
     * 
     * @param projectRoot - Optional project root path to get diagnostics for
     */
    async getDiagnostics(projectRoot?: string): Promise<DiagnosticsResponse> {
        const params = projectRoot ? `?projectRoot=${encodeURIComponent(projectRoot)}` : '';
        return this.request<DiagnosticsResponse>('GET', `/diagnostics${params}`);
    }

    /**
     * Trigger a full project diagnostics refresh
     * 
     * @param projectRoot - Project root path
     */
    async refreshDiagnostics(projectRoot: string): Promise<DiagnosticsResponse> {
        return this.request<DiagnosticsResponse>('POST', '/diagnostics/refresh', {
            projectRoot
        });
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
