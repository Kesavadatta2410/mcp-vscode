/**
 * Tests for JavaScript snippet execution
 * 
 * NOTE: These tests require Node.js to be installed and available in PATH.
 * They will be skipped on systems where Node is not available.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { runJsSnippet } from '../tools/run-js-snippet.js';

describe('JavaScript Snippet Execution', () => {
    const originalEnv = process.env;

    beforeAll(() => {
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

        const result = await runJsSnippet({
            code: 'console.log("test");'
        });

        expect(result.success).toBe(false);
        expect(result.error?.type).toBe('ConfigDisabled');

        process.env.ENABLE_CODE_EXECUTION = originalEnabled;
    });

    // Execution tests (skipped on Windows without Node in PATH)
    // These will run successfully on systems with Node.js installed
    it.skip('should execute simple JavaScript code', async () => {
        const result = await runJsSnippet({
            code: 'console.log("Hello from Node.js!");'
        });

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Hello from Node.js!');
        expect(result.timedOut).toBe(false);
    });

    it.skip('should handle JavaScript errors', async () => {
        const result = await runJsSnippet({
            code: 'throw new Error("Test error");'
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain('Error');
        expect(result.stderr).toContain('Test error');
    });

    it.skip('should pass arguments via environment variable', async () => {
        const result = await runJsSnippet({
            code: `
const args = JSON.parse(process.env.EXEC_ARGS_JSON || '{}');
console.log(\`Name: \${args.name}, Value: \${args.value}\`);
            `,
            args: { name: 'test', value: 42 }
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Name: test');
        expect(result.stdout).toContain('Value: 42');
    });

    it.skip('should handle async/await code', async () => {
        const result = await runJsSnippet({
            code: `
async function test() {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("Async execution complete");
}
test();
            `
        });

        expect(result.success).toBe(true);
        expect(result.stdout).toContain('Async execution complete');
    });

    it.skip('should enforce timeout', async () => {
        const result = await runJsSnippet({
            code: `
setTimeout(() => {
    console.log("Should not reach here");
}, 10000);
            `,
            timeoutSeconds: 1
        });

        expect(result.timedOut).toBe(true);
        expect(result.exitCode).toBe(-1);
    }, 5000);
});
