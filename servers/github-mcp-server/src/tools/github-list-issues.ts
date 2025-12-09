/**
 * github_list_issues tool - List issues for a repository
 */

import { getOctokit } from '../utils.js';
import type { GitHubIssue } from '../types.js';

export interface GitHubListIssuesParams {
    owner: string;
    repo: string;
    state?: 'open' | 'closed' | 'all';
    labels?: string[];
    per_page?: number;
}

/**
 * List issues for a repository
 * 
 * @param params - Filter parameters
 * @returns Array of issues
 */
export async function githubListIssues(params: GitHubListIssuesParams): Promise<GitHubIssue[]> {
    const { owner, repo, state = 'open', labels, per_page = 30 } = params;

    const octokit = getOctokit();

    try {
        const { data } = await octokit.issues.listForRepo({
            owner,
            repo,
            state,
            labels: labels?.join(','),
            per_page
        });

        return data.map((issue: any) => ({
            number: issue.number,
            title: issue.title,
            body: issue.body || null,
            state: issue.state as 'open' | 'closed',
            labels: issue.labels.map((label: any) => typeof label === 'string' ? label : label.name || ''),
            author: issue.user?.login || 'unknown',
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            url: issue.html_url
        }));
    } catch (error: any) {
        throw new Error(`Failed to list issues for ${owner}/${repo}: ${error.message}`);
    }
}
