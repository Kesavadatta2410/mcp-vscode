/**
 * git_pull tool - Pull changes from remote
 */

import { simpleGit } from 'simple-git';
import type { GitOperationResult } from '../types.js';

export interface GitPullParams {
    repo_path?: string;
    remote?: string;
    branch?: string;
}

/**
 * Pull changes from remote repository
 * 
 * @param params - Pull parameters
 * @returns Operation result
 */
export async function gitPull(params: GitPullParams = {}): Promise<GitOperationResult> {
    const repoPath = params.repo_path || process.env.GIT_REPO_PATH || process.env.PROJECT_PATH || process.cwd();
    const { remote = 'origin', branch } = params;

    const git = simpleGit(repoPath);

    // Check if it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
        throw new Error(`Not a git repository: ${repoPath}`);
    }

    // Safety check: ensure working directory is clean
    const status = await git.status();
    if (status.files.length > 0) {
        return {
            success: false,
            message: `Working directory has uncommitted changes. Please commit or stash changes before pulling.`
        };
    }

    try {
        const pullArgs: string[] = [remote];
        if (branch) {
            pullArgs.push(branch);
        }

        const result = await git.pull(pullArgs);

        return {
            success: true,
            message: `Successfully pulled from ${remote}${branch ? `/${branch}` : ''}`,
            data: {
                files: result.files,
                summary: result.summary,
                insertions: result.insertions,
                deletions: result.deletions
            }
        };
    } catch (error: any) {
        // Check for merge conflicts
        if (error.message.includes('CONFLICT') || error.message.includes('conflict')) {
            return {
                success: false,
                message: `Pull failed: Merge conflicts detected. Please resolve conflicts manually.`
            };
        }

        return {
            success: false,
            message: `Failed to pull: ${error.message}`
        };
    }
}
