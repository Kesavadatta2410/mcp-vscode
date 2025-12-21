/**
 * create_folder tool - Create a new directory
 */

import * as fs from 'fs';
import { validateAndResolvePath } from '../utils/safety.js';
import type { FileOperationResult } from '../types.js';

export interface CreateFolderParams {
    path: string;
    recursive?: boolean;
}

/**
 * Create a new directory
 * Creates parent directories if they don't exist (by default)
 * 
 * @param params - Parameters containing path
 * @returns Operation result
 */
export async function createFolder(params: CreateFolderParams): Promise<FileOperationResult> {
    const {
        path: folderPath,
        recursive = true
    } = params;

    // Validate the path is allowed
    const resolvedPath = validateAndResolvePath(folderPath);

    try {
        // Check if already exists
        if (fs.existsSync(resolvedPath)) {
            const stats = fs.statSync(resolvedPath);
            if (stats.isDirectory()) {
                return {
                    success: true,
                    message: `Directory already exists: ${resolvedPath}`,
                    path: resolvedPath
                };
            } else {
                return {
                    success: false,
                    message: `Path exists but is not a directory: ${resolvedPath}`,
                    path: resolvedPath
                };
            }
        }

        // Create the directory
        fs.mkdirSync(resolvedPath, { recursive });

        return {
            success: true,
            message: `Directory created successfully: ${resolvedPath}`,
            path: resolvedPath
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to create directory: ${error instanceof Error ? error.message : String(error)}`,
            path: resolvedPath
        };
    }
}
