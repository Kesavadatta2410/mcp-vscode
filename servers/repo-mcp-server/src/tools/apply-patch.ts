/**
 * apply_patch tool - Apply a unified diff patch to a file
 */

import { validateAndResolvePath, pathExists, ensureParentDir } from '../utils/safety.js';
import { applyPatch as applyDiffPatch, isValidDiff } from '../utils/diff.js';
import type { PatchResult } from '../types.js';

export interface ApplyPatchParams {
    path: string;
    diff: string;
}

/**
 * Apply a unified diff patch to a file
 * 
 * @param params - Parameters containing file path and diff content
 * @returns Patch operation result
 */
export async function applyPatch(params: ApplyPatchParams): Promise<PatchResult> {
    const { path: filePath, diff } = params;

    // Validate the diff format
    if (!isValidDiff(diff)) {
        return {
            success: false,
            message: 'Invalid diff format. Expected unified diff with @@ markers'
        };
    }

    // Validate the path is allowed
    const resolvedPath = validateAndResolvePath(filePath);

    // Ensure parent directory exists (for new files)
    if (!pathExists(resolvedPath)) {
        ensureParentDir(resolvedPath);
    }

    // Apply the patch
    const result = applyDiffPatch(resolvedPath, diff);

    return result;
}
