/**
 * github_get_pull_requests tool - List pull requests
 */

import { getOctokit } from '../utils.js';
import type { GitHubPullRequest } from '../types.js';

export interface GitHubGetPullRequestsParams {
    owner: string;
    repo: string;
    state?: 'open' | 'closed' | 'all';
    per_page?: number;
}

/**
 * List pull requests for a repository
 * 
 * @param params - Filter parameters
 * @returns Array of pull requests
 */
export async function githubGetPullRequests(params: GitHubGetPullRequestsParams): Promise<GitHubPullRequest[]> {
    const { owner, repo, state = 'open', per_page = 30 } = params;

    const octokit = getOctokit();

    try {
        const { data } = await octokit.pulls.list({
            owner,
            repo,
            state,
            per_page
        });

        return data.map((pr: any) => ({
            number: pr.number,
            title: pr.title,
            body: pr.body,
            state: pr.merged_at ? 'merged' : pr.state as 'open' | 'closed',
            head: pr.head.ref,
            base: pr.base.ref,
            author: pr.user?.login || 'unknown',
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            url: pr.html_url,
            mergeable: pr.mergeable
        }));
    } catch (error: any) {
        throw new Error(`Failed to list pull requests for ${owner}/${repo}: ${error.message}`);
    }
}
