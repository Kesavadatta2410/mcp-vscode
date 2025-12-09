/**
 * Shared type definitions for GitHub MCP Server
 */

export interface GitHubRepo {
    name: string;
    full_name: string;
    owner: string;
    description: string | null;
    visibility: 'public' | 'private';
    default_branch: string;
    url: string;
    clone_url: string;
    ssh_url: string;
}

export interface GitHubIssue {
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    labels: string[];
    author: string;
    created_at: string;
    updated_at: string;
    url: string;
}

export interface GitHubPullRequest {
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed' | 'merged';
    head: string;
    base: string;
    author: string;
    created_at: string;
    updated_at: string;
    url: string;
    mergeable: boolean | null;
}

export interface GitHubOperationResult {
    success: boolean;
    message: string;
    data?: any;
}
