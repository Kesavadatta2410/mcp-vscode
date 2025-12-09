/**
 * git_branches tool - List branches
 */

import { simpleGit } from 'simple-git';
import type { GitBranch } from '../types.js';

export interface GitBranchesParams {
    repo_path?: string;
    include_remote?: boolean;
}

/**
 * List local and optionally remote branches
 * 
 * @param params - Branch listing parameters
 * @returns Array of branch information
 */
export async function gitBranches(params: GitBranchesParams = {}): Promise<GitBranch[]> {
    const repoPath = params.repo_path || process.env.GIT_REPO_PATH || process.env.PROJECT_PATH || process.cwd();
    const { include_remote = true } = params;

    const git = simpleGit(repoPath);

    // Check if it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
        throw new Error(`Not a git repository: ${repoPath}`);
    }

    const branchSummary = await git.branch(include_remote ? ['-a'] : []);

    return Object.entries(branchSummary.branches).map(([name, branch]) => ({
        name: name,
        current: branch.current,
        commit: branch.commit,
        remote: branch.label?.includes('remotes/') ? branch.label : undefined
    }));
}
