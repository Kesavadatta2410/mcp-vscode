/**
 * git_push tool - Push commits to remote
 */

import { simpleGit } from 'simple-git';
import type { GitOperationResult } from '../types.js';

export interface GitPushParams {
    repo_path?: string;
    remote?: string;
    branch?: string;
    set_upstream?: boolean;
}

/**
 * Push commits to remote repository
 * 
 * @param params - Push parameters
 * @returns Operation result
 */
export async function gitPush(params: GitPushParams = {}): Promise<GitOperationResult> {
    const repoPath = params.repo_path || process.env.GIT_REPO_PATH || process.env.PROJECT_PATH || process.cwd();
    const { remote = 'origin', branch, set_upstream = false } = params;

    const git = simpleGit(repoPath);

    // Check if it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
        throw new Error(`Not a git repository: ${repoPath}`);
    }

    try {
        // Get current branch if not specified
        const currentBranch = branch || (await git.status()).current;

        if (!currentBranch) {
            return {
                success: false,
                message: 'No branch specified and not on any branch'
            };
        }

        const pushOptions: string[] = [remote, currentBranch];
        if (set_upstream) {
            pushOptions.unshift('--set-upstream');
        }

        await git.push(pushOptions);

        return {
            success: true,
            message: `Successfully pushed ${currentBranch} to ${remote}`
        };
    } catch (error: any) {
        // Check if it's an authentication error
        if (error.message.includes('Authentication') || error.message.includes('Could not read from remote')) {
            return {
                success: false,
                message: `Push failed: Authentication error. Ensure Git credentials are configured.`
            };
        }

        return {
            success: false,
            message: `Failed to push: ${error.message}`
        };
    }
}
