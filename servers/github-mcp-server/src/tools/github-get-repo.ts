/**
 * github_get_repo tool - Get repository details
 */

import { getOctokit } from '../utils.js';
import type { GitHubRepo } from '../types.js';

export interface GitHubGetRepoParams {
    owner: string;
    repo: string;
}

/**
 * Get details for a specific repository
 * 
 * @param params - Owner and repo name
 * @returns Repository information
 */
export async function githubGetRepo(params: GitHubGetRepoParams): Promise<GitHubRepo> {
    const { owner, repo } = params;

    const octokit = getOctokit();

    try {
        const { data } = await octokit.repos.get({
            owner,
            repo
        });

        return {
            name: data.name,
            full_name: data.full_name,
            owner: data.owner.login,
            description: data.description,
            visibility: data.private ? 'private' : 'public',
            default_branch: data.default_branch,
            url: data.html_url,
            clone_url: data.clone_url,
            ssh_url: data.ssh_url
        };
    } catch (error: any) {
        throw new Error(`Failed to get repo ${owner}/${repo}: ${error.message}`);
    }
}
