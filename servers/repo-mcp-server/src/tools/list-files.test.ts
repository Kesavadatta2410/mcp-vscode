/**
 * Unit tests for list-files tool
 * 
 * Note: These tests focus on testing the core functionality.
 * Path validation tests are covered in safety.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { listFiles } from './list-files.js';

// Helper to get a normalized absolute path that handles Windows short paths
function normalizePath(p: string): string {
    // On Windows, realpathSync.native resolves short paths (like KESAV~1) to full paths
    try {
        return fs.realpathSync.native(p);
    } catch {
        return path.resolve(p);
    }
}

describe('listFiles', () => {
    let testDir: string;
    let originalEnv: string | undefined;

    beforeEach(() => {
        // Save original environment
        originalEnv = process.env.ALLOWED_DIRECTORIES;

        // Create a temporary test directory and normalize its path
        const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
        testDir = normalizePath(tmpBase);

        // Set allowed directories for testing - use normalized path
        process.env.ALLOWED_DIRECTORIES = testDir;

        // Create test file structure
        fs.writeFileSync(path.join(testDir, 'file1.txt'), 'content1');
        fs.writeFileSync(path.join(testDir, 'file2.ts'), 'content2');
        fs.mkdirSync(path.join(testDir, 'subdir'));
        fs.writeFileSync(path.join(testDir, 'subdir', 'nested.txt'), 'nested');
    });

    afterEach(() => {
        // Cleanup test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }

        // Restore original environment
        if (originalEnv !== undefined) {
            process.env.ALLOWED_DIRECTORIES = originalEnv;
        } else {
            delete process.env.ALLOWED_DIRECTORIES;
        }
    });

    it('should list all files in a directory', async () => {
        const result = await listFiles({ root_path: testDir });

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);
    });

    it('should filter files by pattern', async () => {
        const result = await listFiles({
            root_path: testDir,
            pattern: '*.txt'
        });

        expect(result.every(f => f.name.endsWith('.txt'))).toBe(true);
    });

    it('should return file info with correct structure', async () => {
        const result = await listFiles({ root_path: testDir });

        result.forEach(file => {
            expect(file).toHaveProperty('path');
            expect(file).toHaveProperty('name');
            expect(file).toHaveProperty('type');
            expect(['file', 'directory']).toContain(file.type);
        });
    });

    it('should list files recursively by default', async () => {
        const result = await listFiles({
            root_path: testDir,
            pattern: '*.txt'
        });

        // Should find nested.txt in subdir
        const nestedFile = result.find(f => f.name === 'nested.txt');
        expect(nestedFile).toBeDefined();
    });

    it('should throw error for invalid directory', async () => {
        await expect(
            listFiles({ root_path: path.join(testDir, 'nonexistent') })
        ).rejects.toThrow('is not a valid directory');
    });

    it('should throw error for paths outside allowed directories', async () => {
        // Set a very specific allowed directory (the subdir only)
        process.env.ALLOWED_DIRECTORIES = path.join(testDir, 'subdir');

        // Now the parent (testDir) should be outside allowed
        await expect(
            listFiles({ root_path: testDir })
        ).rejects.toThrow('Access denied');
    });
});
