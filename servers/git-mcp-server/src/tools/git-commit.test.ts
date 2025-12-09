/**
 * Tests for git_commit tool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { simpleGit, SimpleGit } from 'simple-git';
import { gitCommit } from './git-commit';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('git_commit', () => {
    let testDir: string;
    let git: SimpleGit;
    let originalGitRepoPath: string | undefined;

    beforeEach(async () => {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-commit-test-'));
        git = simpleGit(testDir);

        await git.init();
        await git.addConfig('user.name', 'Test User');
        await git.addConfig('user.email', 'test@example.com');

        originalGitRepoPath = process.env.GIT_REPO_PATH;
        process.env.GIT_REPO_PATH = testDir;
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
        if (originalGitRepoPath) {
            process.env.GIT_REPO_PATH = originalGitRepoPath;
        } else {
            delete process.env.GIT_REPO_PATH;
        }
    });

    it('should commit with add_all option', async () => {
        await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
        await fs.writeFile(path.join(testDir, 'file2.txt'), 'content2');

        const result = await gitCommit({
            message: 'Test commit',
            add_all: true
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('Committed');
        expect(result.data?.commit).toBeDefined();
    });

    it('should commit specific files', async () => {
        await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
        await fs.writeFile(path.join(testDir, 'file2.txt'), 'content2');

        const result = await gitCommit({
            message: 'Partial commit',
            files: ['file1.txt']
        });

        expect(result.success).toBe(true);

        // Verify only file1 was committed
        const status = await git.status();
        expect(status.not_added).toContain('file2.txt');
    });

    it('should fail with empty message', async () => {
        const result = await gitCommit({
            message: ''
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('Commit message cannot be empty');
    });

    it('should fail with no staged changes', async () => {
        const result = await gitCommit({
            message: 'Test commit'
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('No changes staged');
    });

    it('should handle commit with multiline message', async () => {
        await fs.writeFile(path.join(testDir, 'file.txt'), 'content');

        const result = await gitCommit({
            message: 'First line\n\nDetailed description',
            add_all: true
        });

        expect(result.success).toBe(true);

        // Verify commit (simple-git returns first line in message field)
        const log = await git.log({ maxCount: 1 });
        expect(log.latest?.message).toContain('First line');
    });
});
