/**
 * Exec MCP Server - Code execution tools for Python and JavaScript
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { z } from 'zod';
import { runPythonSnippet } from './tools/run-python-snippet.js';
import { runJsSnippet } from './tools/run-js-snippet.js';
import { runPythonFile } from './tools/run-python-file.js';
import { runJsFile } from './tools/run-js-file.js';
import { runCommand, CommandRequest } from './tools/run-command.js';
import { getExecConfig, validateConfig } from './config.js';

// Zod schemas for input validation
const SnippetRequestSchema = z.object({
    code: z.string().describe('The code to execute'),
    args: z.any().optional().describe('Optional arguments (object for snippets)'),
    timeoutSeconds: z.number().optional().describe('Timeout in seconds'),
    workingDirectory: z.string().optional().describe('Working directory path')
});

const FileRequestSchema = z.object({
    path: z.string().describe('Path to the script file'),
    args: z.array(z.string()).optional().describe('Command-line arguments'),
    timeoutSeconds: z.number().optional().describe('Timeout in seconds'),
    workingDirectory: z.string().optional().describe('Working directory path')
});

const CommandRequestSchema = z.object({
    command: z.string().describe('The command to execute'),
    args: z.array(z.string()).optional().describe('Command-line arguments'),
    timeoutSeconds: z.number().optional().describe('Timeout in seconds'),
    workingDirectory: z.string().optional().describe('Working directory path')
});

// Create MCP server
const server = new Server(
    {
        name: 'exec-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    const config = getExecConfig();

    // Check if enabled
    if (!config.enabled) {
        return {
            tools: [
                {
                    name: 'exec_status',
                    description: 'Check code execution status (currently disabled)',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                    },
                },
            ],
        };
    }

    return {
        tools: [
            {
                name: 'run_python_snippet',
                description: `Execute Python code snippet with timeout and safety controls. Max timeout: ${config.maxTimeoutSeconds}s`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: {
                            type: 'string',
                            description: 'Python code to execute',
                        },
                        args: {
                            type: 'object',
                            description: 'Optional JSON arguments (available as EXEC_ARGS_JSON environment variable)',
                        },
                        timeoutSeconds: {
                            type: 'number',
                            description: `Timeout in seconds (max: ${config.maxTimeoutSeconds})`,
                        },
                        workingDirectory: {
                            type: 'string',
                            description: 'Working directory for execution',
                        },
                    },
                    required: ['code'],
                },
            },
            {
                name: 'run_js_snippet',
                description: `Execute JavaScript code snippet with timeout and safety controls. Max timeout: ${config.maxTimeoutSeconds}s`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: {
                            type: 'string',
                            description: 'JavaScript code to execute',
                        },
                        args: {
                            type: 'object',
                            description: 'Optional JSON arguments (available as EXEC_ARGS_JSON environment variable)',
                        },
                        timeoutSeconds: {
                            type: 'number',
                            description: `Timeout in seconds (max: ${config.maxTimeoutSeconds})`,
                        },
                        workingDirectory: {
                            type: 'string',
                            description: 'Working directory for execution',
                        },
                    },
                    required: ['code'],
                },
            },
            {
                name: 'run_python_file',
                description: `Execute Python script file from allowed directories. Max timeout: ${config.maxTimeoutSeconds}s`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Path to Python file (relative to PROJECT_PATH or absolute within ALLOWED_DIRECTORIES)',
                        },
                        args: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Command-line arguments to pass to the script',
                        },
                        timeoutSeconds: {
                            type: 'number',
                            description: `Timeout in seconds (max: ${config.maxTimeoutSeconds})`,
                        },
                        workingDirectory: {
                            type: 'string',
                            description: 'Working directory for execution',
                        },
                    },
                    required: ['path'],
                },
            },
            {
                name: 'run_js_file',
                description: `Execute JavaScript script file from allowed directories. Max timeout: ${config.maxTimeoutSeconds}s`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'Path to JavaScript file (relative to PROJECT_PATH or absolute within ALLOWED_DIRECTORIES)',
                        },
                        args: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Command-line arguments to pass to the script',
                        },
                        timeoutSeconds: {
                            type: 'number',
                            description: `Timeout in seconds (max: ${config.maxTimeoutSeconds})`,
                        },
                        workingDirectory: {
                            type: 'string',
                            description: 'Working directory for execution',
                        },
                    },
                    required: ['path'],
                },
            },
            {
                name: 'run_command',
                description: `Execute any shell command (git, python, node, etc.). Max timeout: ${config.maxTimeoutSeconds}s`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        command: {
                            type: 'string',
                            description: 'The command to execute (e.g., git, python, npm)',
                        },
                        args: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Command-line arguments',
                        },
                        timeoutSeconds: {
                            type: 'number',
                            description: `Timeout in seconds (max: ${config.maxTimeoutSeconds})`,
                        },
                        workingDirectory: {
                            type: 'string',
                            description: 'Working directory for execution',
                        },
                    },
                    required: ['command'],
                },
            },
        ],
    };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const config = getExecConfig();

    // Check if enabled
    if (!config.enabled && request.params.name !== 'exec_status') {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: 'Code execution is disabled. Set ENABLE_CODE_EXECUTION=true to enable.',
                    }, null, 2),
                },
            ],
        };
    }

    try {
        let result;

        switch (request.params.name) {
            case 'exec_status':
                const validation = validateConfig(config);
                result = {
                    enabled: config.enabled,
                    pythonExecutable: config.pythonExecutable,
                    nodeExecutable: config.nodeExecutable,
                    defaultTimeoutSeconds: config.defaultTimeoutSeconds,
                    maxTimeoutSeconds: config.maxTimeoutSeconds,
                    maxOutputBytes: config.maxOutputBytes,
                    allowedDirectories: config.allowedDirectories,
                    defaultWorkingDirectory: config.defaultWorkingDirectory,
                    valid: validation.valid,
                    errors: validation.errors,
                };
                break;

            case 'run_python_snippet':
                const pythonSnippetArgs = SnippetRequestSchema.parse(request.params.arguments);
                result = await runPythonSnippet(pythonSnippetArgs);
                break;

            case 'run_js_snippet':
                const jsSnippetArgs = SnippetRequestSchema.parse(request.params.arguments);
                result = await runJsSnippet(jsSnippetArgs);
                break;

            case 'run_python_file':
                const pythonFileArgs = FileRequestSchema.parse(request.params.arguments);
                result = await runPythonFile(pythonFileArgs);
                break;

            case 'run_js_file':
                const jsFileArgs = FileRequestSchema.parse(request.params.arguments);
                result = await runJsFile(jsFileArgs);
                break;

            case 'run_command':
                const commandArgs = CommandRequestSchema.parse(request.params.arguments);
                result = await runCommand(commandArgs);
                break;

            default:
                throw new Error(`Unknown tool: ${request.params.name}`);
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    } catch (error: any) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error.message || 'Unknown error',
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
});

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Log startup information to stderr (stdout is used for MCP protocol)
    console.error('Exec MCP Server started');
    console.error('Configuration:', JSON.stringify(getExecConfig(), null, 2));
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
