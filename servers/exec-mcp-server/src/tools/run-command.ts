/**
 * Execute shell command
 */

import type { ExecResult } from '../types.js';
import { getExecConfig } from '../config.js';
import { executeProcess } from '../utils/process-executor.js';
import { validateWorkingDirectory } from '../utils/safety.js';

export interface CommandRequest {
    command: string;
    args?: string[];
    timeoutSeconds?: number;
    workingDirectory?: string;
}

/**
 * Run a shell command with arguments
 */
export async function runCommand(request: CommandRequest): Promise<ExecResult> {
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

    // Validate command is provided
    if (!request.command || request.command.trim().length === 0) {
        return {
            success: false,
            stdout: '',
            stderr: '',
            exitCode: -1,
            durationMs: 0,
            timedOut: false,
            error: {
                type: 'ExecutionFailed',
                message: 'No command provided'
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

    // Prepare arguments
    const args = Array.isArray(request.args) ? request.args : [];

    // Calculate timeout
    const timeoutSeconds = Math.min(
        request.timeoutSeconds || config.defaultTimeoutSeconds,
        config.maxTimeoutSeconds
    );

    try {
        // Execute command
        const result = await executeProcess({
            executable: request.command,
            args: args,
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
                message: `Failed to execute command: ${error.message}`
            }
        };
    }
}
