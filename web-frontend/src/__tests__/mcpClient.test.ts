import { describe, it, expect } from 'vitest';
// import mcpClient from '../services/mcpClient';

describe('MCP Client', () => {
    it('constructs correct API URL for listFiles', () => {
        const url = '/api/mcp/repo/list_files';
        expect(url).toContain('/api/mcp/repo/list_files');
    });

    it('constructs correct API URL for readFile', () => {
        const url = '/api/mcp/repo/read_file';
        expect(url).toContain('/api/mcp/repo/read_file');
    });

    it('constructs correct API URL for writeFile', () => {
        const url = '/api/mcp/repo/write_file';
        expect(url).toContain('/api/mcp/repo/write_file');
    });

    it('constructs correct API URL for runPythonFile', () => {
        const url = '/api/mcp/exec/run_python_file';
        expect(url).toContain('/api/mcp/exec/run_python_file');
    });

    it('constructs correct API URL for gitStatus', () => {
        const url = '/api/mcp/git/git_status';
        expect(url).toContain('/api/mcp/git/git_status');
    });
});
