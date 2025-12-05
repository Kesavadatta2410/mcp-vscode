/**
 * read_file tool - Read the contents of a file
 */

import * as fs from 'fs';
import { validateAndResolvePath, getStats } from '../utils/safety.js';

export interface ReadFileParams {
    path: string;
    encoding?: BufferEncoding;
}

export interface ReadFileResult {
    content: string;
    path: string;
    size: number;
    encoding: BufferEncoding;
}

/**
 * Read the contents of a file
 * 
 * @param params - Parameters containing the file path
 * @returns File content and metadata
 */
export async function readFile(params: ReadFileParams): Promise<ReadFileResult> {
    const { path: filePath, encoding = 'utf-8' } = params;

    // Validate the path is allowed
    const resolvedPath = validateAndResolvePath(filePath);

    // Check if file exists and is a file
    const stats = getStats(resolvedPath);
    if (!stats) {
        throw new Error(`File not found: "${filePath}"`);
    }
    if (!stats.isFile()) {
        throw new Error(`Path is not a file: "${filePath}"`);
    }

    // Check file size (limit to 10MB to prevent memory issues)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (stats.size > maxSize) {
        throw new Error(`File too large (${stats.size} bytes). Maximum allowed: ${maxSize} bytes`);
    }

    // Read the file
    const content = fs.readFileSync(resolvedPath, encoding);

    return {
        content,
        path: resolvedPath,
        size: stats.size,
        encoding
    };
}
