/**
 * Utility functions for path safety and validation
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * Get the list of allowed directories from environment variable
 */
export function getAllowedDirectories(): string[] {
    const allowedDirs = process.env.ALLOWED_DIRECTORIES || '';
    return allowedDirs
        .split(',')
        .map(dir => dir.trim())
        .filter(dir => dir.length > 0)
        .map(dir => path.resolve(dir));
}

/**
 * Check if a path is within any of the allowed directories
 * Prevents path traversal attacks
 * 
 * @param targetPath - The path to validate
 * @returns true if the path is allowed, false otherwise
 */
export function isPathAllowed(targetPath: string): boolean {
    const allowedDirs = getAllowedDirectories();

    // If no allowed directories configured, deny all access
    if (allowedDirs.length === 0) {
        return false;
    }

    // Resolve to absolute path and normalize
    const resolvedPath = path.resolve(targetPath);

    // Check if the path starts with any allowed directory
    return allowedDirs.some(allowedDir => {
        const relative = path.relative(allowedDir, resolvedPath);
        // Path is within allowed dir if relative path doesn't start with '..'
        // and is not an absolute path
        return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
    });
}

/**
 * Validate a path and return the resolved absolute path
 * Throws an error if the path is not allowed
 * 
 * @param targetPath - The path to validate
 * @returns The resolved absolute path
 * @throws Error if path is not allowed
 */
export function validateAndResolvePath(targetPath: string): string {
    const resolvedPath = path.resolve(targetPath);

    if (!isPathAllowed(resolvedPath)) {
        throw new Error(
            `Access denied: Path "${targetPath}" is outside allowed directories. ` +
            `Allowed: ${getAllowedDirectories().join(', ') || 'none configured'}`
        );
    }

    return resolvedPath;
}

/**
 * Check if a path exists
 */
export function pathExists(targetPath: string): boolean {
    try {
        fs.accessSync(targetPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get file stats safely
 */
export function getStats(targetPath: string): fs.Stats | null {
    try {
        return fs.statSync(targetPath);
    } catch {
        return null;
    }
}

/**
 * Ensure parent directory exists
 */
export function ensureParentDir(filePath: string): void {
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }
}

/**
 * Create a simple logger
 */
export function createLogger(prefix: string) {
    return {
        info: (msg: string, ...args: unknown[]) =>
            console.error(`[${prefix}] INFO: ${msg}`, ...args),
        warn: (msg: string, ...args: unknown[]) =>
            console.error(`[${prefix}] WARN: ${msg}`, ...args),
        error: (msg: string, ...args: unknown[]) =>
            console.error(`[${prefix}] ERROR: ${msg}`, ...args),
        debug: (msg: string, ...args: unknown[]) => {
            if (process.env.DEBUG) {
                console.error(`[${prefix}] DEBUG: ${msg}`, ...args);
            }
        }
    };
}
