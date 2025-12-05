/**
 * VS Code MCP Server - Diagnostics Bridge
 * 
 * This MCP server provides tools for interacting with a headless VS Code instance
 * running in Docker. It enables AI clients to open files, get diagnostics (errors,
 * warnings) from language servers, and iterate on code fixes.
 * 
 * Tools:
 * - open_file_in_vscode: Open a file in the headless VS Code
 * - get_diagnostics: Get all diagnostics from language servers
 * - close_file: Close an open file
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

import { createServiceClient, VSCodeServiceClient } from './client/vscode-client.js';
import type { DiagnosticsResponse } from './types.js';

// Simple logger
const logger = {
    info: (msg: string, ...args: unknown[]) =>
        console.error(`[vscode-mcp-server] INFO: ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) =>
        console.error(`[vscode-mcp-server] WARN: ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) =>
        console.error(`[vscode-mcp-server] ERROR: ${msg}`, ...args),
    debug: (msg: string, ...args: unknown[]) => {
        if (process.env.DEBUG) {
            console.error(`[vscode-mcp-server] DEBUG: ${msg}`, ...args);
        }
    }
};

// Input validation schemas
const OpenFileSchema = z.object({
    path: z.string().describe('Absolute path to the file to open in VS Code')
});

const GetDiagnosticsSchema = z.object({
    project_root: z.string().optional().describe('Optional project root to filter diagnostics')
});

const CloseFileSchema = z.object({
    path: z.string().describe('Absolute path to the file to close')
});

// Tool definitions
const TOOLS = [
    {
        name: 'open_file_in_vscode',
        description: 'Open a file in the headless VS Code instance. This triggers language servers to analyze the file and generate diagnostics.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                path: { type: 'string', description: 'Absolute path to the file to open' }
            },
            required: ['path']
        }
    },
    {
        name: 'get_diagnostics',
        description: 'Get all diagnostics (errors, warnings, info, hints) from VS Code language servers. Returns structured information about each diagnostic including file, line, column, severity, and message.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                project_root: { type: 'string', description: 'Optional project root path to filter diagnostics' }
            },
            required: []
        }
    },
    {
        name: 'close_file',
        description: 'Close a file in the headless VS Code instance.',
        inputSchema: {
            type: 'object' as const,
            properties: {
                path: { type: 'string', description: 'Absolute path to the file to close' }
            },
            required: ['path']
        }
    }
];

/**
 * Format diagnostics response for better readability
 */
function formatDiagnosticsResponse(response: DiagnosticsResponse): string {
    const lines: string[] = [];

    // Summary
    lines.push('=== Diagnostics Summary ===');
    lines.push(`Total Errors: ${response.summary.totalErrors}`);
    lines.push(`Total Warnings: ${response.summary.totalWarnings}`);
    lines.push(`Total Info: ${response.summary.totalInfo}`);
    lines.push(`Total Hints: ${response.summary.totalHints}`);
    lines.push(`Files with issues: ${response.summary.totalFiles}`);
    lines.push('');

    if (response.diagnostics.length === 0) {
        lines.push('No diagnostics found. Code looks clean!');
    } else {
        // Group by file
        const byFile = new Map<string, typeof response.diagnostics>();
        for (const diag of response.diagnostics) {
            const existing = byFile.get(diag.file) || [];
            existing.push(diag);
            byFile.set(diag.file, existing);
        }

        // Format each file's diagnostics
        for (const [file, diagnostics] of byFile) {
            lines.push(`--- ${file} ---`);
            for (const diag of diagnostics) {
                const loc = `${diag.range.start.line}:${diag.range.start.character}`;
                const source = diag.source ? `[${diag.source}]` : '';
                const code = diag.code ? `(${diag.code})` : '';
                lines.push(`  ${diag.severity.toUpperCase()} ${loc}: ${diag.message} ${source}${code}`);
            }
            lines.push('');
        }
    }

    return lines.join('\n');
}

/**
 * Main entry point - sets up and runs the MCP server
 */
async function main() {
    logger.info('Starting VS Code MCP Server...');

    // Create service client
    const serviceUrl = process.env.VSCODE_SERVICE_URL || 'http://localhost:5007';
    logger.info(`Connecting to VS Code service at: ${serviceUrl}`);

    const client = createServiceClient();

    // Create the MCP server
    const server = new Server(
        {
            name: 'vscode-mcp-server',
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
                case 'open_file_in_vscode': {
                    const params = OpenFileSchema.parse(args);

                    try {
                        const result = await client.openFile(params.path);
                        return {
                            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    path: params.path,
                                    message: `Failed to open file: ${error instanceof Error ? error.message : String(error)}`
                                }, null, 2)
                            }]
                        };
                    }
                }

                case 'get_diagnostics': {
                    const params = GetDiagnosticsSchema.parse(args);

                    try {
                        const result = await client.getDiagnostics(params.project_root);

                        // Return both formatted text and JSON
                        const formatted = formatDiagnosticsResponse(result);
                        return {
                            content: [
                                { type: 'text', text: formatted },
                                { type: 'text', text: '\n\n=== Raw JSON ===\n' + JSON.stringify(result, null, 2) }
                            ]
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    error: `Failed to get diagnostics: ${error instanceof Error ? error.message : String(error)}`
                                }, null, 2)
                            }]
                        };
                    }
                }

                case 'close_file': {
                    const params = CloseFileSchema.parse(args);

                    try {
                        const result = await client.closeFile(params.path);
                        return {
                            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    path: params.path,
                                    message: `Failed to close file: ${error instanceof Error ? error.message : String(error)}`
                                }, null, 2)
                            }]
                        };
                    }
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

    logger.info('VS Code MCP Server running on stdio');
}

// Run the server
main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
});
