/**
 * list_files tool - List files in a directory matching a pattern
 */

import * as path from 'path';
import { glob } from 'glob';
import { validateAndResolvePath, getStats } from '../utils/safety.js';
import type { FileInfo } from '../types.js';

export interface ListFilesParams {
    root_path: string;
    pattern?: string;
    recursive?: boolean;
}

/**
 * List files in a directory, optionally matching a glob pattern
 * 
 * @param params - Parameters for listing files
 * @returns Array of file information objects
 */
export async function listFiles(params: ListFilesParams): Promise<FileInfo[]> {
    const { root_path, pattern = '*', recursive = true } = params;

    // Validate the root path is allowed
    const resolvedRoot = validateAndResolvePath(root_path);

    // Check if directory exists
    const stats = getStats(resolvedRoot);
    if (!stats || !stats.isDirectory()) {
        throw new Error(`Path "${root_path}" is not a valid directory`);
    }

    // Build the glob pattern
    const globPattern = recursive
        ? path.join(resolvedRoot, '**', pattern)
        : path.join(resolvedRoot, pattern);

    // Find matching files
    const matches = await glob(globPattern, {
        nodir: false,
        dot: false, // Exclude hidden files by default
        absolute: true
    });

    // Get file info for each match
    const files: FileInfo[] = [];

    for (const match of matches) {
        const matchStats = getStats(match);
        if (matchStats) {
            files.push({
                path: match,
                name: path.basename(match),
                type: matchStats.isDirectory() ? 'directory' : 'file',
                size: matchStats.isFile() ? matchStats.size : undefined,
                modified: matchStats.mtime.toISOString()
            });
        }
    }

    return files;
}
