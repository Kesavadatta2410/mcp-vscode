/**
 * git_log tool - Get commit history
 */

import { simpleGit } from 'simple-git';
import type { GitCommitInfo } from '../types.js';

export interface GitLogParams {
    repo_path?: string;
    limit?: number;
    branch?: string;
}

/**
 * Get commit history
 * 
 * @param params - Log parameters
 * @returns Array of commit information
 */
export async function gitLog(params: GitLogParams = {}): Promise<GitCommitInfo[]> {
    const repoPath = params.repo_path || process.env.GIT_REPO_PATH || process.env.PROJECT_PATH || process.cwd();
    const { limit = 10, branch } = params;

    const git = simpleGit(repoPath);

    // Check if it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
        throw new Error(`Not a git repository: ${repoPath}`);
    }

    const logOptions: any = {
        maxCount: limit
    };

    if (branch) {
        logOptions.from = branch;
    }

    const log = await git.log(logOptions);

    return log.all.map(commit => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email
    }));
}
