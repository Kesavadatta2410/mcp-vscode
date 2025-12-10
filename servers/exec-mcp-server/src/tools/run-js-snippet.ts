/**
 * Execute JavaScript code snippet
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ExecRequest, ExecResult } from '../types.js';
import { getExecConfig } from '../config.js';
import { executeProcess } from '../utils/process-executor.js';
import { validateWorkingDirectory } from '../utils/safety.js';

/**
 * Run JavaScript code snippet with optional arguments
 */
export async function runJsSnippet(request: ExecRequest): Promise<ExecResult> {
    const config = getExecConfig();

    // Check if code execution is enabled
    if (!config.enabled) {
        return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: -1,
            durationMs: 0,
            timedOut: false,
            error: {
                type: 'ConfigDisabled',
                message: 'Code execution is disabled. Set ENABLE_CODE_EXECUTION=true to enable.'
            }
        };
    }

    // Validate code is provided
    if (!request.code || request.code.trim().length === 0) {
        return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: -1,
            durationMs: 0,
            timedOut: false,
            error: {
                type: 'ExecutionFailed',
                message: 'No code provided'
            }
        };
    }

    // Validate working directory
    const workingDir = request.workingDirectory || config.defaultWorkingDirectory;
    const dirValidation = validateWorkingDirectory(workingDir);
    if (!dirValidation.valid) {
        return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: -1,
            durationMs: 0,
            timedOut: false,
            error: dirValidation.error
        };
    }

    // Create temporary JavaScript file
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `mcp_exec_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);

    try {
        // Write code to temporary file
        fs.writeFileSync(tempFile, request.code, 'utf-8');

        // Prepare environment variables
        const env: Record<string, string> = {};
        if (request.args && typeof request.args === 'object' && !Array.isArray(request.args)) {
            env.EXEC_ARGS_JSON = JSON.stringify(request.args);
        }

        // Calculate timeout
        const timeoutSeconds = Math.min(
            request.timeoutSeconds || config.defaultTimeoutSeconds,
            config.maxTimeoutSeconds
        );

        // Execute Node.js
        const result = await executeProcess({
            executable: config.nodeExecutable,
            args: [tempFile],
            cwd: dirValidation.resolvedPath!,
            env,
            timeoutMs: timeoutSeconds * 1000,
            maxOutputBytes: config.maxOutputBytes
        });

        return {
            success: result.exitCode === 0,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            durationMs: result.durationMs,
            timedOut: result.timedOut,
            truncated: result.truncated
        };

    } catch (error: any) {
        return {
            success: false,
            stdout: '',
            stderr: error.message || 'Unknown error',
            exitCode: -1,
            durationMs: 0,
            timedOut: false,
            error: {
                type: 'ExecutionFailed',
                message: `Failed to execute JavaScript: ${error.message}`
            }
        };
    } finally {
        // Clean up temporary file
        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        } catch {
            // Ignore cleanup errors
        }
    }
}
