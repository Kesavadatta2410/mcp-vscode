/**
 * github_create_issue tool - Create an issue
 */

import { getOctokit } from '../utils.js';
import type { GitHubOperationResult } from '../types.js';

export interface GitHubCreateIssueParams {
    owner: string;
    repo: string;
    title: string;
    body?: string;
    labels?: string[];
}

/**
 * Create a new issue in a repository
 * 
 * @param params - Issue creation parameters
 * @returns Operation result with issue number and URL
 */
export async function githubCreateIssue(params: GitHubCreateIssueParams): Promise<GitHubOperationResult> {
    const { owner, repo, title, body, labels = [] } = params;

    if (!title || title.trim().length === 0) {
        return {
            success: false,
            message: 'Issue title cannot be empty'
        };
    }

    const octokit = getOctokit();

    try {
        const { data } = await octokit.issues.create({
            owner,
            repo,
            title,
            body,
            labels
        });

        return {
            success: true,
            message: `Issue #${data.number} created successfully`,
            data: {
                number: data.number,
                url: data.html_url,
                state: data.state
            }
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Failed to create issue: ${error.message}`
        };
    }
}
