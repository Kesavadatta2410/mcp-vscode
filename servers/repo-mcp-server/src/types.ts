/**
 * Shared type definitions for the MCP VSCode project
 */

/**
 * File information returned by list_files
 */
export interface FileInfo {
    path: string;
    name: string;
    type: 'file' | 'directory';
    size?: number;
    modified?: string;
}

/**
 * Directory tree node for get_tree
 */
export interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: TreeNode[];
}

/**
 * Result of a file operation
 */
export interface FileOperationResult {
    success: boolean;
    message: string;
    path?: string;
}

/**
 * Patch operation result
 */
export interface PatchResult {
    success: boolean;
    message: string;
    hunksApplied?: number;
    hunksFailed?: number;
}

/**
 * Diagnostic from language server
 */
export interface Diagnostic {
    file: string;
    range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    source?: string;
    code?: string | number;
}

/**
 * Diagnostics response from VS Code service
 */
export interface DiagnosticsResponse {
    diagnostics: Diagnostic[];
    totalErrors: number;
    totalWarnings: number;
    totalInfo: number;
    totalHints: number;
}
