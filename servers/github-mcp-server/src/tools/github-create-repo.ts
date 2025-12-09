/**
 * github_create_repo tool - Create a new repository
 */

import { getOctokit } from '../utils.js';
import type { GitHubOperationResult } from '../types.js';

export interface GitHubCreateRepoParams {
    name: string;
    description?: string;
    visibility?: 'public' | 'private';
    auto_init?: boolean;
}

/**
 * Create a new repository
 * 
 * @param params - Repository creation parameters
 * @returns Operation result with repo URL
 */
export async function githubCreateRepo(params: GitHubCreateRepoParams): Promise<GitHubOperationResult> {
    const { name, description, visibility = 'public', auto_init = true } = params;

    const octokit = getOctokit();

    try {
        const { data } = await octokit.repos.createForAuthenticatedUser({
            name,
            description,
            private: visibility === 'private',
            auto_init
        });

        return {
            success: true,
            message: `Repository ${data.full_name} created successfully`,
            data: {
                full_name: data.full_name,
                url: data.html_url,
                clone_url: data.clone_url,
                ssh_url: data.ssh_url
            }
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Failed to create repository: ${error.message}`
        };
    }
}
