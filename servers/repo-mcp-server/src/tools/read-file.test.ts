/**
 * Unit tests for read-file tool
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readFile } from './read-file.js';

describe('readFile', () => {
    let testDir: string;
    let testFile: string;
    const testContent = 'Hello, World!\nLine 2\nLine 3';

    beforeAll(() => {
        // Create a temporary test directory
        testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-read-'));

        // Set allowed directories for testing
        process.env.ALLOWED_DIRECTORIES = testDir;

        // Create test file
        testFile = path.join(testDir, 'test.txt');
        fs.writeFileSync(testFile, testContent);

        // Create a large file (>10MB) for size limit testing
        const largeFile = path.join(testDir, 'large.txt');
        fs.writeFileSync(largeFile, Buffer.alloc(11 * 1024 * 1024)); // 11MB
    });

    afterAll(() => {
        // Cleanup test directory
        fs.rmSync(testDir, { recursive: true, force: true });
        delete process.env.ALLOWED_DIRECTORIES;
    });

    it('should read file content', async () => {
        const result = await readFile({ path: testFile });

        expect(result.content).toBe(testContent);
    });

    it('should return file metadata', async () => {
        const result = await readFile({ path: testFile });

        expect(result).toHaveProperty('path');
        expect(result).toHaveProperty('size');
        expect(result).toHaveProperty('encoding');
        expect(result.encoding).toBe('utf-8');
    });

    it('should respect encoding parameter', async () => {
        const result = await readFile({
            path: testFile,
            encoding: 'base64'
        });

        expect(result.encoding).toBe('base64');
        // base64 content should be different from utf8
        expect(result.content).not.toBe(testContent);
    });

    it('should throw error for non-existent file', async () => {
        await expect(
            readFile({ path: path.join(testDir, 'nonexistent.txt') })
        ).rejects.toThrow('File not found');
    });

    it('should throw error for directory path', async () => {
        // Create a subdirectory to test
        const subDir = path.join(testDir, 'subdir');
        fs.mkdirSync(subDir, { recursive: true });
        await expect(
            readFile({ path: subDir })
        ).rejects.toThrow('Path is not a file');
    });

    it('should throw error for files too large', async () => {
        await expect(
            readFile({ path: path.join(testDir, 'large.txt') })
        ).rejects.toThrow('File too large');
    });

    it('should throw error for paths outside allowed directories', async () => {
        // Use parent of temp directory which should be outside allowed
        const outsidePath = path.resolve(testDir, '..', '..', 'not-allowed.txt');
        await expect(
            readFile({ path: outsidePath })
        ).rejects.toThrow();
    });
});
