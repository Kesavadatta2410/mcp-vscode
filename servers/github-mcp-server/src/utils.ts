/**
 * GitHub utilities - shared Octokit instance and helpers
 */

import { Octokit } from '@octokit/rest';

let octokitInstance: Octokit | null = null;

/**
 * Get or create Octokit instance with GitHub token
 */
export function getOctokit(): Octokit {
    if (!octokitInstance) {
        const token = process.env.GITHUB_TOKEN;

        if (!token) {
            throw new Error(
                'GITHUB_TOKEN environment variable is not set. ' +
                'Please set a GitHub personal access token to use GitHub API features.'
            );
        }

        octokitInstance = new Octokit({
            auth: token
        });
    }

    return octokitInstance;
}

/**
 * Check if GitHub token is configured
 */
export function hasGitHubToken(): boolean {
    return !!process.env.GITHUB_TOKEN;
}
