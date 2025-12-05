/**
 * Type definitions for VS Code MCP Server
 */

/**
 * Diagnostic severity levels matching VS Code
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * Position in a document
 */
export interface Position {
    line: number;
    character: number;
}

/**
 * Range in a document
 */
export interface Range {
    start: Position;
    end: Position;
}

/**
 * A single diagnostic (error, warning, etc.)
 */
export interface Diagnostic {
    file: string;
    range: Range;
    severity: DiagnosticSeverity;
    message: string;
    source?: string;
    code?: string | number;
}

/**
 * Response from the diagnostics service
 */
export interface DiagnosticsResponse {
    success: boolean;
    diagnostics: Diagnostic[];
    summary: {
        totalErrors: number;
        totalWarnings: number;
        totalInfo: number;
        totalHints: number;
        totalFiles: number;
    };
    error?: string;
}

/**
 * Response from open file operation
 */
export interface OpenFileResponse {
    success: boolean;
    path: string;
    message: string;
}

/**
 * Response from close file operation
 */
export interface CloseFileResponse {
    success: boolean;
    path: string;
    message: string;
}

/**
 * Health check response from the service
 */
export interface HealthResponse {
    status: 'ok' | 'error';
    version: string;
    uptime: number;
}
