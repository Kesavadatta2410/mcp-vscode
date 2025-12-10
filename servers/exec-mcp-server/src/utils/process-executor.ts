/**
 * Core process execution with timeout and output capture
 */

import { spawn } from 'child_process';
import type { ProcessOptions, ProcessResult } from '../types.js';
import { OutputCapture } from './output-handler.js';

/**
 * Execute a process with timeout and output limits
 */
export async function executeProcess(options: ProcessOptions): Promise<ProcessResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
        const outputCapture = new OutputCapture(options.maxOutputBytes);
        let timedOut = false;
        let processExited = false;

        // Spawn the process
        const child = spawn(options.executable, options.args, {
            cwd: options.cwd,
            env: { ...process.env, ...options.env },
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Timeout handler
        const timeout = setTimeout(() => {
            if (!processExited) {
                timedOut = true;
                // Kill process tree (SIGTERM first, SIGKILL as fallback)
                try {
                    child.kill('SIGTERM');
                    setTimeout(() => {
                        if (!processExited) {
                            child.kill('SIGKILL');
                        }
                    }, 1000);
                } catch (err) {
                    // Process might already be dead
                }
            }
        }, options.timeoutMs);

        // Capture stdout
        if (child.stdout) {
            child.stdout.on('data', (chunk: Buffer) => {
                outputCapture.captureStdout(chunk);
            });
        }

        // Capture stderr
        if (child.stderr) {
            child.stderr.on('data', (chunk: Buffer) => {
                outputCapture.captureStderr(chunk);
            });
        }

        // Send input to stdin if provided
        if (options.input && child.stdin) {
            try {
                child.stdin.write(options.input);
                child.stdin.end();
            } catch (err) {
                // Ignore stdin errors
            }
        }

        // Handle process completion
        child.on('close', (code, signal) => {
            processExited = true;
            clearTimeout(timeout);

            const durationMs = Date.now() - startTime;
            const output = outputCapture.getResult();

            resolve({
                stdout: output.stdout,
                stderr: output.stderr,
                exitCode: timedOut ? -1 : (code ?? -1),
                durationMs,
                timedOut,
                truncated: output.truncated
            });
        });

        // Handle spawn errors (e.g., executable not found)
        child.on('error', (err) => {
            processExited = true;
            clearTimeout(timeout);

            const durationMs = Date.now() - startTime;
            const output = outputCapture.getResult();

            resolve({
                stdout: output.stdout,
                stderr: output.stderr + `\n\nProcess error: ${err.message}`,
                exitCode: -1,
                durationMs,
                timedOut: false,
                truncated: output.truncated
            });
        });
    });
}

/**
 * Check if an executable exists
 */
export async function checkExecutable(executable: string): Promise<boolean> {
    try {
        const result = await executeProcess({
            executable,
            args: ['--version'],
            cwd: process.cwd(),
            timeoutMs: 5000,
            maxOutputBytes: 1024
        });
        return result.exitCode === 0 || result.stdout.length > 0;
    } catch {
        return false;
    }
}
