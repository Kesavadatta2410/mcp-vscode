/**
 * Tests for file execution (Python and JavaScript)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runPythonFile } from '../tools/run-python-file.js';
import { runJsFile } from '../tools/run-js-file.js';

describe('File Execution', () => {
    const originalEnv = process.env;
    const testDir = path.join(process.cwd(), 'test-scripts');
    const pythonScript = path.join(testDir, 'test.py');
    const jsScript = path.join(testDir, 'test.js');

    beforeAll(() => {
        process.env.ENABLE_CODE_EXECUTION = 'true';
        process.env.PROJECT_PATH = process.cwd();
        process.env.ALLOWED_DIRECTORIES = process.cwd();

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
        const result = await runPythonFile({
            path: pythonScript
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Python script executed!');
    });

    it('should execute Python file with arguments', async () => {
        const result = await runPythonFile({
            path: pythonScript,
            args: ['arg1', 'arg2', 'arg3']
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain("['arg1', 'arg2', 'arg3']");
    });

    it('should execute JavaScript file', async () => {
        const result = await runJsFile({
            path: jsScript
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('JavaScript script executed!');
    });

    it('should execute JavaScript file with arguments', async () => {
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
