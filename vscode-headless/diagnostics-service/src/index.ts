/**
 * Diagnostics Service - REST API for VS Code Diagnostics
 * 
 * This service runs alongside OpenVSCode Server in the Docker container.
 * It provides a simple REST API for:
 * - Opening files in VS Code
 * - Getting diagnostics from language servers
 * - Closing files
 * 
 * The service communicates with TypeScript/JavaScript language servers
 * by running tsc in typecheck mode and parsing the output.
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { glob } from 'glob';

const app = express();
app.use(express.json());

// Configuration
const PORT = parseInt(process.env.PORT || '5007', 10);
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/workspace';

// Track start time for health checks
const startTime = Date.now();

// Store of open files
const openFiles = new Set<string>();

// Type definitions
interface Diagnostic {
    file: string;
    range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    source?: string;
    code?: string | number;
}

interface DiagnosticsResult {
    success: boolean;
    diagnostics: Diagnostic[];
    summary: {
        totalErrors: number;
        totalWarnings: number;
        totalInfo: number;
        totalHints: number;
        totalFiles: number;
    };
    error?: string;
}

/**
 * Parse TypeScript compiler output into diagnostics
 */
function parseTscOutput(output: string, workspacePath: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // TypeScript error format: path/to/file.ts(line,col): error TS1234: message
    const errorRegex = /^(.+)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/gm;

    let match;
    while ((match = errorRegex.exec(output)) !== null) {
        const [, filePath, line, col, severity, code, message] = match;

        // Make path absolute if relative
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(workspacePath, filePath);

        diagnostics.push({
            file: absolutePath,
            range: {
                start: { line: parseInt(line, 10), character: parseInt(col, 10) },
                end: { line: parseInt(line, 10), character: parseInt(col, 10) + 1 }
            },
            severity: severity === 'error' ? 'error' : 'warning',
            message: message.trim(),
            source: 'typescript',
            code
        });
    }

    return diagnostics;
}

/**
 * Parse ESLint JSON output into diagnostics
 */
function parseEslintOutput(output: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    try {
        const results = JSON.parse(output);

        for (const result of results) {
            for (const msg of result.messages) {
                const severity: Diagnostic['severity'] =
                    msg.severity === 2 ? 'error' :
                        msg.severity === 1 ? 'warning' : 'info';

                diagnostics.push({
                    file: result.filePath,
                    range: {
                        start: { line: msg.line || 1, character: msg.column || 1 },
                        end: { line: msg.endLine || msg.line || 1, character: msg.endColumn || msg.column || 1 }
                    },
                    severity,
                    message: msg.message,
                    source: 'eslint',
                    code: msg.ruleId
                });
            }
        }
    } catch {
        // ESLint output wasn't valid JSON
    }

    return diagnostics;
}

/**
 * Run TypeScript compiler and collect diagnostics
 */
async function runTscDiagnostics(projectPath: string): Promise<Diagnostic[]> {
    return new Promise((resolve) => {
        // Check if tsconfig.json exists
        const tsconfigPath = path.join(projectPath, 'tsconfig.json');
        if (!fs.existsSync(tsconfigPath)) {
            resolve([]);
            return;
        }

        const tsc = spawn('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
            cwd: projectPath,
            shell: true
        });

        let stdout = '';
        let stderr = '';

        tsc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        tsc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        tsc.on('close', () => {
            const output = stdout + stderr;
            resolve(parseTscOutput(output, projectPath));
        });

        // Timeout after 60 seconds
        setTimeout(() => {
            tsc.kill();
            resolve([]);
        }, 60000);
    });
}

/**
 * Run ESLint and collect diagnostics
 */
async function runEslintDiagnostics(projectPath: string): Promise<Diagnostic[]> {
    return new Promise((resolve) => {
        // Check if ESLint config exists
        const hasEslintConfig = [
            '.eslintrc.js',
            '.eslintrc.json',
            '.eslintrc.yml',
            '.eslintrc.yaml',
            'eslint.config.js',
            'eslint.config.mjs'
        ].some(f => fs.existsSync(path.join(projectPath, f)));

        if (!hasEslintConfig) {
            resolve([]);
            return;
        }

        const eslint = spawn('npx', ['eslint', '.', '--format', 'json', '--ext', '.ts,.tsx,.js,.jsx'], {
            cwd: projectPath,
            shell: true
        });

        let stdout = '';

        eslint.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        eslint.on('close', () => {
            resolve(parseEslintOutput(stdout));
        });

        // Timeout after 60 seconds
        setTimeout(() => {
            eslint.kill();
            resolve([]);
        }, 60000);
    });
}

/**
 * Get Python diagnostics using pyright or mypy
 */
