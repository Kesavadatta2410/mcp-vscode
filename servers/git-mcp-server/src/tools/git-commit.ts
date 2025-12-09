/**
 * git_commit tool - Stage and commit changes
 */

import { simpleGit } from 'simple-git';
import type { GitOperationResult } from '../types.js';

export interface GitCommitParams {
    repo_path?: string;
    message: string;
    add_all?: boolean;
    files?: string[];
}

/**
 * Stage and commit changes
 * 
 * @param params - Commit parameters
 * @returns Operation result with commit hash
 */
export async function gitCommit(params: GitCommitParams): Promise<GitOperationResult> {
    const repoPath = params.repo_path || process.env.GIT_REPO_PATH || process.env.PROJECT_PATH || process.cwd();
    const { message, add_all = false, files = [] } = params;

    if (!message || message.trim().length === 0) {
        return {
            success: false,
            message: 'Commit message cannot be empty'
        };
    }

    const git = simpleGit(repoPath);

    // Check if it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
        throw new Error(`Not a git repository: ${repoPath}`);
    }

    try {
        // Stage files
        if (add_all) {
            await git.add('.');
        } else if (files.length > 0) {
            await git.add(files);
        }

        // Check if there are staged changes
        const status = await git.status();
        if (status.staged.length === 0) {
            return {
                success: false,
                message: 'No changes staged for commit. Use add_all or specify files.'
            };
        }

        // Commit
        const result = await git.commit(message);

        return {
            success: true,
            message: `Committed ${result.commit} with ${result.summary.changes} changes`,
            data: {
                commit: result.commit,
                summary: result.summary
            }
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Failed to commit: ${error.message}`
        };
    }
}
