/**
 * Unit tests for safety utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
    getAllowedDirectories,
    isPathAllowed,
    validateAndResolvePath,
    pathExists,
    getStats,
    ensureParentDir,
    createLogger
} from './safety.js';

describe('Safety Utilities', () => {
    let testDir: string;
    let originalEnv: string | undefined;

    beforeEach(() => {
        // Save original environment
        originalEnv = process.env.ALLOWED_DIRECTORIES;

        // Create a temporary test directory
        testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-safety-test-'));
    });

    afterEach(() => {
        // Restore original environment
        if (originalEnv !== undefined) {
            process.env.ALLOWED_DIRECTORIES = originalEnv;
        } else {
            delete process.env.ALLOWED_DIRECTORIES;
        }

        // Cleanup test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('getAllowedDirectories', () => {
        it('should return empty array when env not set', () => {
            delete process.env.ALLOWED_DIRECTORIES;
            expect(getAllowedDirectories()).toEqual([]);
        });

        it('should parse comma-separated directories', () => {
            process.env.ALLOWED_DIRECTORIES = '/tmp,/home/user';
            const dirs = getAllowedDirectories();
            expect(dirs.length).toBe(2);
        });

        it('should trim whitespace', () => {
            process.env.ALLOWED_DIRECTORIES = '  /tmp  ,  /home  ';
            const dirs = getAllowedDirectories();
            expect(dirs).toContain(path.resolve('/tmp'));
            expect(dirs).toContain(path.resolve('/home'));
        });
    });

    describe('isPathAllowed', () => {
        it('should return false when no directories configured', () => {
            delete process.env.ALLOWED_DIRECTORIES;
            expect(isPathAllowed('/tmp/test')).toBe(false);
        });

        it('should return true for paths within allowed directories', () => {
            process.env.ALLOWED_DIRECTORIES = testDir;
            expect(isPathAllowed(path.join(testDir, 'file.txt'))).toBe(true);
        });

        it('should return false for paths outside allowed directories', () => {
            process.env.ALLOWED_DIRECTORIES = testDir;
            expect(isPathAllowed('/etc/passwd')).toBe(false);
        });

        it('should prevent path traversal attacks', () => {
            process.env.ALLOWED_DIRECTORIES = testDir;
            expect(isPathAllowed(path.join(testDir, '..', '..', 'etc', 'passwd'))).toBe(false);
        });
    });

    describe('validateAndResolvePath', () => {
        it('should return resolved path for allowed paths', () => {
            process.env.ALLOWED_DIRECTORIES = testDir;
            const result = validateAndResolvePath(path.join(testDir, 'file.txt'));
            expect(result).toBe(path.resolve(testDir, 'file.txt'));
        });

        it('should throw error for disallowed paths', () => {
            process.env.ALLOWED_DIRECTORIES = testDir;
            expect(() => validateAndResolvePath('/etc/passwd')).toThrow('Access denied');
        });
    });

    describe('pathExists', () => {
        it('should return true for existing paths', () => {
            expect(pathExists(testDir)).toBe(true);
        });

        it('should return false for non-existing paths', () => {
            expect(pathExists(path.join(testDir, 'nonexistent'))).toBe(false);
        });
    });

    describe('getStats', () => {
        it('should return stats for existing path', () => {
            const stats = getStats(testDir);
            expect(stats).not.toBeNull();
            expect(stats?.isDirectory()).toBe(true);
        });

        it('should return null for non-existing path', () => {
            const stats = getStats(path.join(testDir, 'nonexistent'));
            expect(stats).toBeNull();
        });
    });

    describe('ensureParentDir', () => {
        it('should create parent directories', () => {
            const nestedPath = path.join(testDir, 'a', 'b', 'c', 'file.txt');
            ensureParentDir(nestedPath);
            expect(fs.existsSync(path.dirname(nestedPath))).toBe(true);
        });
    });

    describe('createLogger', () => {
        it('should create a logger with all methods', () => {
            const logger = createLogger('test');
            expect(logger).toHaveProperty('info');
            expect(logger).toHaveProperty('warn');
            expect(logger).toHaveProperty('error');
            expect(logger).toHaveProperty('debug');
        });
    });
});
