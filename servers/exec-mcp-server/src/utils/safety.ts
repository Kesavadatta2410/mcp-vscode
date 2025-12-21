/**
 * Path validation and security utilities
 */

import * as path from 'path';
import * as fs from 'fs';
import type { ExecError } from '../types.js';
import { getExecConfig } from '../config.js';

/**
 * Normalize a path for comparison
 */
function normalizePath(inputPath: string): string {
    try {
        return fs.realpathSync(inputPath);
    } catch {
        return path.resolve(inputPath);
    }
}

/**
 * Check if a path is within allowed directories
 */
export function isPathAllowed(filePath: string): boolean {
    const config = getExecConfig();
    const normalized = normalizePath(filePath).toLowerCase();

    // If no allowed directories configured, deny all
    if (config.allowedDirectories.length === 0) {
        return false;
    }

    // Check if path is within any allowed directory
    return config.allowedDirectories.some(allowedDir => {
        const normalizedDir = normalizePath(allowedDir).toLowerCase();

        // Path is exactly the allowed directory
        if (normalized === normalizedDir) {
            return true;
        }

        const relativePath = path.relative(normalizedDir, normalized);

        // Path is allowed if it doesn't start with '..' (meaning it's not outside the directory)
        // and is not an absolute path (which would mean it's on a different drive on Windows)
        return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    });
}

/**
 * Validate a file path for execution
 */
export function validateExecutionPath(filePath: string): { valid: boolean; error?: ExecError; resolvedPath?: string } {
    // Resolve to absolute path
    const resolvedPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(getExecConfig().defaultWorkingDirectory, filePath);

    // Check if path exists
    if (!fs.existsSync(resolvedPath)) {
        return {
            valid: false,
            error: {
                type: 'PathNotAllowed',
                message: `File not found: ${filePath}`,
                path: filePath
            }
        };
    }

    // Check if it's a file (not a directory)
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
        return {
            valid: false,
            error: {
                type: 'PathNotAllowed',
                message: `Path is not a file: ${filePath}`,
                path: filePath
            }
        };
    }

    // Check if within allowed directories
    if (!isPathAllowed(resolvedPath)) {
        return {
            valid: false,
            error: {
                type: 'PathNotAllowed',
                message: `Path is outside allowed directories: ${filePath}`,
                path: filePath
            }
        };
    }

    return {
        valid: true,
        resolvedPath
    };
}

/**
 * Validate working directory
 */
export function validateWorkingDirectory(workingDir: string): { valid: boolean; error?: ExecError; resolvedPath?: string } {
    const resolvedPath = normalizePath(workingDir);

    // Check if exists
    if (!fs.existsSync(resolvedPath)) {
        return {
            valid: false,
            error: {
                type: 'PathNotAllowed',
                message: `Working directory does not exist: ${workingDir}`,
                path: workingDir
            }
        };
    }

    // Check if it's a directory
    const stats = fs.statSync(resolvedPath);
    if (!stats.isDirectory()) {
        return {
            valid: false,
            error: {
                type: 'PathNotAllowed',
                message: `Working directory is not a directory: ${workingDir}`,
                path: workingDir
            }
        };
    }

    // Check if within allowed directories
    if (!isPathAllowed(resolvedPath)) {
        return {
            valid: false,
            error: {
                type: 'PathNotAllowed',
                message: `Working directory is outside allowed directories: ${workingDir}`,
                path: workingDir
            }
        };
    }

    return {
        valid: true,
        resolvedPath
    };
}
