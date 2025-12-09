/**
 * git_status tool - Get repository status
 */

import { simpleGit } from 'simple-git';
import type { GitStatusResult } from '../types.js';

export interface GitStatusParams {
    repo_path?: string;
}

/**
 * Get the status of a Git repository
 * 
 * @param params - Repository path (defaults to GIT_REPO_PATH env var)
 * @returns Repository status including modified, staged, untracked files
 */
export async function gitStatus(params: GitStatusParams = {}): Promise<GitStatusResult> {
    const repoPath = params.repo_path || process.env.GIT_REPO_PATH || process.env.PROJECT_PATH || process.cwd();

    const git = simpleGit(repoPath);

    // Check if it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
        throw new Error(`Not a git repository: ${repoPath}`);
    }

    const status = await git.status();

    return {
        modified: status.modified,
        added: status.created,
        deleted: status.deleted,
        renamed: status.renamed.map(r => ({ from: r.from, to: r.to })),
        untracked: status.not_added,
        staged: status.staged,
        conflicted: status.conflicted,
        ahead: status.ahead,
        behind: status.behind,
        current: status.current
    };
}
