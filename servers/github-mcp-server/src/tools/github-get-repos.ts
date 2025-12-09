/**
 * github_get_repos tool - List repositories
 */

import { getOctokit } from '../utils.js';
import type { GitHubRepo } from '../types.js';

export interface GitHubGetReposParams {
    user_or_org: string;
    type?: 'all' | 'owner' | 'member';
    per_page?: number;
}

/**
 * List repositories for a user or organization
 * 
 * @param params - User/org and filter parameters
 * @returns Array of repository information
 */
export async function githubGetRepos(params: GitHubGetReposParams): Promise<GitHubRepo[]> {
    const { user_or_org, type = 'owner', per_page = 30 } = params;

    const octokit = getOctokit();

    try {
        const { data } = await octokit.repos.listForUser({
            username: user_or_org,
            type: type,
            per_page: per_page,
            sort: 'updated'
        });

        return data.map((repo: any) => ({
            name: repo.name,
            full_name: repo.full_name,
            owner: repo.owner.login,
            description: repo.description || null,
            visibility: (repo.private ? 'private' : 'public') as 'private' | 'public',
            default_branch: repo.default_branch,
            url: repo.html_url,
            clone_url: repo.clone_url,
            ssh_url: repo.ssh_url
        }));
    } catch (error: any) {
        throw new Error(`Failed to list repos: ${error.message}`);
    }
}
