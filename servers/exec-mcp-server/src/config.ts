/**
 * Configuration management for code execution
 */

import type { ExecConfig } from './types.js';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Get allowed directories from environment
 */
function getAllowedDirectories(): string[] {
    const allowed = process.env.ALLOWED_DIRECTORIES || '';
    if (!allowed) {
        // Default to PROJECT_PATH if set
        const projectPath = process.env.PROJECT_PATH;
        return projectPath ? [projectPath] : [];
    }

    return allowed.split(',')
        .map(dir => dir.trim())
        .filter(dir => dir.length > 0)
        .map(dir => {
            try {
                return fs.realpathSync(dir);
            } catch {
                return path.resolve(dir);
            }
        });
}

/**
 * Get default working directory
 */
function getDefaultWorkingDirectory(): string {
    const projectPath = process.env.PROJECT_PATH;
    const gitRepoPath = process.env.GIT_REPO_PATH;

    // Prefer PROJECT_PATH, fallback to GIT_REPO_PATH, then current directory
    const defaultDir = projectPath || gitRepoPath || process.cwd();

    try {
        return fs.realpathSync(defaultDir);
    } catch {
        return path.resolve(defaultDir);
    }
}

/**
 * Load execution configuration from environment variables
 */
export function getExecConfig(): ExecConfig {
    const enabled = process.env.ENABLE_CODE_EXECUTION === 'true';
    const pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
    const nodeExecutable = process.env.NODE_EXECUTABLE || 'node';
    const defaultTimeoutSeconds = parseInt(process.env.EXEC_DEFAULT_TIMEOUT_SECONDS || '30', 10);
    const maxTimeoutSeconds = parseInt(process.env.EXEC_MAX_TIMEOUT_SECONDS || '300', 10);
    const maxOutputBytes = parseInt(process.env.EXEC_MAX_OUTPUT_BYTES || '65536', 10);

    return {
        enabled,
        pythonExecutable,
        nodeExecutable,
        defaultTimeoutSeconds: Math.max(1, Math.min(defaultTimeoutSeconds, maxTimeoutSeconds)),
        maxTimeoutSeconds,
        maxOutputBytes: Math.max(1024, maxOutputBytes), // Minimum 1 KB
        allowedDirectories: getAllowedDirectories(),
        defaultWorkingDirectory: getDefaultWorkingDirectory()
    };
}

/**
 * Validate execution configuration
 */
export function validateConfig(config: ExecConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.enabled) {
        errors.push('Code execution is disabled (ENABLE_CODE_EXECUTION=false)');
    }

    if (config.allowedDirectories.length === 0) {
        errors.push('No allowed directories configured (set ALLOWED_DIRECTORIES or PROJECT_PATH)');
    }

    if (config.defaultTimeoutSeconds < 1) {
        errors.push('Default timeout must be at least 1 second');
    }

    if (config.maxOutputBytes < 1024) {
        errors.push('Max output bytes must be at least 1024');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
