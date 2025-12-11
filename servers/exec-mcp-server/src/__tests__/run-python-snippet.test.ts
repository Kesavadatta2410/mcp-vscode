/**
 * Tests for Python snippet execution
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

    it('should execute simple Python code', async () => {
        const result = await runPythonSnippet({
            code: 'print("Hello from Python!")'
        });

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Hello from Python!');
        expect(result.timedOut).toBe(false);
    });

    it('should handle Python errors', async () => {
        const result = await runPythonSnippet({
            code: 'raise ValueError("Test error")'
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain('ValueError');
        expect(result.stderr).toContain('Test error');
    });

    it('should pass arguments via environment variable', async () => {
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

    it('should enforce timeout', async () => {
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
});
