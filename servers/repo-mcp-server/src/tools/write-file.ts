/**
 * write_file tool - Write content to a file
 */

import * as fs from 'fs';
import { validateAndResolvePath, ensureParentDir } from '../utils/safety.js';
import type { FileOperationResult } from '../types.js';

export interface WriteFileParams {
    path: string;
    content: string;
    encoding?: BufferEncoding;
    create_directories?: boolean;
}

/**
 * Write content to a file
 * Creates the file if it doesn't exist
 * 
 * @param params - Parameters containing path and content
 * @returns Operation result
 */
export async function writeFile(params: WriteFileParams): Promise<FileOperationResult> {
    const {
        path: filePath,
        content,
        encoding = 'utf-8',
        create_directories = true
    } = params;

    // Validate the path is allowed
    const resolvedPath = validateAndResolvePath(filePath);

    try {
        // Ensure parent directory exists if requested
        if (create_directories) {
            ensureParentDir(resolvedPath);
        }

        // Write the file
        fs.writeFileSync(resolvedPath, content, encoding);

        return {
            success: true,
            message: `File written successfully: ${resolvedPath}`,
            path: resolvedPath
        };
    } catch (error) {
        return {
            success: false,
            message: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
            path: resolvedPath
        };
    }
}
