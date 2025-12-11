/**
 * Type definitions for the frontend
 */

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

export interface DiagnosticItem {
    file: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    source?: string;
}

export interface ExecResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
    timedOut: boolean;
    error?: {
        type: string;
        message: string;
    };
}

export interface GitStatus {
    current: string;
    tracking?: string;
    ahead: number;
    behind: number;
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
    staged: string[];
    conflicted: string[];
}
