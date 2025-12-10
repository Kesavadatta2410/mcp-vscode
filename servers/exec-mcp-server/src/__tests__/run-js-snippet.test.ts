/**
 * Tests for JavaScript snippet execution
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { runJsSnippet } from '../tools/run-js-snippet.js';

// Helper to check if Node is available
async function isNodeAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const node = spawn('node', ['--version']);
        node.on('error', () => resolve(false));
        node.on('close', (code) => resolve(code === 0));
    });
}

describe('JavaScript Snippet Execution', () => {
    const originalEnv = process.env;
    let nodeAvailable = false;

    beforeAll(async () => {
        process.env.ENABLE_CODE_EXECUTION = 'true';
        process.env.PROJECT_PATH = process.cwd();
        process.env.ALLOWED_DIRECTORIES = process.cwd();

        // Check if Node is available
        nodeAvailable = await isNodeAvailable();
        if (!nodeAvailable) {
            console.warn('[SKIP] Node.js not available - execution tests will be skipped');
        }
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should execute simple JavaScript code', async () => {
        if (!nodeAvailable) {
            console.log('[SKIP] Node.js not available');
            return;
        }

        const result = await runJsSnippet({
            code: 'console.log("Hello from Node.js!");'
        });

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Hello from Node.js!');
        expect(result.timedOut).toBe(false);
    });

    it('should handle JavaScript errors', async () => {
        if (!nodeAvailable) {
            console.log('[SKIP] Node.js not available');
            return;
        }

        const result = await runJsSnippet({
            code: 'throw new Error("Test error");'
        });

        expect(result.success).toBe(false);
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain('Error');
        expect(result.stderr).toContain('Test error');
    });

    it('should pass arguments via environment variable', async () => {
        if (!nodeAvailable) {
            console.log('[SKIP] Node.js not available');
            return;
        }

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

    it('should handle async/await code', async () => {
        if (!nodeAvailable) {
            console.log('[SKIP] Node.js not available');
            return;
        }

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

    it('should enforce timeout', async () => {
        if (!nodeAvailable) {
            console.log('[SKIP] Node.js not available');
            return;
        }

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
});
