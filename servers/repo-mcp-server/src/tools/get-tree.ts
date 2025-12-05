/**
 * get_tree tool - Get directory tree structure
 */

import * as fs from 'fs';
import * as path from 'path';
import { validateAndResolvePath, getStats } from '../utils/safety.js';
import type { TreeNode } from '../types.js';

export interface GetTreeParams {
    root_path: string;
    max_depth?: number;
    include_hidden?: boolean;
}

/**
 * Build a directory tree structure
 * 
 * @param params - Parameters for tree building
 * @returns Tree structure starting from root
 */
export async function getTree(params: GetTreeParams): Promise<TreeNode> {
    const {
        root_path,
        max_depth = 5,
        include_hidden = false
    } = params;

    // Validate the root path is allowed
    const resolvedRoot = validateAndResolvePath(root_path);

    // Check if directory exists
    const stats = getStats(resolvedRoot);
    if (!stats || !stats.isDirectory()) {
        throw new Error(`Path "${root_path}" is not a valid directory`);
    }

    // Build tree recursively
    return buildTreeNode(resolvedRoot, 0, max_depth, include_hidden);
}

/**
 * Recursively build a tree node
 */
function buildTreeNode(
    nodePath: string,
    currentDepth: number,
    maxDepth: number,
    includeHidden: boolean
): TreeNode {
    const stats = fs.statSync(nodePath);
    const name = path.basename(nodePath);

    const node: TreeNode = {
        name,
        path: nodePath,
        type: stats.isDirectory() ? 'directory' : 'file'
    };

    // If it's a directory and we haven't reached max depth, recurse
    if (stats.isDirectory() && currentDepth < maxDepth) {
        try {
            const entries = fs.readdirSync(nodePath);
            const children: TreeNode[] = [];

            for (const entry of entries) {
                // Skip hidden files unless requested
                if (!includeHidden && entry.startsWith('.')) {
                    continue;
                }

                // Skip common non-essential directories
                if (shouldSkipDirectory(entry)) {
                    continue;
                }

                const childPath = path.join(nodePath, entry);
                try {
                    children.push(buildTreeNode(childPath, currentDepth + 1, maxDepth, includeHidden));
                } catch {
                    // Skip files we can't access
                }
            }

            // Sort: directories first, then files, alphabetically within each group
            children.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            node.children = children;
        } catch {
            // Can't read directory contents
            node.children = [];
        }
    }

    return node;
}

/**
 * Check if a directory should be skipped in tree building
 */
function shouldSkipDirectory(name: string): boolean {
    const skipDirs = [
        'node_modules',
        '.git',
        '__pycache__',
        '.venv',
        'venv',
        '.idea',
        '.vs',
        'dist',
        'build',
        'coverage'
    ];
    return skipDirs.includes(name);
}
