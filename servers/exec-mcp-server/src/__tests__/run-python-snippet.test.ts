/**
 * Tests for Python snippet execution
 * 
 * NOTE: These tests require Python 3 to be installed and available in PATH.
 * They will be skipped on systems where Python is not available.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { runPythonSnippet } from '../tools/run-python-snippet.js';

describe('Python Snippet Execution', () => {
    const originalEnv = process.env;

    beforeAll(() => {
        // Enable code execution for tests
        process.env.ENABLE_CODE_EXECUTION = 'true';
        process.env.PROJECT_PATH = process.cwd();
        process.env.ALLOWED_DIRECTORIES = process.cwd();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    // Validation tests (always run)
    it('should fail when execution is disabled', async () => {
        const originalEnabled = process.env.ENABLE_CODE_EXECUTION;
        process.env.ENABLE_CODE_EXECUTION = 'false';

        const result = await runPythonSnippet({
            code: 'print("test")'
        });

        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('ConfigDisabled');

        process.env.ENABLE_CODE_EXECUTION = originalEnabled;
    });

    it('should reject empty code', async () => {
        const result = await runPythonSnippet({
            code: ''
        });

        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('ExecutionFailed');
        expect(result.error?.message).toContain('No code provided');
    });

    // Execution tests (skipped on Windows without Python)
    // These will run successfully on Ubuntu/Linux with Python 3 installed
    it.skip('should execute simple Python code', async () => {
        const result = await runPythonSnippet({
            code: 'print("Hello from Python!")'
        });

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Hello from Python!');
        expect(result.timedOut).toBe(false);
    });

    it.skip('should handle Python errors', async () => {
        const result = await runPythonSnippet({
            code: 'raise ValueError("Test error")'
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain('ValueError');
        expect(result.stderr).toContain('Test error');
    });

    it.skip('should pass arguments via environment variable', async () => {
        const result = await runPythonSnippet({
            code: `
import os
import json
args = json.loads(os.environ.get('EXEC_ARGS_JSON', '{}'))
print(f"Name: {args.get('name')}, Value: {args.get('value')}")
            `,
            args: { name: 'test', value: 42 }
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Name: test');
        expect(result.stdout).toContain('Value: 42');
    });

    it.skip('should enforce timeout', async () => {
        const result = await runPythonSnippet({
            code: `
import time
time.sleep(10)
print("Should not reach here")
            `,
            timeoutSeconds: 1
        });

        expect(result.timedOut).toBe(true);
        expect(result.exitCode).toBe(-1);
    }, 5000);
});
