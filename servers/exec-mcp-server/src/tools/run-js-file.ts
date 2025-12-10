/**
 * Execute JavaScript file
 */

import type { ExecRequest, ExecResult } from '../types.js';
import { getExecConfig } from '../config.js';
import { executeProcess } from '../utils/process-executor.js';
import { validateExecutionPath, validateWorkingDirectory } from '../utils/safety.js';

/**
 * Run JavaScript script file with command-line arguments
 */
export async function runJsFile(request: ExecRequest): Promise<ExecResult> {
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

    // Validate path is provided
    if (!request.path || request.path.trim().length === 0) {
        return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: -1,
            durationMs: 0,
            timedOut: false,
            error: {
                type: 'ExecutionFailed',
                message: 'No file path provided'
            }
        };
    }

    // Validate file path
    const pathValidation = validateExecutionPath(request.path);
    if (!pathValidation.valid) {
        return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: -1,
            durationMs: 0,
            timedOut: false,
            error: pathValidation.error
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

    // Prepare arguments
    const args = Array.isArray(request.args) ? request.args : [];

    // Calculate timeout
    const timeoutSeconds = Math.min(
        request.timeoutSeconds || config.defaultTimeoutSeconds,
        config.maxTimeoutSeconds
    );

    try {
        // Execute JavaScript file
        const result = await executeProcess({
            executable: config.nodeExecutable,
            args: [pathValidation.resolvedPath!, ...args],
            cwd: dirValidation.resolvedPath!,
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
                message: `Failed to execute JavaScript file: ${error.message}`
            }
        };
    }
}