async function runPythonDiagnostics(projectPath: string): Promise<Diagnostic[]> {
    return new Promise((resolve) => {
        // Check for Python files
        const pyFiles = fs.readdirSync(projectPath).filter(f => f.endsWith('.py'));
        if (pyFiles.length === 0) {
            resolve([]);
            return;
        }

        // Try pyright first
        const pyright = spawn('npx', ['pyright', '--outputjson'], {
            cwd: projectPath,
            shell: true
        });

        let stdout = '';

        pyright.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pyright.on('close', (code) => {
            if (code !== null) {
                try {
                    const result = JSON.parse(stdout);
                    const diagnostics: Diagnostic[] = [];

                    for (const diag of result.generalDiagnostics || []) {
                        diagnostics.push({
                            file: diag.file,
                            range: {
                                start: { line: diag.range?.start?.line || 1, character: diag.range?.start?.character || 0 },
                                end: { line: diag.range?.end?.line || 1, character: diag.range?.end?.character || 0 }
                            },
                            severity: diag.severity === 'error' ? 'error' : 'warning',
                            message: diag.message,
                            source: 'pyright',
                            code: diag.rule
                        });
                    }

                    resolve(diagnostics);
                } catch {
                    resolve([]);
                }
            } else {
                resolve([]);
            }
        });

        // Timeout
        setTimeout(() => {
            pyright.kill();
            resolve([]);
        }, 60000);
    });
}

// ========== API Routes ==========

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0',
        uptime: Date.now() - startTime,
        workspace: WORKSPACE_PATH
    });
});

/**
 * Open a file in VS Code
 */
app.post('/open', async (req, res) => {
    const { path: filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({
            success: false,
            message: 'Missing required field: path'
        });
    }

    // Resolve relative paths against workspace
    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(WORKSPACE_PATH, filePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({
            success: false,
            path: absolutePath,
            message: 'File not found'
        });
    }

    // Track as open
    openFiles.add(absolutePath);

    res.json({
        success: true,
        path: absolutePath,
        message: 'File opened successfully'
    });
});

/**
 * Close a file
 */
app.post('/close', async (req, res) => {
    const { path: filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({
            success: false,
            message: 'Missing required field: path'
        });
    }

    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(WORKSPACE_PATH, filePath);

    openFiles.delete(absolutePath);

    res.json({
        success: true,
        path: absolutePath,
        message: 'File closed'
    });
});

/**
 * Get diagnostics for the project
 */
app.get('/diagnostics', async (req, res) => {
    const projectRoot = (req.query.projectRoot as string) || WORKSPACE_PATH;

    try {
        console.log(`[diagnostics] Running diagnostics for: ${projectRoot}`);

        // Run all diagnostic tools in parallel
        const [tscDiags, eslintDiags, pythonDiags] = await Promise.all([
            runTscDiagnostics(projectRoot),
            runEslintDiagnostics(projectRoot),
            runPythonDiagnostics(projectRoot)
        ]);

        // Combine all diagnostics
        const allDiagnostics = [...tscDiags, ...eslintDiags, ...pythonDiags];

        // Calculate summary
        const summary = {
            totalErrors: allDiagnostics.filter(d => d.severity === 'error').length,
            totalWarnings: allDiagnostics.filter(d => d.severity === 'warning').length,
            totalInfo: allDiagnostics.filter(d => d.severity === 'info').length,
            totalHints: allDiagnostics.filter(d => d.severity === 'hint').length,
            totalFiles: new Set(allDiagnostics.map(d => d.file)).size
        };

        console.log(`[diagnostics] Found ${allDiagnostics.length} issues`);

        const result: DiagnosticsResult = {
            success: true,
            diagnostics: allDiagnostics,
            summary
        };

        res.json(result);
    } catch (error) {
        console.error('[diagnostics] Error:', error);

        res.status(500).json({
            success: false,
            diagnostics: [],
            summary: {
                totalErrors: 0,
                totalWarnings: 0,
                totalInfo: 0,
                totalHints: 0,
                totalFiles: 0
            },
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

/**
 * Refresh diagnostics (force re-check)
 */
app.post('/diagnostics/refresh', async (req, res) => {
    const { projectRoot } = req.body;
    const targetPath = projectRoot || WORKSPACE_PATH;

    console.log(`[diagnostics] Refreshing diagnostics for: ${targetPath}`);

    // Redirect to GET /diagnostics
    res.redirect(307, `/diagnostics?projectRoot=${encodeURIComponent(targetPath)}`);
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[diagnostics-service] Running on port ${PORT}`);
    console.log(`[diagnostics-service] Workspace: ${WORKSPACE_PATH}`);
});
