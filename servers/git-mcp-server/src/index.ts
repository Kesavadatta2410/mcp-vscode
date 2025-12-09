#!/usr/bin/env node

/**
 * Git MCP Server
 * 
 * Provides Git operations via Model Context Protocol:
 * - git_status: Get repository status
 * - git_diff: Show differences between commits
 * - git_log: View commit history
 * - git_branches: List branches
 * - git_checkout: Checkout branch/commit
 * - git_commit: Stage and commit changes
 * - git_push: Push to remote
 * - git_pull: Pull from remote
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { gitStatus } from './tools/git-status.js';
import { gitDiff } from './tools/git-diff.js';
import { gitLog } from './tools/git-log.js';
import { gitBranches } from './tools/git-branches.js';
import { gitCheckout } from './tools/git-checkout.js';
import { gitCommit } from './tools/git-commit.js';
import { gitPush } from './tools/git-push.js';
import { gitPull } from './tools/git-pull.js';

// Logger utility
function createLogger(prefix: string) {
    return {
        info: (msg: string) => console.error(`[${prefix}] INFO: ${msg}`),
        error: (msg: string) => console.error(`[${prefix}] ERROR: ${msg}`),
        warn: (msg: string) => console.error(`[${prefix}] WARN: ${msg}`)
    };
}

const logger = createLogger('git-mcp-server');

// Create server instance
const server = new Server(
    {
        name: 'git-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Tool schemas
const GitStatusSchema = z.object({
    repo_path: z.string().optional().describe('Path to Git repository')
});

const GitDiffSchema = z.object({
    repo_path: z.string().optional(),
    ref_a: z.string().optional().describe('First ref to compare'),
    ref_b: z.string().optional().describe('Second ref to compare'),
    path: z.string().optional().describe('Specific file/directory path'),
    include_diff: z.boolean().optional().describe('Include full diff text')
});

const GitLogSchema = z.object({
    repo_path: z.string().optional(),
    limit: z.number().optional().describe('Number of commits to return'),
    branch: z.string().optional().describe('Specific branch')
});

const GitBranchesSchema = z.object({
    repo_path: z.string().optional(),
    include_remote: z.boolean().optional().describe('Include remote branches')
});

const GitCheckoutSchema = z.object({
    repo_path: z.string().optional(),
    ref: z.string().describe('Branch or commit to checkout'),
    create: z.boolean().optional().describe('Create new branch')
});

const GitCommitSchema = z.object({
    repo_path: z.string().optional(),
    message: z.string().describe('Commit message'),
    add_all: z.boolean().optional().describe('Stage all changes'),
    files: z.array(z.string()).optional().describe('Specific files to stage')
});

const GitPushSchema = z.object({
    repo_path: z.string().optional(),
    remote: z.string().optional().describe('Remote name (default: origin)'),
    branch: z.string().optional().describe('Branch name'),
    set_upstream: z.boolean().optional().describe('Set upstream tracking')
});

const GitPullSchema = z.object({
    repo_path: z.string().optional(),
    remote: z.string().optional().describe('Remote name (default: origin)'),
    branch: z.string().optional().describe('Branch name')
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'git_status',
                description: 'Get the status of a Git repository showing modified, staged, untracked files',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repo_path: { type: 'string', description: 'Path to Git repository (defaults to GIT_REPO_PATH env var)' }
                    }
                }
            },
            {
                name: 'git_diff',
                description: 'Show differences between commits, branches, or working directory',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repo_path: { type: 'string' },
                        ref_a: { type: 'string', description: 'First ref to compare' },
                        ref_b: { type: 'string', description: 'Second ref to compare' },
                        path: { type: 'string', description: 'Specific file/directory path' },
                        include_diff: { type: 'boolean', description: 'Include full diff text' }
                    }
                }
            },
            {
                name: 'git_log',
                description: 'Get commit history with hash, author, date, and message',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repo_path: { type: 'string' },
                        limit: { type: 'number', description: 'Number of commits (default: 10)' },
                        branch: { type: 'string', description: 'Specific branch' }
                    }
                }
            },
            {
                name: 'git_branches',
                description: 'List local and remote branches',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repo_path: { type: 'string' },
                        include_remote: { type: 'boolean', description: 'Include remote branches (default: true)' }
                    }
                }
            },
            {
                name: 'git_checkout',
                description: 'Checkout a branch or commit (with safety checks for uncommitted changes)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repo_path: { type: 'string' },
                        ref: { type: 'string', description: 'Branch or commit to checkout' },
                        create: { type: 'boolean', description: 'Create new branch' }
                    },
                    required: ['ref']
                }
            },
            {
                name: 'git_commit',
                description: 'Stage and commit changes with message',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repo_path: { type: 'string' },
                        message: { type: 'string', description: 'Commit message' },
                        add_all: { type: 'boolean', description: 'Stage all changes' },
                        files: { type: 'array', items: { type: 'string' }, description: 'Specific files to stage' }
                    },
                    required: ['message']
                }
            },
            {
                name: 'git_push',
                description: 'Push commits to remote repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repo_path: { type: 'string' },
                        remote: { type: 'string', description: 'Remote name (default: origin)' },
                        branch: { type: 'string', description: 'Branch name' },
                        set_upstream: { type: 'boolean', description: 'Set upstream tracking' }
                    }
                }
            },
            {
                name: 'git_pull',
                description: 'Pull changes from remote repository (with safety checks)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repo_path: { type: 'string' },
                        remote: { type: 'string', description: 'Remote name (default: origin)' },
                        branch: { type: 'string', description: 'Branch name' }
                    }
                }
            }
        ]
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        switch (request.params.name) {
            case 'git_status': {
                const params = GitStatusSchema.parse(request.params.arguments);
                const result = await gitStatus(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'git_diff': {
                const params = GitDiffSchema.parse(request.params.arguments);
                const result = await gitDiff(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'git_log': {
                const params = GitLogSchema.parse(request.params.arguments);
                const result = await gitLog(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'git_branches': {
                const params = GitBranchesSchema.parse(request.params.arguments);
                const result = await gitBranches(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'git_checkout': {
                const params = GitCheckoutSchema.parse(request.params.arguments);
                const result = await gitCheckout(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'git_commit': {
                const params = GitCommitSchema.parse(request.params.arguments);
                const result = await gitCommit(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'git_push': {
                const params = GitPushSchema.parse(request.params.arguments);
                const result = await gitPush(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'git_pull': {
                const params = GitPullSchema.parse(request.params.arguments);
                const result = await gitPull(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            default:
                throw new Error(`Unknown tool: ${request.params.name}`);
        }
    } catch (error: any) {
        logger.error(`Tool execution error: ${error.message}`);
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true
        };
    }
});

// Start server
async function main() {
    try {
        logger.info('Starting Git MCP Server...');

        // Log configuration
        const repoPath = process.env.GIT_REPO_PATH || process.env.PROJECT_PATH || process.cwd();
        logger.info(`Default repository path: ${repoPath}`);

        const transport = new StdioServerTransport();
        await server.connect(transport);

        logger.info('Git MCP Server running on stdio');
    } catch (error: any) {
        logger.error(`Fatal error: ${error.message}`);
        process.exit(1);
    }
}

main();
