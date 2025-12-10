/**
 * Tests for file execution (Python and JavaScript)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { runPythonFile } from '../tools/run-python-file.js';
import { runJsFile } from '../tools/run-js-file.js';

// Helpers to check if executables are available
async function isPythonAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const python = spawn('python3', ['--version']);
        python.on('error', () => resolve(false));
        python.on('close', (code) => resolve(code === 0));
    });
}

async function isNodeAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const node = spawn('node', ['--version']);
        node.on('error', () => resolve(false));
        node.on('close', (code) => resolve(code === 0));
    });
}

describe('File Execution', () => {
    const originalEnv = process.env;
    const testDir = path.join(process.cwd(), 'test-scripts');
    const pythonScript = path.join(testDir, 'test.py');
    const jsScript = path.join(testDir, 'test.js');
    let pythonAvailable = false;
    let nodeAvailable = false;

    beforeAll(async () => {
        process.env.ENABLE_CODE_EXECUTION = 'true';
        process.env.PROJECT_PATH = process.cwd();
        process.env.ALLOWED_DIRECTORIES = process.cwd();

        // Check availability
        pythonAvailable = await isPythonAvailable();
        nodeAvailable = await isNodeAvailable();

        if (!pythonAvailable) console.warn('[SKIP] Python3 not available - Python file tests will be skipped');
        if (!nodeAvailable) console.warn('[SKIP] Node.js not available - JS file tests will be skipped');

        // Create test directory and scripts
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        fs.writeFileSync(pythonScript, `
import sys
print(f"Arguments: {sys.argv[1:]}")
print("Python script executed!")
        `);

        fs.writeFileSync(jsScript, `
console.log('Arguments:', process.argv.slice(2));
console.log('JavaScript script executed!');
        `);
    });

    afterAll(() => {
        process.env = originalEnv;

        // Cleanup
        try {
            if (fs.existsSync(pythonScript)) fs.unlinkSync(pythonScript);
            if (fs.existsSync(jsScript)) fs.unlinkSync(jsScript);
            if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
        } catch {
            // Ignore cleanup errors
        }
    });

    it('should execute Python file', async () => {
        if (!pythonAvailable) {
            console.log('[SKIP] Python not available');
            return;
        }

        const result = await runPythonFile({
            path: pythonScript
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Python script executed!');
    });

    it('should execute Python file with arguments', async () => {
        if (!pythonAvailable) {
            console.log('[SKIP] Python not available');
            return;
        }

        const result = await runPythonFile({
            path: pythonScript,
            args: ['arg1', 'arg2', 'arg3']
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain("['arg1', 'arg2', 'arg3']");
    });

    it('should execute JavaScript file', async () => {
        if (!nodeAvailable) {
            console.log('[SKIP] Node.js not available');
            return;
        }

        const result = await runJsFile({
            path: jsScript
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('JavaScript script executed!');
    });

    it('should execute JavaScript file with arguments', async () => {
        if (!nodeAvailable) {
            console.log('[SKIP] Node.js not available');
            return;
        }

        const result = await runJsFile({
            path: jsScript,
            args: ['arg1', 'arg2']
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('arg1');
        expect(result.stdout).toContain('arg2');
    });

    it('should reject non-existent file', async () => {
        const result = await runPythonFile({
            path: '/nonexistent/script.py'
        });

        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('PathNotAllowed');
        expect(result.error?.message).toContain('not found');
    });

    it('should reject file outside allowed directories', async () => {
        const originalAllowed = process.env.ALLOWED_DIRECTORIES;
        process.env.ALLOWED_DIRECTORIES = '/tmp';

        const result = await runPythonFile({
            path: pythonScript
        });

        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('PathNotAllowed');
        expect(result.error?.message).toContain('outside allowed directories');

        process.env.ALLOWED_DIRECTORIES = originalAllowed;
    });

    it('should fail when execution is disabled', async () => {
        const originalEnabled = process.env.ENABLE_CODE_EXECUTION;
        process.env.ENABLE_CODE_EXECUTION = 'false';

        const result = await runPythonFile({
            path: pythonScript
        });

        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('ConfigDisabled');

        process.env.ENABLE_CODE_EXECUTION = originalEnabled;
    });
});
