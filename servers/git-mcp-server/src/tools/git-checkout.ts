/**
 * git_checkout tool - Checkout branch or commit
 */

import { simpleGit } from 'simple-git';
import type { GitOperationResult } from '../types.js';

export interface GitCheckoutParams {
    repo_path?: string;
    ref: string;
    create?: boolean;
}

/**
 * Checkout a branch or commit
 * 
 * @param params - Checkout parameters
 * @returns Operation result
 */
export async function gitCheckout(params: GitCheckoutParams): Promise<GitOperationResult> {
    const repoPath = params.repo_path || process.env.GIT_REPO_PATH || process.env.PROJECT_PATH || process.cwd();
    const { ref, create = false } = params;

    const git = simpleGit(repoPath);

    // Check if it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
        throw new Error(`Not a git repository: ${repoPath}`);
    }

    // Safety check: ensure working directory is clean or allow with warning
    const status = await git.status();
    if (status.files.length > 0) {
        return {
            success: false,
            message: `Working directory has uncommitted changes. Please commit or stash changes before checking out.`
        };
    }

    try {
        if (create) {
            await git.checkoutLocalBranch(ref);
        } else {
            await git.checkout(ref);
        }

        return {
            success: true,
            message: `Successfully checked out ${ref}`
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Failed to checkout ${ref}: ${error.message}`
        };
    }
}
