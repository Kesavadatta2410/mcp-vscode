/**
 * delete_file tool - Delete a file or directory
 */

import * as fs from 'fs';
import { validateAndResolvePath } from '../utils/safety.js';
import type { FileOperationResult } from '../types.js';

export interface DeleteFileParams {
    path: string;
    recursive?: boolean;
}

/**
 * Delete a file or directory
 * For directories, recursive option deletes contents too
 * 
 * @param params - Parameters containing path
 * @returns Operation result
 */
export async function deleteFile(params: DeleteFileParams): Promise<FileOperationResult> {
    const {
        path: targetPath,
        recursive = true
    } = params;

    // Validate the path is allowed
    const resolvedPath = validateAndResolvePath(targetPath);

    try {
        // Check if exists
        if (!fs.existsSync(resolvedPath)) {
            return {
                success: false,
                message: `Path does not exist: ${resolvedPath}`,
                path: resolvedPath
            };
        }

        const stats = fs.statSync(resolvedPath);

        if (stats.isDirectory()) {
            // Delete directory
            fs.rmSync(resolvedPath, { recursive, force: true });
        } else {
            // Delete file
            fs.unlinkSync(resolvedPath);
        }

        return {
            success: true,
            message: `Successfully deleted: ${resolvedPath}`,
            path: resolvedPath
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to delete: ${error instanceof Error ? error.message : String(error)}`,
            path: resolvedPath
        };
    }
}
