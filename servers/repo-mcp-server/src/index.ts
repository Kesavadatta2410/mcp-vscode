/**
 * Repo MCP Server - File System Operations
 * 
 * This MCP server provides tools for reading, writing, and manipulating files
 * in a controlled manner. It enforces security through allowed directory restrictions.
 * 
 * Tools:
 * - list_files: List files in a directory with optional pattern matching
 * - read_file: Read the contents of a file
 * - write_file: Write content to a file
 * - apply_patch: Apply a unified diff patch to a file
 * - get_tree: Get directory tree structure
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { listFiles } from './tools/list-files.js';
import { readFile } from './tools/read-file.js';
import { writeFile } from './tools/write-file.js';
import { applyPatch } from './tools/apply-patch.js';
import { getTree } from './tools/get-tree.js';
import { createLogger, getAllowedDirectories } from './utils/safety.js';

// Create logger
const logger = createLogger('repo-mcp-server');

// Input validation schemas
const ListFilesSchema = z.object({
    root_path: z.string().describe('Root directory path to list files from'),
    pattern: z.string().optional().describe('Glob pattern to match files (default: *)'),
    recursive: z.boolean().optional().describe('Search recursively (default: true)')
});

const ReadFileSchema = z.object({
    path: z.string().describe('Path to the file to read'),
    encoding: z.enum(['utf-8', 'utf8', 'ascii', 'base64']).optional().describe('File encoding (default: utf-8)')
});

const WriteFileSchema = z.object({
    path: z.string().describe('Path to the file to write'),
    content: z.string().describe('Content to write to the file'),
    encoding: z.enum(['utf-8', 'utf8', 'ascii']).optional().describe('File encoding (default: utf-8)'),
    create_directories: z.boolean().optional().describe('Create parent directories if they don\'t exist (default: true)')
});

const ApplyPatchSchema = z.object({
    path: z.string().describe('Path to the file to patch'),
    diff: z.string().describe('Unified diff content to apply')
});

const GetTreeSchema = z.object({
    root_path: z.string().describe('Root directory path to build tree from'),
    max_depth: z.number().optional().describe('Maximum depth to traverse (default: 5)'),
    include_hidden: z.boolean().optional().describe('Include hidden files (default: false)')
});

// Tool definitions
const TOOLS = [
    {
        name: 'list_files',
        description: 'List files in a directory, optionally matching a glob pattern. Returns file paths, types, sizes, and modification times.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                root_path: { type: 'string', description: 'Root directory path to list files from' },
                pattern: { type: 'string', description: 'Glob pattern to match files (default: *)' },
                recursive: { type: 'boolean', description: 'Search recursively (default: true)' }
            },
            required: ['root_path']
        }
    },
    {
        name: 'read_file',
        description: 'Read the contents of a file. Returns the file content as text along with metadata.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                path: { type: 'string', description: 'Path to the file to read' },
                encoding: { type: 'string', enum: ['utf-8', 'utf8', 'ascii', 'base64'], description: 'File encoding (default: utf-8)' }
            },
            required: ['path']
        }
    },
    {
        name: 'write_file',
        description: 'Write content to a file. Creates the file if it doesn\'t exist. Optionally creates parent directories.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                path: { type: 'string', description: 'Path to the file to write' },
                content: { type: 'string', description: 'Content to write to the file' },
                encoding: { type: 'string', enum: ['utf-8', 'utf8', 'ascii'], description: 'File encoding (default: utf-8)' },
                create_directories: { type: 'boolean', description: 'Create parent directories if needed (default: true)' }
            },
            required: ['path', 'content']
        }
    },
    {
        name: 'apply_patch',
        description: 'Apply a unified diff patch to a file. The diff should be in standard unified diff format with @@ markers.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                path: { type: 'string', description: 'Path to the file to patch' },
                diff: { type: 'string', description: 'Unified diff content to apply' }
            },
            required: ['path', 'diff']
        }
    },
    {
        name: 'get_tree',
        description: 'Get the directory tree structure. Returns a hierarchical view of files and directories. Skips common non-essential directories like node_modules.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                root_path: { type: 'string', description: 'Root directory path' },
                max_depth: { type: 'number', description: 'Maximum depth to traverse (default: 5)' },
                include_hidden: { type: 'boolean', description: 'Include hidden files (default: false)' }
            },
            required: ['root_path']
        }
    }
];

/**
 * Main entry point - sets up and runs the MCP server
 */
async function main() {
    logger.info('Starting Repo MCP Server...');

    // Log allowed directories
    const allowedDirs = getAllowedDirectories();
    if (allowedDirs.length > 0) {
        logger.info(`Allowed directories: ${allowedDirs.join(', ')}`);
    } else {
        logger.warn('No allowed directories configured! Set ALLOWED_DIRECTORIES env var.');
    }

    // Create the MCP server
    const server = new Server(
        {
            name: 'repo-mcp-server',
            version: '1.0.0',
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    // Handle list tools request
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools: TOOLS };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        logger.debug(`Tool called: ${name}`, args);

        try {
            switch (name) {
                case 'list_files': {
                    const params = ListFilesSchema.parse(args);
                    const result = await listFiles(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                    };
                }

                case 'read_file': {
                    const params = ReadFileSchema.parse(args);
                    const result = await readFile(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                    };
                }

                case 'write_file': {
                    const params = WriteFileSchema.parse(args);
                    const result = await writeFile(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                    };
                }

                case 'apply_patch': {
                    const params = ApplyPatchSchema.parse(args);
                    const result = await applyPatch(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                    };
                }

                case 'get_tree': {
                    const params = GetTreeSchema.parse(args);
                    const result = await getTree(params);
                    return {
                        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                    };
                }

                default:
                    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
        } catch (error) {
            logger.error(`Error in tool ${name}:`, error);

            if (error instanceof z.ZodError) {
                throw new McpError(
                    ErrorCode.InvalidParams,
                    `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
                );
            }

            if (error instanceof McpError) {
                throw error;
            }

            throw new McpError(
                ErrorCode.InternalError,
                error instanceof Error ? error.message : String(error)
            );
        }
    });

    // Connect via stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('Repo MCP Server running on stdio');
}

// Run the server
main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
});
