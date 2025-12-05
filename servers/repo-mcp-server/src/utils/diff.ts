/**
 * Unified diff parsing and application utilities
 */

import * as Diff from 'diff';
import * as fs from 'fs';
import type { PatchResult } from '../types.js';

/**
 * Parse a unified diff string into structured patches
 * 
 * @param diffContent - The unified diff string
 * @returns Parsed patch objects
 */
export function parseDiff(diffContent: string): Diff.ParsedDiff[] {
    return Diff.parsePatch(diffContent);
}

/**
 * Apply a unified diff to a file
 * 
 * @param filePath - Path to the file to patch
 * @param diffContent - The unified diff string
 * @returns Result of the patch operation
 */
export function applyPatch(filePath: string, diffContent: string): PatchResult {
    try {
        // Read the original file content
        let originalContent: string;
        try {
            originalContent = fs.readFileSync(filePath, 'utf-8');
        } catch (error) {
            // File might not exist, start with empty content
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                originalContent = '';
            } else {
                throw error;
            }
        }

        // Parse the diff
        const patches = parseDiff(diffContent);

        if (patches.length === 0) {
            return {
                success: false,
                message: 'No valid patches found in diff content'
            };
        }

        // Apply each patch
        let patchedContent = originalContent;
        let hunksApplied = 0;
        let hunksFailed = 0;

        for (const patch of patches) {
            const result = Diff.applyPatch(patchedContent, patch, {
                // Allow some flexibility in line matching
                fuzzFactor: 2
            });

            if (result === false) {
                hunksFailed++;
            } else {
                patchedContent = result;
                hunksApplied += patch.hunks?.length || 0;
            }
        }

        if (hunksFailed > 0 && hunksApplied === 0) {
            return {
                success: false,
                message: `Failed to apply patch: all ${hunksFailed} hunks failed`,
                hunksApplied,
                hunksFailed
            };
        }

        // Write the patched content
        fs.writeFileSync(filePath, patchedContent, 'utf-8');

        return {
            success: true,
            message: hunksFailed > 0
                ? `Patch partially applied: ${hunksApplied} hunks succeeded, ${hunksFailed} failed`
                : `Patch applied successfully: ${hunksApplied} hunks`,
            hunksApplied,
            hunksFailed
        };
    } catch (error) {
        return {
            success: false,
            message: `Error applying patch: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Create a unified diff between two strings
 * 
 * @param oldContent - Original content
 * @param newContent - New content
 * @param filename - Name of the file (for diff header)
 * @returns Unified diff string
 */
export function createDiff(oldContent: string, newContent: string, filename: string): string {
    return Diff.createPatch(filename, oldContent, newContent, 'original', 'modified');
}

/**
 * Validate that a diff is properly formatted
 * 
 * @param diffContent - The diff string to validate
 * @returns true if valid, false otherwise
 */
export function isValidDiff(diffContent: string): boolean {
    if (!diffContent || typeof diffContent !== 'string') {
        return false;
    }

    // Check for unified diff markers
    const hasHunkHeader = /^@@\s*-\d+(?:,\d+)?\s*\+\d+(?:,\d+)?\s*@@/m.test(diffContent);
    const hasDiffHeader = /^---\s.*$/m.test(diffContent) && /^\+\+\+\s.*$/m.test(diffContent);

    return hasHunkHeader || hasDiffHeader;
}
