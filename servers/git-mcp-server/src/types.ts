/**
 * Shared type definitions for Git MCP Server
 */

export interface GitStatusResult {
    modified: string[];
    added: string[];
    deleted: string[];
    renamed: Array<{ from: string; to: string }>;
    untracked: string[];
    staged: string[];
    conflicted: string[];
    ahead: number;
    behind: number;
    current: string | null;
}

export interface GitCommitInfo {
    hash: string;
    date: string;
    message: string;
    author: string;
    email: string;
}

export interface GitBranch {
    name: string;
    current: boolean;
    commit: string;
    remote?: string;
}

export interface GitDiffResult {
    files: Array<{
        path: string;
        additions: number;
        deletions: number;
        changes: number;
    }>;
    insertions: number;
    deletions: number;
    diff?: string; // Full diff text if requested
}

export interface GitOperationResult {
    success: boolean;
    message: string;
    data?: any;
}
