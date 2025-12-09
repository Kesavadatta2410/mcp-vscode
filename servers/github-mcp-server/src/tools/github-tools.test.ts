/**
 * Tests for GitHub tools - github_get_repos and github_create_issue
 * Note: These are unit tests that mock the Octokit API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use vi.hoisted to ensure mocks are available before module imports
const { mockListForUser, mockCreate, mockGetOctokit } = vi.hoisted(() => {
    const mockListForUser = vi.fn();
    const mockCreate = vi.fn();
    const mockGetOctokit = vi.fn(() => ({
        repos: { listForUser: mockListForUser },
        issues: { create: mockCreate }
    }));

    return { mockListForUser, mockCreate, mockGetOctokit };
});

// Mock the utils module
vi.mock('../utils', () => ({
    getOctokit: mockGetOctokit,
    hasGitHubToken: () => true
}));

// Import after mocking
import { githubGetRepos } from './github-get-repos';
import { githubCreateIssue } from './github-create-issue';

describe('GitHub MCP Tools', () => {
    beforeEach(() => {
        mockListForUser.mockClear();
        mockCreate.mockClear();
        mockGetOctokit.mockClear();
    });

    describe('github_get_repos', () => {
        it('should list repositories for a user', async () => {
            const mockRepos = [
                {
                    name: 'repo1',
                    full_name: 'user/repo1',
                    owner: { login: 'user' },
                    description: 'Test repo',
                    private: false,
                    default_branch: 'main',
                    html_url: 'https://github.com/user/repo1',
                    clone_url: 'https://github.com/user/repo1.git',
                    ssh_url: 'git@github.com:user/repo1.git'
                }
            ];

            mockListForUser.mockResolvedValueOnce({ data: mockRepos });

            const result = await githubGetRepos({ user_or_org: 'user' });

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('repo1');
            expect(result[0].visibility).toBe('public');
        });

        it('should handle null descriptions', async () => {
            const mockRepos = [
                {
                    name: 'repo1',
                    full_name: 'user/repo1',
                    owner: { login: 'user' },
                    description: null,
                    private: true,
                    default_branch: 'main',
                    html_url: 'https://github.com/user/repo1',
                    clone_url: 'https://github.com/user/repo1.git',
                    ssh_url: 'git@github.com:user/repo1.git'
                }
            ];

            mockListForUser.mockResolvedValueOnce({ data: mockRepos });

            const result = await githubGetRepos({ user_or_org: 'user' });

            expect(result[0].description).toBeNull();
            expect(result[0].visibility).toBe('private');
        });
    });

    describe('github_create_issue', () => {
        it('should create an issue successfully', async () => {
            const mockIssue = {
                number: 42,
                html_url: 'https://github.com/user/repo/issues/42',
                state: 'open'
            };

            mockCreate.mockResolvedValueOnce({ data: mockIssue });

            const result = await githubCreateIssue({
                owner: 'user',
                repo: 'repo',
                title: 'Test issue',
                body: 'This is a test'
            });

            expect(result.success).toBe(true);
            expect(result.message).toContain('#42');
            expect(result.data?.number).toBe(42);
        });

        it('should fail with empty title', async () => {
            const result = await githubCreateIssue({
                owner: 'user',
                repo: 'repo',
                title: ''
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('title cannot be empty');
        });

        it('should handle API errors', async () => {
            mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

            const result = await githubCreateIssue({
                owner: 'user',
                repo: 'repo',
                title: 'Test'
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('rate limit');
        });

        it('should create issue with labels', async () => {
            const mockIssue = {
                number: 1,
                html_url: 'https://github.com/user/repo/issues/1',
                state: 'open'
            };

            mockCreate.mockResolvedValueOnce({ data: mockIssue });

            const result = await githubCreateIssue({
                owner: 'user',
                repo: 'repo',
                title: 'Bug report',
                labels: ['bug', 'high-priority']
            });

            expect(result.success).toBe(true);
            expect(result.data?.number).toBe(1);
        });
    });
});
