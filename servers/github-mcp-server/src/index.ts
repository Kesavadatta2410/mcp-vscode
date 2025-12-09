#!/usr/bin/env node

/**
 * GitHub MCP Server
 * 
 * Provides GitHub API operations via Model Context Protocol:
 * - github_get_repos: List repositories
 * - github_get_repo: Get repository details
 * - github_create_repo: Create a new repository
 * - github_list_issues: List issues
 * - github_create_issue: Create an issue
 * - github_get_pull_requests: List pull requests
 * - github_create_pull_request: Create a pull request
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { hasGitHubToken } from './utils.js';
import { githubGetRepos } from './tools/github-get-repos.js';
import { githubGetRepo } from './tools/github-get-repo.js';
import { githubCreateRepo } from './tools/github-create-repo.js';
import { githubListIssues } from './tools/github-list-issues.js';
import { githubCreateIssue } from './tools/github-create-issue.js';
import { githubGetPullRequests } from './tools/github-get-pull-requests.js';
import { githubCreatePullRequest } from './tools/github-create-pull-request.js';

// Logger utility
function createLogger(prefix: string) {
    return {
        info: (msg: string) => console.error(`[${prefix}] INFO: ${msg}`),
        error: (msg: string) => console.error(`[${prefix}] ERROR: ${msg}`),
        warn: (msg: string) => console.error(`[${prefix}] WARN: ${msg}`)
    };
}

const logger = createLogger('github-mcp-server');

// Create server instance
const server = new Server(
    {
        name: 'github-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

//  Tool schemas
const GitHubGetReposSchema = z.object({
    user_or_org: z.string().describe('GitHub username or organization'),
    type: z.enum(['all', 'owner', 'member']).optional(),
    per_page: z.number().optional()
});

const GitHubGetRepoSchema = z.object({
    owner: z.string(),
    repo: z.string()
});

const GitHubCreateRepoSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    visibility: z.enum(['public', 'private']).optional(),
    auto_init: z.boolean().optional()
});

const GitHubListIssuesSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    state: z.enum(['open', 'closed', 'all']).optional(),
    labels: z.array(z.string()).optional(),
    per_page: z.number().optional()
});

const GitHubCreateIssueSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    title: z.string(),
    body: z.string().optional(),
    labels: z.array(z.string()).optional()
});

const GitHubGetPullRequestsSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    state: z.enum(['open', 'closed', 'all']).optional(),
    per_page: z.number().optional()
});

const GitHubCreatePullRequestSchema = z.object({
    owner: z.string(),
    repo: z.string(),
    title: z.string(),
    head: z.string().describe('Source branch'),
    base: z.string().describe('Target branch'),
    body: z.string().optional()
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'github_get_repos',
                description: 'List repositories for a user or organization',
                inputSchema: {
                    type: 'object',
                    properties: {
                        user_or_org: { type: 'string', description: 'GitHub username or organization' },
                        type: { type: 'string', enum: ['all', 'owner', 'member'], description: 'Filter by type' },
                        per_page: { type: 'number', description: 'Results per page (max 100)' }
                    },
                    required: ['user_or_org']
                }
            },
            {
                name: 'github_get_repo',
                description: 'Get details for a specific repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string', description: 'Repository owner' },
                        repo: { type: 'string', description: 'Repository name' }
                    },
                    required: ['owner', 'repo']
                }
            },
            {
                name: 'github_create_repo',
                description: 'Create a new repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Repository name' },
                        description: { type: 'string', description: 'Repository description' },
                        visibility: { type: 'string', enum: ['public', 'private'], description: 'Visibility (default: public)' },
                        auto_init: { type: 'boolean', description: 'Initialize with README (default: true)' }
                    },
                    required: ['name']
                }
            },
            {
                name: 'github_list_issues',
                description: 'List issues for a repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string' },
                        repo: { type: 'string' },
                        state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Filter by state' },
                        labels: { type: 'array', items: { type: 'string' }, description: 'Filter by labels' },
                        per_page: { type: 'number' }
                    },
                    required: ['owner', 'repo']
                }
            },
            {
                name: 'github_create_issue',
                description: 'Create a new issue',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string' },
                        repo: { type: 'string' },
                        title: { type: 'string', description: 'Issue title' },
                        body: { type: 'string', description: 'Issue description' },
                        labels: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['owner', 'repo', 'title']
                }
            },
            {
                name: 'github_get_pull_requests',
                description: 'List pull requests for a repository',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string' },
                        repo: { type: 'string' },
                        state: { type: 'string', enum: ['open', 'closed', 'all'] },
                        per_page: { type: 'number' }
                    },
                    required: ['owner', 'repo']
                }
            },
            {
                name: 'github_create_pull_request',
                description: 'Create a new pull request',
                inputSchema: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string' },
                        repo: { type: 'string' },
                        title: { type: 'string', description: 'PR title' },
                        head: { type: 'string', description: 'Source branch' },
                        base: { type: 'string', description: 'Target branch' },
                        body: { type: 'string', description: 'PR description' }
                    },
                    required: ['owner', 'repo', 'title', 'head', 'base']
                }
            }
        ]
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        switch (request.params.name) {
            case 'github_get_repos': {
                const params = GitHubGetReposSchema.parse(request.params.arguments);
                const result = await githubGetRepos(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'github_get_repo': {
                const params = GitHubGetRepoSchema.parse(request.params.arguments);
                const result = await githubGetRepo(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'github_create_repo': {
                const params = GitHubCreateRepoSchema.parse(request.params.arguments);
                const result = await githubCreateRepo(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'github_list_issues': {
                const params = GitHubListIssuesSchema.parse(request.params.arguments);
                const result = await githubListIssues(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'github_create_issue': {
                const params = GitHubCreateIssueSchema.parse(request.params.arguments);
                const result = await githubCreateIssue(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'github_get_pull_requests': {
                const params = GitHubGetPullRequestsSchema.parse(request.params.arguments);
                const result = await githubGetPullRequests(params);
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'github_create_pull_request': {
                const params = GitHubCreatePullRequestSchema.parse(request.params.arguments);
                const result = await githubCreatePullRequest(params);
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
        logger.info('Starting GitHub MCP Server...');

        // Check token
        if (!hasGitHubToken()) {
            logger.warn('GITHUB_TOKEN not set. Set this environment variable to use GitHub API features.');
            logger.warn('Generate a token at: https://github.com/settings/tokens');
        } else {
            logger.info('GitHub token configured');
        }

        const transport = new StdioServerTransport();
        await server.connect(transport);

        logger.info('GitHub MCP Server running on stdio');
    } catch (error: any) {
        logger.error(`Fatal error: ${error.message}`);
        process.exit(1);
    }
}

main();
