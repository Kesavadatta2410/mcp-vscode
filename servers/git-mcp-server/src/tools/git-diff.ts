/**
 * git_diff tool - Show differences between commits/branches
 */

import { simpleGit } from 'simple-git';
import type { GitDiffResult } from '../types.js';

export interface GitDiffParams {
    repo_path?: string;
    ref_a?: string;
    ref_b?: string;
    path?: string;
    include_diff?: boolean;
}

/**
 * Show diff between commits, branches, or working directory
 * 
 * @param params - Comparison parameters
 * @returns Diff statistics and optionally full diff text
 */
export async function gitDiff(params: GitDiffParams = {}): Promise<GitDiffResult> {
    const repoPath = params.repo_path || process.env.GIT_REPO_PATH || process.env.PROJECT_PATH || process.cwd();
    const { ref_a, ref_b, path, include_diff = false } = params;

    const git = simpleGit(repoPath);

    // Check if it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
        throw new Error(`Not a git repository: ${repoPath}`);
    }

    // Build diff args
    const args = ['--numstat'];
    if (ref_a) args.push(ref_a);
    if (ref_b) args.push(ref_b);
    else if (ref_a) args.push('HEAD'); // Compare ref_a to HEAD if ref_b not specified
    if (path) args.push('--', path);

    // Get diff stats
    const diffSummary = await git.diffSummary(args);

    let diffText: string | undefined;
    if (include_diff) {
        const diffArgs: string[] = [];
        if (ref_a) diffArgs.push(ref_a);
        if (ref_b) diffArgs.push(ref_b);
        else if (ref_a) diffArgs.push('HEAD');
        if (path) diffArgs.push('--', path);

        diffText = await git.diff(diffArgs);
    }

    return {
        files: diffSummary.files.map((f: any) => ({
            path: f.file,
            additions: f.insertions || 0,
            deletions: f.deletions || 0,
            changes: f.changes || 0
        })),
        insertions: diffSummary.insertions,
        deletions: diffSummary.deletions,
        diff: diffText
    };
}
