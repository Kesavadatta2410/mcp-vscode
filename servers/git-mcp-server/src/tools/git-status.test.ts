/**
 * Tests for git_status tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { simpleGit, SimpleGit } from 'simple-git';
import { gitStatus } from './git-status';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('git_status', () => {
    let testDir: string;
    let git: SimpleGit;
    let originalGitRepoPath: string | undefined;

    beforeEach(async () => {
        // Create temp directory for test repo
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-test-'));
        git = simpleGit(testDir);

        // Initialize git repo
        await git.init();
        await git.addConfig('user.name', 'Test User');
        await git.addConfig('user.email', 'test@example.com');

        // Set env var
        originalGitRepoPath = process.env.GIT_REPO_PATH;
        process.env.GIT_REPO_PATH = testDir;
    });

    afterEach(async () => {
        // Cleanup
        await fs.rm(testDir, { recursive: true, force: true });
        if (originalGitRepoPath) {
            process.env.GIT_REPO_PATH = originalGitRepoPath;
        } else {
            delete process.env.GIT_REPO_PATH;
        }
    });

    it('should return clean status for empty repo', async () => {
        const result = await gitStatus();

        expect(result.modified).toEqual([]);
        expect(result.added).toEqual([]);
        expect(result.deleted).toEqual([]);
        expect(result.untracked).toEqual([]);
        expect(result.staged).toEqual([]);
        expect(result.conflicted).toEqual([]);
    });

    it('should detect untracked files', async () => {
        await fs.writeFile(path.join(testDir, 'new-file.txt'), 'test content');

        const result = await gitStatus();

        expect(result.untracked).toContain('new-file.txt');
        expect(result.modified).toEqual([]);
        expect(result.staged).toEqual([]);
    });

    it('should detect staged files', async () => {
        await fs.writeFile(path.join(testDir, 'file.txt'), 'content');
        await git.add('file.txt');

        const result = await gitStatus();

        expect(result.staged).toContain('file.txt');
        expect(result.added).toContain('file.txt');
        expect(result.modified).toEqual([]);
    });

    it('should detect modified files', async () => {
        // Create and commit a file
        await fs.writeFile(path.join(testDir, 'file.txt'), 'original');
        await git.add('file.txt');
        await git.commit('Initial commit');

        // Modify the file
        await fs.writeFile(path.join(testDir, 'file.txt'), 'modified');

        const result = await gitStatus();

        expect(result.modified).toContain('file.txt');
        expect(result.staged).toEqual([]);
    });

    it('should throw error for non-git directory', async () => {
        const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'non-git-'));

        try {
            await expect(gitStatus({ repo_path: nonGitDir })).rejects.toThrow('Not a git repository');
        } finally {
            await fs.rm(nonGitDir, { recursive: true, force: true });
        }
    });

    it('should use custom repo_path parameter', async () => {
        // Create another test repo
        const customDir = await fs.mkdtemp(path.join(os.tmpdir(), 'custom-git-'));
        const customGit = simpleGit(customDir);

        try {
            await customGit.init();
            await customGit.addConfig('user.name', 'Test');
            await customGit.addConfig('user.email', 'test@test.com');

            const result = await gitStatus({ repo_path: customDir });

            expect(result).toBeDefined();
            expect(result.current).toBeTruthy();
        } finally {
            await fs.rm(customDir, { recursive: true, force: true });
        }
    });
});
