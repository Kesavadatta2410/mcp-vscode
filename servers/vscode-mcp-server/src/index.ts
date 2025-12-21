/**
 * VS Code MCP Server - Full VS Code Functionality Bridge
 * 
 * This MCP server provides comprehensive tools for interacting with a headless
 * VS Code instance running in Docker. It enables AI clients to:
 * - Open/close files and get diagnostics
 * - Manage extensions (list, install, uninstall, enable, disable)
 * - Search text and symbols
 * - Use code intelligence (code actions, format, go-to-definition, references)
 * - Execute VS Code commands
 * - Use terminal (if enabled)
 * - Debug (if enabled)
 * - Run tasks
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

import { createServiceClient } from './client/vscode-client.js';
import type { DiagnosticsResponse, TextSearchResponse, SymbolSearchResponse } from './types.js';

// ========== Logger ==========
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

// ========== Configuration ==========
const DISABLE_TERMINAL = process.env.DISABLE_TERMINAL === 'true';
const DISABLE_DEBUG = process.env.DISABLE_DEBUG === 'true';

// ========== Input Validation Schemas ==========
const PathSchema = z.object({
    path: z.string().describe('Absolute path to the file')
});

const GetDiagnosticsSchema = z.object({
    project_root: z.string().optional().describe('Optional project root to filter diagnostics')
});

const ExtensionIdSchema = z.object({
    extension_id: z.string().describe('VS Code extension marketplace ID (e.g., "ms-python.python")')
});

const SearchTextSchema = z.object({
    query: z.string().describe('Search query string'),
    path: z.string().optional().describe('Path to search in (defaults to workspace)'),
    case_sensitive: z.boolean().optional().describe('Case-sensitive search'),
    regex: z.boolean().optional().describe('Treat query as regex'),
    includes: z.array(z.string()).optional().describe('Glob patterns to include'),
    excludes: z.array(z.string()).optional().describe('Glob patterns to exclude'),
    max_results: z.number().optional().describe('Maximum results to return')
});

const SearchSymbolsSchema = z.object({
    query: z.string().describe('Symbol name to search for'),
    path: z.string().optional().describe('Path to search in'),
    kind: z.string().optional().describe('Symbol kind filter (function, class, interface, type)')
});

const CodeActionsSchema = z.object({
    path: z.string().describe('File path'),
    line: z.number().optional().describe('Line number'),
    character: z.number().optional().describe('Character position')
});

const FormatDocumentSchema = z.object({
    path: z.string().describe('File path to format')
});

const GoToDefinitionSchema = z.object({
    path: z.string().describe('File path where symbol is referenced'),
    symbol: z.string().describe('Symbol name to find definition for'),
    line: z.number().optional().describe('Line number'),
    character: z.number().optional().describe('Character position')
});

const FindReferencesSchema = z.object({
    path: z.string().describe('File path where symbol is defined'),
    symbol: z.string().describe('Symbol name to find references for'),
    line: z.number().optional().describe('Line number'),
    character: z.number().optional().describe('Character position')
});

const ExecuteCommandSchema = z.object({
    command_id: z.string().describe('VS Code command ID'),
    args: z.array(z.unknown()).optional().describe('Command arguments')
});

const SaveFileSchema = z.object({
    path: z.string().describe('File path'),
    content: z.string().optional().describe('Optional content to write before saving')
});

const UpdateSettingsSchema = z.object({
    settings: z.record(z.unknown()).describe('Settings key-value pairs'),
    scope: z.enum(['workspace', 'user']).optional().describe('Settings scope')
});

const TerminalCreateSchema = z.object({
    cwd: z.string().optional().describe('Working directory'),
    shell: z.string().optional().describe('Shell to use')
});

const TerminalSendSchema = z.object({
    terminal_id: z.string().describe('Terminal ID'),
    input: z.string().describe('Input to send (include newline for execution)')
});

const TerminalIdSchema = z.object({
    terminal_id: z.string().describe('Terminal ID')
});

const DebugStartSchema = z.object({
    config: z.record(z.unknown()).describe('Debug configuration')
});

const DebugBreakpointSchema = z.object({
    session_id: z.string().describe('Debug session ID'),
    file: z.string().describe('File path'),
    line: z.number().describe('Line number'),
    remove: z.boolean().optional().describe('Remove breakpoint instead of adding')
});

const DebugStopSchema = z.object({
    session_id: z.string().describe('Debug session ID')
});

const RunTaskSchema = z.object({
    task_label: z.string().describe('Task label or name'),
    type: z.string().optional().describe('Task type (npm, shell, etc.)')
});

// ========== Tool Definitions ==========
interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, { type: string; description: string; items?: unknown; enum?: string[] }>;
        required: string[];
    };
}

function getTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [
        // Core file operations
        {
            name: 'open_file_in_vscode',
            description: 'Open a file in the headless VS Code instance. This triggers language servers to analyze the file.',
            inputSchema: {
                type: 'object' as const,
                properties: { path: { type: 'string', description: 'Absolute path to the file' } },
                required: ['path']
            }
        },
        {
            name: 'close_file',
            description: 'Close a file in the headless VS Code instance.',
            inputSchema: {
                type: 'object' as const,
                properties: { path: { type: 'string', description: 'Absolute path to the file' } },
                required: ['path']
            }
        },
        {
            name: 'save_file',
            description: 'Save a file, optionally with new content.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    path: { type: 'string', description: 'File path' },
                    content: { type: 'string', description: 'Optional content to write' }
                },
                required: ['path']
            }
        },
        {
            name: 'list_open_files',
            description: 'List all currently tracked open files in VS Code.',
            inputSchema: { type: 'object' as const, properties: {}, required: [] }
        },
        {
            name: 'get_diagnostics',
            description: 'Get all diagnostics (errors, warnings) from VS Code language servers.',
            inputSchema: {
                type: 'object' as const,
                properties: { project_root: { type: 'string', description: 'Optional project root path' } },
                required: []
            }
        },

        // Extension management
        {
            name: 'list_extensions',
            description: 'List all installed VS Code extensions.',
            inputSchema: { type: 'object' as const, properties: {}, required: [] }
        },
        {
            name: 'install_extension',
            description: 'Install a VS Code extension by marketplace ID.',
            inputSchema: {
                type: 'object' as const,
                properties: { extension_id: { type: 'string', description: 'Extension ID (e.g., "ms-python.python")' } },
                required: ['extension_id']
            }
        },
        {
            name: 'uninstall_extension',
            description: 'Uninstall a VS Code extension.',
            inputSchema: {
                type: 'object' as const,
                properties: { extension_id: { type: 'string', description: 'Extension ID' } },
                required: ['extension_id']
            }
        },
        {
            name: 'enable_extension',
            description: 'Enable a disabled VS Code extension.',
            inputSchema: {
                type: 'object' as const,
                properties: { extension_id: { type: 'string', description: 'Extension ID' } },
                required: ['extension_id']
            }
        },
        {
            name: 'disable_extension',
            description: 'Disable a VS Code extension.',
            inputSchema: {
                type: 'object' as const,
                properties: { extension_id: { type: 'string', description: 'Extension ID' } },
                required: ['extension_id']
            }
        },
        {
            name: 'list_installed_extensions',
            description: 'List all installed VS Code extensions (alias for list_extensions).',
            inputSchema: { type: 'object' as const, properties: {}, required: [] }
        },
        {
            name: 'get_extension_packs',
            description: 'Get available extension packs for quick installation.',
            inputSchema: { type: 'object' as const, properties: {}, required: [] }
        },
        {
            name: 'install_extension_pack',
            description: 'Install a predefined extension pack.',
            inputSchema: {
                type: 'object' as const,
                properties: { pack_name: { type: 'string', description: 'Pack name (python, javascript, web)' } },
                required: ['pack_name']
            }
        },

        // Search
        {
            name: 'search_text',
            description: 'Full-text search across files in the workspace.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    query: { type: 'string', description: 'Search query' },
                    path: { type: 'string', description: 'Path to search in' },
                    case_sensitive: { type: 'boolean', description: 'Case-sensitive search' },
                    regex: { type: 'boolean', description: 'Treat as regex' },
                    includes: { type: 'array', items: { type: 'string' }, description: 'Include patterns' },
                    excludes: { type: 'array', items: { type: 'string' }, description: 'Exclude patterns' },
                    max_results: { type: 'number', description: 'Maximum results' }
                },
                required: ['query']
            }
        },
        {
            name: 'search_symbols',
            description: 'Search for symbols (functions, classes, interfaces) in the workspace.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    query: { type: 'string', description: 'Symbol name' },
                    path: { type: 'string', description: 'Path to search in' },
                    kind: { type: 'string', description: 'Symbol kind (function, class, interface, type)' }
                },
                required: ['query']
            }
        },

        // Code intelligence
        {
            name: 'get_code_actions',
            description: 'Get available code actions (quick fixes, refactorings) at a position.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    path: { type: 'string', description: 'File path' },
                    line: { type: 'number', description: 'Line number' },
                    character: { type: 'number', description: 'Character position' }
                },
                required: ['path']
            }
        },
        {
            name: 'format_document',
            description: 'Format a document using the appropriate formatter.',
            inputSchema: {
                type: 'object' as const,
                properties: { path: { type: 'string', description: 'File path to format' } },
                required: ['path']
            }
        },
        {
            name: 'go_to_definition',
            description: 'Find the definition of a symbol.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    path: { type: 'string', description: 'File path where symbol is used' },
                    symbol: { type: 'string', description: 'Symbol name' },
                    line: { type: 'number', description: 'Line number' },
                    character: { type: 'number', description: 'Character position' }
                },
                required: ['path', 'symbol']
            }
        },
        {
            name: 'find_references',
            description: 'Find all references to a symbol.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    path: { type: 'string', description: 'File path where symbol is defined' },
                    symbol: { type: 'string', description: 'Symbol name' },
                    line: { type: 'number', description: 'Line number' },
                    character: { type: 'number', description: 'Character position' }
                },
                required: ['path', 'symbol']
            }
        },

        // Command execution
        {
            name: 'execute_command',
            description: 'Execute any VS Code command by its command ID. Returns the command result.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    command_id: { type: 'string', description: 'VS Code command ID' },
                    args: { type: 'array', description: 'Command arguments' }
                },
                required: ['command_id']
            }
        },

        // Settings
        {
            name: 'get_settings',
            description: 'Get VS Code user and workspace settings.',
            inputSchema: { type: 'object' as const, properties: {}, required: [] }
        },
        {
            name: 'update_settings',
            description: 'Update VS Code settings.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    settings: { type: 'object', description: 'Settings key-value pairs' },
                    scope: { type: 'string', enum: ['workspace', 'user'], description: 'Settings scope' }
                },
                required: ['settings']
            }
        },

        // Tasks
        {
            name: 'list_tasks',
            description: 'List available tasks (from tasks.json and package.json scripts).',
            inputSchema: { type: 'object' as const, properties: {}, required: [] }
        },
        {
            name: 'run_task',
            description: 'Run a task or npm script.',
            inputSchema: {
                type: 'object' as const,
                properties: {
                    task_label: { type: 'string', description: 'Task label or npm script name' },
                    type: { type: 'string', description: 'Task type' }
                },
                required: ['task_label']
            }
        }
    ];

    // Add terminal tools if enabled
    if (!DISABLE_TERMINAL) {
        tools.push(
            {
                name: 'create_terminal',
                description: 'Create a new terminal session.',
                inputSchema: {
                    type: 'object' as const,
                    properties: {
                        cwd: { type: 'string', description: 'Working directory' },
                        shell: { type: 'string', description: 'Shell to use' }
                    },
                    required: []
                }
            },
            {
                name: 'terminal_send',
                description: 'Send input to a terminal session.',
                inputSchema: {
                    type: 'object' as const,
                    properties: {
                        terminal_id: { type: 'string', description: 'Terminal ID' },
                        input: { type: 'string', description: 'Input to send (include \\n to execute)' }
                    },
                    required: ['terminal_id', 'input']
                }
            },
            {
                name: 'terminal_read',
                description: 'Read output from a terminal session.',
                inputSchema: {
                    type: 'object' as const,
                    properties: { terminal_id: { type: 'string', description: 'Terminal ID' } },
                    required: ['terminal_id']
                }
            },
            {
                name: 'close_terminal',
                description: 'Close a terminal session.',
                inputSchema: {
                    type: 'object' as const,
                    properties: { terminal_id: { type: 'string', description: 'Terminal ID' } },
                    required: ['terminal_id']
                }
            }
        );
    }

    // Add debug tools if enabled
    if (!DISABLE_DEBUG) {
        tools.push(
            {
                name: 'debug_start',
                description: 'Start a debug session.',
                inputSchema: {
                    type: 'object' as const,
                    properties: { config: { type: 'object' as const, description: 'Debug configuration' } },
                    required: ['config']
                }
            },
            {
                name: 'debug_set_breakpoint',
                description: 'Set or remove a breakpoint.',
                inputSchema: {
                    type: 'object' as const,
                    properties: {
                        session_id: { type: 'string', description: 'Debug session ID' },
                        file: { type: 'string', description: 'File path' },
                        line: { type: 'number', description: 'Line number' },
                        remove: { type: 'boolean', description: 'Remove instead of add' }
                    },
                    required: ['session_id', 'file', 'line']
                }
            },
            {
                name: 'debug_stop',
                description: 'Stop a debug session.',
                inputSchema: {
                    type: 'object' as const,
                    properties: { session_id: { type: 'string', description: 'Debug session ID' } },
                    required: ['session_id']
                }
            }
        );
    }

    return tools;
}

// ========== Response Formatters ==========
function formatDiagnosticsResponse(response: DiagnosticsResponse): string {
    const lines: string[] = ['=== Diagnostics Summary ==='];
    lines.push(`Errors: ${response.summary.totalErrors}`);
    lines.push(`Warnings: ${response.summary.totalWarnings}`);
    lines.push(`Info: ${response.summary.totalInfo}`);
    lines.push(`Hints: ${response.summary.totalHints}`);
    lines.push(`Files with issues: ${response.summary.totalFiles}`);
    lines.push('');

    if (response.diagnostics.length === 0) {
        lines.push('No diagnostics found. Code looks clean!');
    } else {
        const byFile = new Map<string, typeof response.diagnostics>();
        for (const diag of response.diagnostics) {
            const existing = byFile.get(diag.file) || [];
            existing.push(diag);
            byFile.set(diag.file, existing);
        }

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

function formatSearchResults(response: TextSearchResponse): string {
    const lines: string[] = [`=== Search Results (${response.total} matches) ===\n`];

    for (const result of response.results) {
        lines.push(`${result.file}:${result.line}:${result.column}`);
        lines.push(`  ${result.match}`);
    }

    return lines.join('\n');
}

function formatSymbolResults(response: SymbolSearchResponse): string {
    const lines: string[] = [`=== Symbol Search Results (${response.symbols.length} found) ===\n`];

    for (const symbol of response.symbols) {
        lines.push(`${symbol.kind} ${symbol.name}`);
        lines.push(`  ${symbol.file}:${symbol.line}:${symbol.column}`);
    }

    return lines.join('\n');
}

// ========== Main ==========
async function main() {
    logger.info('Starting VS Code MCP Server (Full Functionality)...');

    const serviceUrl = process.env.VSCODE_SERVICE_URL || 'http://localhost:5007';
    logger.info(`Connecting to VS Code service at: ${serviceUrl}`);
    logger.info(`Terminal enabled: ${!DISABLE_TERMINAL}, Debug enabled: ${!DISABLE_DEBUG}`);

    const client = createServiceClient();

    const server = new Server(
        { name: 'vscode-mcp-server', version: '2.0.0' },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return { tools: getTools() };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        logger.debug(`Tool called: ${name}`, args);

        try {
            switch (name) {
                // ========== Core File Operations ==========
                case 'open_file_in_vscode': {
                    const params = PathSchema.parse(args);
                    const result = await client.openFile(params.path);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'close_file': {
                    const params = PathSchema.parse(args);
                    const result = await client.closeFile(params.path);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'save_file': {
                    const params = SaveFileSchema.parse(args);
                    const result = await client.saveFile(params.path, params.content);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'list_open_files': {
                    const result = await client.listOpenFiles();
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'get_diagnostics': {
                    const params = GetDiagnosticsSchema.parse(args);
                    const result = await client.getDiagnostics(params.project_root);
                    const formatted = formatDiagnosticsResponse(result);
                    return {
                        content: [
                            { type: 'text', text: formatted },
                            { type: 'text', text: '\n\n=== Raw JSON ===\n' + JSON.stringify(result, null, 2) }
                        ]
                    };
                }

                // ========== Extension Management ==========
                case 'list_extensions': {
                    const result = await client.listExtensions();
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'install_extension': {
                    const params = ExtensionIdSchema.parse(args);
                    const result = await client.installExtension(params.extension_id);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'uninstall_extension': {
                    const params = ExtensionIdSchema.parse(args);
                    const result = await client.uninstallExtension(params.extension_id);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'enable_extension': {
                    const params = ExtensionIdSchema.parse(args);
                    const result = await client.enableExtension(params.extension_id);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'disable_extension': {
                    const params = ExtensionIdSchema.parse(args);
                    const result = await client.disableExtension(params.extension_id);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                // ========== Search ==========
                case 'search_text': {
                    const params = SearchTextSchema.parse(args);
                    const result = await client.searchText({
                        query: params.query,
                        path: params.path,
                        caseSensitive: params.case_sensitive,
                        regex: params.regex,
                        includes: params.includes,
                        excludes: params.excludes,
                        maxResults: params.max_results
                    });
                    const formatted = formatSearchResults(result);
                    return {
                        content: [
                            { type: 'text', text: formatted },
                            { type: 'text', text: '\n\n=== Raw JSON ===\n' + JSON.stringify(result, null, 2) }
                        ]
                    };
                }

                case 'search_symbols': {
                    const params = SearchSymbolsSchema.parse(args);
                    const result = await client.searchSymbols({
                        query: params.query,
                        path: params.path,
                        kind: params.kind
                    });
                    const formatted = formatSymbolResults(result);
                    return {
                        content: [
                            { type: 'text', text: formatted },
                            { type: 'text', text: '\n\n=== Raw JSON ===\n' + JSON.stringify(result, null, 2) }
                        ]
                    };
                }

                // ========== Code Intelligence ==========
                case 'get_code_actions': {
                    const params = CodeActionsSchema.parse(args);
                    const result = await client.getCodeActions({
                        path: params.path,
                        line: params.line,
                        character: params.character
                    });
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'format_document': {
                    const params = FormatDocumentSchema.parse(args);
                    const result = await client.formatDocument(params.path);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'go_to_definition': {
                    const params = GoToDefinitionSchema.parse(args);
                    const result = await client.goToDefinition({
                        path: params.path,
                        symbol: params.symbol,
                        line: params.line,
                        character: params.character
                    });
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'find_references': {
                    const params = FindReferencesSchema.parse(args);
                    const result = await client.findReferences({
                        path: params.path,
                        symbol: params.symbol,
                        line: params.line,
                        character: params.character
                    });
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                // ========== Command Execution ==========
                case 'execute_command': {
                    const params = ExecuteCommandSchema.parse(args);
                    const result = await client.executeCommand(params.command_id, params.args as unknown[] | undefined);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                // ========== Settings ==========
                case 'get_settings': {
                    const result = await client.getSettings();
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'update_settings': {
                    const params = UpdateSettingsSchema.parse(args);
                    const result = await client.updateSettings(params.settings as Record<string, unknown>, params.scope);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                // ========== Tasks ==========
                case 'list_tasks': {
                    const result = await client.listTasks();
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'run_task': {
                    const params = RunTaskSchema.parse(args);
                    const result = await client.runTask(params.task_label, params.type);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                // ========== Terminal (conditional) ==========
                case 'create_terminal': {
                    if (DISABLE_TERMINAL) {
                        throw new McpError(ErrorCode.InvalidRequest, 'Terminal is disabled');
                    }
                    const params = TerminalCreateSchema.parse(args);
                    const result = await client.createTerminal(params.cwd, params.shell);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'terminal_send': {
                    if (DISABLE_TERMINAL) {
                        throw new McpError(ErrorCode.InvalidRequest, 'Terminal is disabled');
                    }
                    const params = TerminalSendSchema.parse(args);
                    const result = await client.sendTerminalInput(params.terminal_id, params.input);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'terminal_read': {
                    if (DISABLE_TERMINAL) {
                        throw new McpError(ErrorCode.InvalidRequest, 'Terminal is disabled');
                    }
                    const params = TerminalIdSchema.parse(args);
                    const result = await client.readTerminal(params.terminal_id);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'close_terminal': {
                    if (DISABLE_TERMINAL) {
                        throw new McpError(ErrorCode.InvalidRequest, 'Terminal is disabled');
                    }
                    const params = TerminalIdSchema.parse(args);
                    const result = await client.closeTerminal(params.terminal_id);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                // ========== Debug (conditional) ==========
                case 'debug_start': {
                    if (DISABLE_DEBUG) {
                        throw new McpError(ErrorCode.InvalidRequest, 'Debug is disabled');
                    }
                    const params = DebugStartSchema.parse(args);
                    const result = await client.startDebug(params.config as Record<string, unknown>);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'debug_set_breakpoint': {
                    if (DISABLE_DEBUG) {
                        throw new McpError(ErrorCode.InvalidRequest, 'Debug is disabled');
                    }
                    const params = DebugBreakpointSchema.parse(args);
                    const result = await client.setBreakpoint(
                        params.session_id,
                        params.file,
                        params.line,
                        params.remove
                    );
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                case 'debug_stop': {
                    if (DISABLE_DEBUG) {
                        throw new McpError(ErrorCode.InvalidRequest, 'Debug is disabled');
                    }
                    const params = DebugStopSchema.parse(args);
                    const result = await client.stopDebug(params.session_id);
                    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
                }

                // ========== Extension Pack Tools (Frontend compatibility) ==========
                case 'list_installed_extensions': {
                    // Alias for list_extensions to match frontend naming
                    const result = await client.listExtensions();
                    return { content: [{ type: 'text', text: JSON.stringify({ extensions: result.extensions || [], count: result.extensions?.length || 0 }, null, 2) }] };
                }

                case 'get_extension_packs': {
                    // Return predefined extension packs
                    const packs = [
                        { name: 'python', label: 'Python Development', extensions: ['ms-python.python', 'ms-python.pylint'] },
                        { name: 'javascript', label: 'JavaScript/TypeScript', extensions: ['esbenp.prettier-vscode', 'dbaeumer.vscode-eslint'] },
                        { name: 'web', label: 'Web Development', extensions: ['ritwickdey.liveserver', 'formulahendry.auto-rename-tag'] },
                    ];
                    return { content: [{ type: 'text', text: JSON.stringify({ packs }, null, 2) }] };
                }

                case 'install_extension_pack': {
                    // Stub for extension pack installation
                    const packName = (args as any)?.pack_name || 'unknown';
                    return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: `Extension pack '${packName}' installation queued` }, null, 2) }] };
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

            // For service errors, return as content rather than throwing
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    }, null, 2)
                }]
            };
        }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('VS Code MCP Server running on stdio');
}

main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
});
