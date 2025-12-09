/**
 * github_create_pull_request tool - Create a pull request
 */

import { getOctokit } from '../utils.js';
import type { GitHubOperationResult } from '../types.js';

export interface GitHubCreatePullRequestParams {
    owner: string;
    repo: string;
    title: string;
    head: string;
    base: string;
    body?: string;
}

/**
 * Create a new pull request
 * 
 * @param params - PR creation parameters
 * @returns Operation result with PR number and URL
 */
export async function githubCreatePullRequest(params: GitHubCreatePullRequestParams): Promise<GitHubOperationResult> {
    const { owner, repo, title, head, base, body } = params;

    if (!title || title.trim().length === 0) {
        return {
            success: false,
            message: 'Pull request title cannot be empty'
        };
    }

    if (!head || !base) {
        return {
            success: false,
            message: 'Both head and base branches are required'
        };
    }

    const octokit = getOctokit();

    try {
        const { data } = await octokit.pulls.create({
            owner,
            repo,
            title,
            head,
            base,
            body
        });

        return {
            success: true,
            message: `Pull request #${data.number} created successfully`,
            data: {
                number: data.number,
                url: data.html_url,
                state: data.state
            }
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Failed to create pull request: ${error.message}`
        };
    }
}
