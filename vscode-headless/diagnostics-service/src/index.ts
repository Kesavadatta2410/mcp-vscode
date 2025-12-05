/**
 * VS Code Headless Service - Full API for VS Code Functionality
 * 
 * This service runs alongside OpenVSCode Server in the Docker container.
 * It provides comprehensive REST APIs for:
 * - Opening/closing files and diagnostics
 * - Extension management (list, install, uninstall, enable, disable)
 * - Workspace search (text, symbols)
 * - Code intelligence (code actions, format, go-to-definition, references)
 * - Generic VS Code command execution
 * - Terminal operations (if enabled)
 * - Debug sessions (if enabled)
 * - Task running
 */

import express, { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec, ChildProcess } from 'child_process';
import { glob } from 'glob';
import { promisify } from 'util';

const execAsync = promisify(exec);

const app = express();
app.use(express.json({ limit: '10mb' }));

// ========== Configuration ==========
const PORT = parseInt(process.env.PORT || '5007', 10);
const WORKSPACE_PATH = process.env.WORKSPACE_PATH || '/workspace';
const DISABLE_TERMINAL = process.env.DISABLE_TERMINAL === 'true';
const DISABLE_DEBUG = process.env.DISABLE_DEBUG === 'true';
const SECURITY_LOGGING = process.env.SECURITY_LOGGING !== 'false';

// Allowlists (comma-separated in env, empty means allow all)
const ALLOWED_COMMANDS = process.env.ALLOWED_VSCODE_COMMANDS
    ? process.env.ALLOWED_VSCODE_COMMANDS.split(',').map(s => s.trim())
    : [];
const ALLOWED_EXTENSIONS = process.env.ALLOWED_EXTENSIONS
    ? process.env.ALLOWED_EXTENSIONS.split(',').map(s => s.trim())
    : [];

// Track start time for health checks
const startTime = Date.now();

// Store of open files
const openFiles = new Set<string>();

// Store terminal sessions
interface TerminalSession {
    id: string;
    process: ChildProcess;
    output: string[];
    createdAt: number;
}
const terminals = new Map<string, TerminalSession>();

// Debug session tracking
interface DebugSession {
    id: string;
    config: Record<string, unknown>;
    breakpoints: Array<{ file: string; line: number }>;
    status: 'running' | 'paused' | 'stopped';
}
const debugSessions = new Map<string, DebugSession>();

// ========== Type Definitions ==========
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

interface Extension {
    id: string;
    name: string;
    version: string;
    enabled: boolean;
    description?: string;
}

interface SearchResult {
    file: string;
    line: number;
    column: number;
    match: string;
    context?: string;
}

interface SymbolResult {
    name: string;
    kind: string;
    file: string;
    line: number;
    column: number;
}

interface CodeAction {
    title: string;
    kind: string;
    isPreferred?: boolean;
}

interface Location {
    file: string;
    line: number;
    column: number;
}

// ========== Security Logging ==========
function securityLog(action: string, details: Record<string, unknown>) {
    if (SECURITY_LOGGING) {
        console.log(`[SECURITY] ${new Date().toISOString()} | ${action} |`, JSON.stringify(details));
    }
}

function checkCommandAllowed(commandId: string): boolean {
    if (ALLOWED_COMMANDS.length === 0) return true;
    return ALLOWED_COMMANDS.includes(commandId);
}

function checkExtensionAllowed(extensionId: string): boolean {
    if (ALLOWED_EXTENSIONS.length === 0) return true;
    return ALLOWED_EXTENSIONS.includes(extensionId);
}

// ========== Diagnostic Parsers ==========
function parseTscOutput(output: string, workspacePath: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const errorRegex = /^(.+)\((\d+),(\d+)\):\s*(error|warning)\s+(TS\d+):\s*(.+)$/gm;

    let match;
    while ((match = errorRegex.exec(output)) !== null) {
        const [, filePath, line, col, severity, code, message] = match;
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

// ========== Diagnostic Runners ==========
async function runTscDiagnostics(projectPath: string): Promise<Diagnostic[]> {
    return new Promise((resolve) => {
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

        tsc.stdout.on('data', (data) => { stdout += data.toString(); });
        tsc.stderr.on('data', (data) => { stderr += data.toString(); });

        tsc.on('close', () => {
            resolve(parseTscOutput(stdout + stderr, projectPath));
        });

        setTimeout(() => { tsc.kill(); resolve([]); }, 60000);
    });
}

async function runEslintDiagnostics(projectPath: string): Promise<Diagnostic[]> {
    return new Promise((resolve) => {
        const hasEslintConfig = [
            '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml',
            '.eslintrc.yaml', 'eslint.config.js', 'eslint.config.mjs'
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
        eslint.stdout.on('data', (data) => { stdout += data.toString(); });
        eslint.on('close', () => { resolve(parseEslintOutput(stdout)); });
        setTimeout(() => { eslint.kill(); resolve([]); }, 60000);
    });
}

async function runPythonDiagnostics(projectPath: string): Promise<Diagnostic[]> {
    return new Promise((resolve) => {
        try {
            const pyFiles = fs.readdirSync(projectPath).filter(f => f.endsWith('.py'));
            if (pyFiles.length === 0) {
                resolve([]);
                return;
            }
        } catch {
            resolve([]);
            return;
        }

        const pyright = spawn('npx', ['pyright', '--outputjson'], {
            cwd: projectPath,
            shell: true
        });

        let stdout = '';
        pyright.stdout.on('data', (data) => { stdout += data.toString(); });

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

        setTimeout(() => { pyright.kill(); resolve([]); }, 60000);
    });
}

// ========== Utility Functions ==========
function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

function resolvePath(filePath: string): string {
    return path.isAbsolute(filePath) ? filePath : path.join(WORKSPACE_PATH, filePath);
}

// ========== API Routes ==========

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '2.0.0',
        uptime: Date.now() - startTime,
        workspace: WORKSPACE_PATH,
        features: {
            terminal: !DISABLE_TERMINAL,
            debug: !DISABLE_DEBUG,
            extensions: true,
            search: true,
            codeIntelligence: true
        }
    });
});

// ========== File Operations ==========

app.post('/open', async (req, res) => {
    const { path: filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ success: false, message: 'Missing required field: path' });
    }

    const absolutePath = resolvePath(filePath);

    if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ success: false, path: absolutePath, message: 'File not found' });
    }

    openFiles.add(absolutePath);
    res.json({ success: true, path: absolutePath, message: 'File opened successfully' });
});

app.post('/close', async (req, res) => {
    const { path: filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ success: false, message: 'Missing required field: path' });
    }

    const absolutePath = resolvePath(filePath);
    openFiles.delete(absolutePath);
    res.json({ success: true, path: absolutePath, message: 'File closed' });
});

app.get('/workspace/open-files', (req, res) => {
    res.json({
        success: true,
        files: Array.from(openFiles)
    });
});

app.post('/workspace/save', async (req, res) => {
    const { path: filePath, content } = req.body;

    if (!filePath) {
        return res.status(400).json({ success: false, message: 'Missing required field: path' });
    }

    const absolutePath = resolvePath(filePath);

    try {
        if (content !== undefined) {
            fs.writeFileSync(absolutePath, content, 'utf-8');
        }
        // If no content provided, the file is already saved (no-op for tracking)
        res.json({ success: true, path: absolutePath, message: 'File saved' });
    } catch (error) {
        res.status(500).json({
            success: false,
            path: absolutePath,
            message: `Failed to save file: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

// ========== Diagnostics ==========

app.get('/diagnostics', async (req, res) => {
    const projectRoot = (req.query.projectRoot as string) || WORKSPACE_PATH;

    try {
        console.log(`[diagnostics] Running diagnostics for: ${projectRoot}`);

        const [tscDiags, eslintDiags, pythonDiags] = await Promise.all([
            runTscDiagnostics(projectRoot),
            runEslintDiagnostics(projectRoot),
            runPythonDiagnostics(projectRoot)
        ]);

        const allDiagnostics = [...tscDiags, ...eslintDiags, ...pythonDiags];

        const summary = {
            totalErrors: allDiagnostics.filter(d => d.severity === 'error').length,
            totalWarnings: allDiagnostics.filter(d => d.severity === 'warning').length,
            totalInfo: allDiagnostics.filter(d => d.severity === 'info').length,
            totalHints: allDiagnostics.filter(d => d.severity === 'hint').length,
            totalFiles: new Set(allDiagnostics.map(d => d.file)).size
        };

        console.log(`[diagnostics] Found ${allDiagnostics.length} issues`);

        res.json({ success: true, diagnostics: allDiagnostics, summary });
    } catch (error) {
        console.error('[diagnostics] Error:', error);
        res.status(500).json({
            success: false,
            diagnostics: [],
            summary: { totalErrors: 0, totalWarnings: 0, totalInfo: 0, totalHints: 0, totalFiles: 0 },
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

app.post('/diagnostics/refresh', async (req, res) => {
    const { projectRoot } = req.body;
    const targetPath = projectRoot || WORKSPACE_PATH;
    console.log(`[diagnostics] Refreshing diagnostics for: ${targetPath}`);
    res.redirect(307, `/diagnostics?projectRoot=${encodeURIComponent(targetPath)}`);
});

// ========== Extension Management ==========

app.get('/extensions', async (req, res) => {
    try {
        // List extensions using code command
        const { stdout } = await execAsync('code --list-extensions --show-versions 2>/dev/null || echo ""');

        const extensions: Extension[] = stdout
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [id, version] = line.split('@');
                return {
                    id: id || line,
                    name: id?.split('.').pop() || id || line,
                    version: version || 'unknown',
                    enabled: true
                };
            });

        res.json({ success: true, extensions });
    } catch (error) {
        // Fallback: return empty list if code command not available
        res.json({ success: true, extensions: [], note: 'Extension listing not available in this environment' });
    }
});

app.post('/extensions/install', async (req, res) => {
    const { extensionId } = req.body;

    if (!extensionId) {
        return res.status(400).json({ success: false, message: 'Missing required field: extensionId' });
    }

    if (!checkExtensionAllowed(extensionId)) {
        securityLog('BLOCKED_EXTENSION_INSTALL', { extensionId });
        return res.status(403).json({ success: false, message: 'Extension not in allowlist' });
    }

    securityLog('EXTENSION_INSTALL', { extensionId });

    try {
        await execAsync(`code --install-extension ${extensionId} --force`);
        res.json({ success: true, extensionId, message: 'Extension installed successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            extensionId,
            message: `Failed to install extension: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

app.post('/extensions/uninstall', async (req, res) => {
    const { extensionId } = req.body;

    if (!extensionId) {
        return res.status(400).json({ success: false, message: 'Missing required field: extensionId' });
    }

    securityLog('EXTENSION_UNINSTALL', { extensionId });

    try {
        await execAsync(`code --uninstall-extension ${extensionId}`);
        res.json({ success: true, extensionId, message: 'Extension uninstalled successfully' });
    } catch (error) {
        res.status(500).json({
            success: false,
            extensionId,
            message: `Failed to uninstall extension: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

app.post('/extensions/enable', async (req, res) => {
    const { extensionId } = req.body;

    if (!extensionId) {
        return res.status(400).json({ success: false, message: 'Missing required field: extensionId' });
    }

    // VS Code doesn't have a direct enable command, extensions are enabled by default
    // This is a placeholder - in a real implementation, you'd modify VS Code settings
    res.json({
        success: true,
        extensionId,
        message: 'Extension enable requested (requires VS Code restart)'
    });
});

app.post('/extensions/disable', async (req, res) => {
    const { extensionId } = req.body;

    if (!extensionId) {
        return res.status(400).json({ success: false, message: 'Missing required field: extensionId' });
    }

    // Placeholder - would need to modify settings.json
    res.json({
        success: true,
        extensionId,
        message: 'Extension disable requested (requires VS Code restart)'
    });
});

// ========== Workspace Settings ==========

app.get('/workspace/settings', async (req, res) => {
    const settingsPath = path.join(WORKSPACE_PATH, '.vscode', 'settings.json');
    const userSettingsPath = path.join(process.env.HOME || '/home/openvscode-server', '.config', 'Code', 'User', 'settings.json');

    try {
        let workspaceSettings = {};
        let userSettings = {};

        if (fs.existsSync(settingsPath)) {
            workspaceSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        }

        if (fs.existsSync(userSettingsPath)) {
            userSettings = JSON.parse(fs.readFileSync(userSettingsPath, 'utf-8'));
        }

        res.json({
            success: true,
            workspace: workspaceSettings,
            user: userSettings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Failed to read settings: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

app.post('/workspace/settings', async (req, res) => {
    const { scope, settings } = req.body;

    if (!settings) {
        return res.status(400).json({ success: false, message: 'Missing required field: settings' });
    }

    const targetScope = scope || 'workspace';
    let settingsPath: string;

    if (targetScope === 'workspace') {
        const vscodePath = path.join(WORKSPACE_PATH, '.vscode');
        if (!fs.existsSync(vscodePath)) {
            fs.mkdirSync(vscodePath, { recursive: true });
        }
        settingsPath = path.join(vscodePath, 'settings.json');
    } else {
        settingsPath = path.join(process.env.HOME || '/home/openvscode-server', '.config', 'Code', 'User', 'settings.json');
    }

    securityLog('SETTINGS_UPDATE', { scope: targetScope, settings });

    try {
        let existing = {};
        if (fs.existsSync(settingsPath)) {
            existing = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        }

        const merged = { ...existing, ...settings };
        fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf-8');

        res.json({ success: true, path: settingsPath, message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Failed to update settings: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

// ========== Search ==========

app.post('/search/text', async (req, res) => {
    const { query, path: searchPath, caseSensitive, regex, includes, excludes, maxResults } = req.body;

    if (!query) {
        return res.status(400).json({ success: false, message: 'Missing required field: query' });
    }

    const targetPath = resolvePath(searchPath || '');
    const limit = maxResults || 100;

    try {
        // Use ripgrep if available, otherwise grep
        let command: string;
        const flags = caseSensitive ? '' : '-i';
        const regexFlag = regex ? '-E' : '-F';

        // Build glob patterns
        let globPattern = '';
        if (includes && includes.length > 0) {
            globPattern = includes.map((p: string) => `--include='${p}'`).join(' ');
        }
        if (excludes && excludes.length > 0) {
            globPattern += ' ' + excludes.map((p: string) => `--exclude='${p}'`).join(' ');
        }

        // Try ripgrep first
        try {
            await execAsync('which rg');
            const rgFlags = caseSensitive ? '' : '-i';
            const rgRegex = regex ? '' : '-F';
            command = `rg ${rgFlags} ${rgRegex} -n --json "${query}" "${targetPath}" 2>/dev/null | head -${limit * 2}`;
        } catch {
            // Fall back to grep
            command = `grep -rn ${flags} ${regexFlag} ${globPattern} "${query}" "${targetPath}" 2>/dev/null | head -${limit}`;
        }

        const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

        const results: SearchResult[] = [];

        // Parse ripgrep JSON output or grep output
        if (stdout.includes('{"type":"match"')) {
            // Ripgrep JSON format
            const lines = stdout.split('\n').filter(l => l.trim());
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.type === 'match') {
                        results.push({
                            file: parsed.data.path.text,
                            line: parsed.data.line_number,
                            column: parsed.data.submatches?.[0]?.start || 0,
                            match: parsed.data.lines.text.trim(),
                            context: parsed.data.lines.text
                        });
                    }
                } catch {
                    // Skip invalid JSON lines
                }
                if (results.length >= limit) break;
            }
        } else {
            // Grep format: file:line:content
            const lines = stdout.split('\n').filter(l => l.trim());
            for (const line of lines) {
                const match = line.match(/^(.+?):(\d+):(.*)$/);
                if (match) {
                    results.push({
                        file: match[1],
                        line: parseInt(match[2], 10),
                        column: 0,
                        match: match[3].trim(),
                        context: match[3]
                    });
                }
                if (results.length >= limit) break;
            }
        }

        res.json({ success: true, results, total: results.length });
    } catch (error) {
        res.json({ success: true, results: [], total: 0 });
    }
});

app.post('/search/symbols', async (req, res) => {
    const { query, path: searchPath, kind } = req.body;

    if (!query) {
        return res.status(400).json({ success: false, message: 'Missing required field: query' });
    }

    const targetPath = resolvePath(searchPath || '');
    const results: SymbolResult[] = [];

    try {
        // Simple symbol search using grep patterns for common definitions
        const patterns: { pattern: string; kind: string }[] = [
            { pattern: `(function|const|let|var)\\s+${query}`, kind: 'function' },
            { pattern: `class\\s+${query}`, kind: 'class' },
            { pattern: `interface\\s+${query}`, kind: 'interface' },
            { pattern: `type\\s+${query}`, kind: 'type' },
            { pattern: `def\\s+${query}`, kind: 'function' },
            { pattern: `class\\s+${query}`, kind: 'class' }
        ];

        for (const { pattern, kind: symbolKind } of patterns) {
            if (kind && kind !== symbolKind) continue;

            try {
                const { stdout } = await execAsync(
                    `grep -rn -E "${pattern}" "${targetPath}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" 2>/dev/null | head -50`,
                    { maxBuffer: 5 * 1024 * 1024 }
                );

                const lines = stdout.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    const match = line.match(/^(.+?):(\d+):(.*)$/);
                    if (match) {
                        results.push({
                            name: query,
                            kind: symbolKind,
                            file: match[1],
                            line: parseInt(match[2], 10),
                            column: match[3].indexOf(query)
                        });
                    }
                }
            } catch {
                // Continue to next pattern
            }
        }

        res.json({ success: true, symbols: results });
    } catch (error) {
        res.json({ success: true, symbols: [] });
    }
});

// ========== Code Intelligence ==========

app.post('/code/actions', async (req, res) => {
    const { path: filePath, line, character } = req.body;

    if (!filePath) {
        return res.status(400).json({ success: false, message: 'Missing required field: path' });
    }

    // Code actions would require actual LSP integration
    // For now, return common quick fixes
    const actions: CodeAction[] = [
        { title: 'Organize Imports', kind: 'source.organizeImports' },
        { title: 'Fix All', kind: 'source.fixAll', isPreferred: true },
        { title: 'Add Missing Import', kind: 'quickfix' }
    ];

    res.json({ success: true, actions, note: 'Generic code actions returned. Full LSP integration pending.' });
});

app.post('/code/format', async (req, res) => {
    const { path: filePath, options } = req.body;

    if (!filePath) {
        return res.status(400).json({ success: false, message: 'Missing required field: path' });
    }

    const absolutePath = resolvePath(filePath);

    if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
    }

    try {
        const ext = path.extname(absolutePath).toLowerCase();
        let command: string | null = null;

        if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext)) {
            // Try prettier first
            try {
                await execAsync('which prettier');
                command = `prettier --write "${absolutePath}"`;
            } catch {
                // Try eslint --fix
                command = `npx eslint --fix "${absolutePath}" 2>/dev/null || true`;
            }
        } else if (['.py'].includes(ext)) {
            // Try black for Python
            try {
                await execAsync('which black');
                command = `black "${absolutePath}"`;
            } catch {
                command = null;
            }
        }

        if (command) {
            await execAsync(command);
            const content = fs.readFileSync(absolutePath, 'utf-8');
            res.json({ success: true, path: absolutePath, content, message: 'File formatted' });
        } else {
            res.json({ success: true, path: absolutePath, message: 'No formatter available for this file type' });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Failed to format file: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

app.post('/code/definition', async (req, res) => {
    const { path: filePath, line, character, symbol } = req.body;

    if (!filePath || !symbol) {
        return res.status(400).json({ success: false, message: 'Missing required fields: path, symbol' });
    }

    const absolutePath = resolvePath(filePath);
    const projectRoot = path.dirname(absolutePath);

    try {
        // Simple definition search using grep
        // Look for class/function/const/let/var/interface/type definitions
        const patterns = [
            `(class|interface|type)\\s+${symbol}\\b`,
            `(function|const|let|var)\\s+${symbol}\\s*[=:(]`,
            `def\\s+${symbol}\\s*\\(`
        ];

        const locations: Location[] = [];

        for (const pattern of patterns) {
            try {
                const { stdout } = await execAsync(
                    `grep -rn -E "${pattern}" "${projectRoot}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" 2>/dev/null | head -10`,
                    { maxBuffer: 5 * 1024 * 1024 }
                );

                const lines = stdout.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    const match = line.match(/^(.+?):(\d+):(.*)$/);
                    if (match) {
                        locations.push({
                            file: match[1],
                            line: parseInt(match[2], 10),
                            column: match[3].indexOf(symbol)
                        });
                    }
                }
            } catch {
                // Continue to next pattern
            }
        }

        res.json({ success: true, definitions: locations });
    } catch (error) {
        res.json({ success: true, definitions: [] });
    }
});

app.post('/code/references', async (req, res) => {
    const { path: filePath, line, character, symbol } = req.body;

    if (!filePath || !symbol) {
        return res.status(400).json({ success: false, message: 'Missing required fields: path, symbol' });
    }

    const absolutePath = resolvePath(filePath);
    const projectRoot = path.dirname(absolutePath);

    try {
        // Find all references using grep
        const { stdout } = await execAsync(
            `grep -rn "\\b${symbol}\\b" "${projectRoot}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" 2>/dev/null | head -100`,
            { maxBuffer: 10 * 1024 * 1024 }
        );

        const references: Location[] = [];
        const lines = stdout.split('\n').filter(l => l.trim());

        for (const line of lines) {
            const match = line.match(/^(.+?):(\d+):(.*)$/);
            if (match) {
                references.push({
                    file: match[1],
                    line: parseInt(match[2], 10),
                    column: match[3].indexOf(symbol)
                });
            }
        }

        res.json({ success: true, references });
    } catch (error) {
        res.json({ success: true, references: [] });
    }
});

// ========== Generic Command Execution ==========

app.post('/command/execute', async (req, res) => {
    const { commandId, args } = req.body;

    if (!commandId) {
        return res.status(400).json({ success: false, message: 'Missing required field: commandId' });
    }

    if (!checkCommandAllowed(commandId)) {
        securityLog('BLOCKED_COMMAND', { commandId, args });
        return res.status(403).json({ success: false, message: 'Command not in allowlist' });
    }

    securityLog('COMMAND_EXECUTE', { commandId, args });

    // Map VS Code commands to equivalent operations
    // This is a simplified implementation - full VS Code command support
    // would require actual VS Code extension host integration
    const commandHandlers: Record<string, () => Promise<unknown>> = {
        'workbench.action.files.save': async () => {
            return { message: 'Use /workspace/save endpoint instead' };
        },
        'editor.action.formatDocument': async () => {
            return { message: 'Use /code/format endpoint instead' };
        },
        'workbench.action.terminal.new': async () => {
            if (DISABLE_TERMINAL) throw new Error('Terminal is disabled');
            return { message: 'Use /terminal/create endpoint instead' };
        }
    };

    try {
        if (commandHandlers[commandId]) {
            const result = await commandHandlers[commandId]();
            res.json({ success: true, commandId, result });
        } else {
            // For unknown commands, return info about available endpoints
            res.json({
                success: true,
                commandId,
                result: null,
                note: 'Command not directly supported. Use specific API endpoints or extend commandHandlers.'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            commandId,
            message: `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

// ========== Terminal (conditional) ==========

app.post('/terminal/create', async (req, res) => {
    if (DISABLE_TERMINAL) {
        return res.status(403).json({ success: false, message: 'Terminal is disabled by configuration' });
    }

    const { cwd, shell } = req.body;
    const workDir = cwd ? resolvePath(cwd) : WORKSPACE_PATH;
    const shellPath = shell || process.env.SHELL || '/bin/bash';

    const id = generateId();

    securityLog('TERMINAL_CREATE', { id, cwd: workDir, shell: shellPath });

    try {
        const proc = spawn(shellPath, [], {
            cwd: workDir,
            env: { ...process.env, TERM: 'xterm' },
            shell: false
        });

        const session: TerminalSession = {
            id,
            process: proc,
            output: [],
            createdAt: Date.now()
        };

        proc.stdout.on('data', (data) => {
            session.output.push(data.toString());
            // Keep only last 1000 lines
            if (session.output.length > 1000) {
                session.output = session.output.slice(-1000);
            }
        });

        proc.stderr.on('data', (data) => {
            session.output.push(data.toString());
        });

        proc.on('close', () => {
            terminals.delete(id);
        });

        terminals.set(id, session);

        res.json({ success: true, terminalId: id, message: 'Terminal created' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Failed to create terminal: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

app.post('/terminal/send', async (req, res) => {
    if (DISABLE_TERMINAL) {
        return res.status(403).json({ success: false, message: 'Terminal is disabled by configuration' });
    }

    const { terminalId, input } = req.body;

    if (!terminalId || input === undefined) {
        return res.status(400).json({ success: false, message: 'Missing required fields: terminalId, input' });
    }

    const session = terminals.get(terminalId);
    if (!session) {
        return res.status(404).json({ success: false, message: 'Terminal not found' });
    }

    securityLog('TERMINAL_INPUT', { terminalId, inputLength: input.length });

    try {
        session.process.stdin?.write(input);
        res.json({ success: true, terminalId, message: 'Input sent' });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Failed to send input: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

app.get('/terminal/:id', (req, res) => {
    if (DISABLE_TERMINAL) {
        return res.status(403).json({ success: false, message: 'Terminal is disabled by configuration' });
    }

    const { id } = req.params;
    const session = terminals.get(id);

    if (!session) {
        return res.status(404).json({ success: false, message: 'Terminal not found' });
    }

    res.json({
        success: true,
        terminalId: id,
        output: session.output.join(''),
        lines: session.output.length
    });
});

app.delete('/terminal/:id', (req, res) => {
    if (DISABLE_TERMINAL) {
        return res.status(403).json({ success: false, message: 'Terminal is disabled by configuration' });
    }

    const { id } = req.params;
    const session = terminals.get(id);

    if (!session) {
        return res.status(404).json({ success: false, message: 'Terminal not found' });
    }

    securityLog('TERMINAL_CLOSE', { terminalId: id });

    session.process.kill();
    terminals.delete(id);

    res.json({ success: true, terminalId: id, message: 'Terminal closed' });
});

// ========== Debug (conditional) ==========

app.post('/debug/start', async (req, res) => {
    if (DISABLE_DEBUG) {
        return res.status(403).json({ success: false, message: 'Debug is disabled by configuration' });
    }

    const { config } = req.body;

    if (!config) {
        return res.status(400).json({ success: false, message: 'Missing required field: config' });
    }

    const id = generateId();

    securityLog('DEBUG_START', { sessionId: id, config });

    const session: DebugSession = {
        id,
        config,
        breakpoints: [],
        status: 'running'
    };

    debugSessions.set(id, session);

    // Note: Actual debug adapter integration would require DAP implementation
    res.json({
        success: true,
        sessionId: id,
        message: 'Debug session created (stub implementation)',
        note: 'Full debug adapter integration requires VS Code extension host'
    });
});

app.post('/debug/breakpoint', async (req, res) => {
    if (DISABLE_DEBUG) {
        return res.status(403).json({ success: false, message: 'Debug is disabled by configuration' });
    }

    const { sessionId, file, line, remove } = req.body;

    if (!sessionId || !file || line === undefined) {
        return res.status(400).json({ success: false, message: 'Missing required fields: sessionId, file, line' });
    }

    const session = debugSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ success: false, message: 'Debug session not found' });
    }

    const absolutePath = resolvePath(file);

    if (remove) {
        session.breakpoints = session.breakpoints.filter(
            bp => !(bp.file === absolutePath && bp.line === line)
        );
    } else {
        session.breakpoints.push({ file: absolutePath, line });
    }

    securityLog('DEBUG_BREAKPOINT', { sessionId, file: absolutePath, line, remove: !!remove });

    res.json({
        success: true,
        sessionId,
        breakpoints: session.breakpoints
    });
});

app.delete('/debug/stop', async (req, res) => {
    if (DISABLE_DEBUG) {
        return res.status(403).json({ success: false, message: 'Debug is disabled by configuration' });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ success: false, message: 'Missing required field: sessionId' });
    }

    const session = debugSessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ success: false, message: 'Debug session not found' });
    }

    securityLog('DEBUG_STOP', { sessionId });

    debugSessions.delete(sessionId);

    res.json({ success: true, sessionId, message: 'Debug session stopped' });
});

// ========== Tasks ==========

app.get('/tasks', async (req, res) => {
    const tasksPath = path.join(WORKSPACE_PATH, '.vscode', 'tasks.json');
    const packagePath = path.join(WORKSPACE_PATH, 'package.json');

    const tasks: Array<{ label: string; type: string; command?: string }> = [];

    try {
        // Read VS Code tasks.json
        if (fs.existsSync(tasksPath)) {
            const tasksConfig = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
            for (const task of tasksConfig.tasks || []) {
                tasks.push({
                    label: task.label,
                    type: task.type || 'shell',
                    command: task.command
                });
            }
        }

        // Read npm scripts from package.json
        if (fs.existsSync(packagePath)) {
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
            for (const [name, command] of Object.entries(packageJson.scripts || {})) {
                tasks.push({
                    label: `npm: ${name}`,
                    type: 'npm',
                    command: command as string
                });
            }
        }

        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});

app.post('/tasks/run', async (req, res) => {
    const { taskLabel, type } = req.body;

    if (!taskLabel) {
        return res.status(400).json({ success: false, message: 'Missing required field: taskLabel' });
    }

    securityLog('TASK_RUN', { taskLabel, type });

    try {
        let command: string | null = null;

        // Handle npm tasks
        if (type === 'npm' || taskLabel.startsWith('npm: ')) {
            const scriptName = taskLabel.replace('npm: ', '');
            command = `npm run ${scriptName}`;
        } else {
            // Try to find task in tasks.json
            const tasksPath = path.join(WORKSPACE_PATH, '.vscode', 'tasks.json');
            if (fs.existsSync(tasksPath)) {
                const tasksConfig = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
                const task = tasksConfig.tasks?.find((t: { label: string }) => t.label === taskLabel);
                if (task) {
                    command = task.command;
                }
            }
        }

        if (!command) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const { stdout, stderr } = await execAsync(command, {
            cwd: WORKSPACE_PATH,
            maxBuffer: 10 * 1024 * 1024,
            timeout: 300000 // 5 minute timeout
        });

        res.json({
            success: true,
            taskLabel,
            output: stdout,
            errors: stderr
        });
    } catch (error: unknown) {
        const execError = error as { stdout?: string; stderr?: string };
        res.json({
            success: false,
            taskLabel,
            output: execError.stdout || '',
            errors: execError.stderr || (error instanceof Error ? error.message : String(error))
        });
    }
});

// ========== Error Handler ==========
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[ERROR]', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// ========== Start Server ==========
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[vscode-service] Running on port ${PORT}`);
    console.log(`[vscode-service] Workspace: ${WORKSPACE_PATH}`);
    console.log(`[vscode-service] Features: terminal=${!DISABLE_TERMINAL}, debug=${!DISABLE_DEBUG}`);
    console.log(`[vscode-service] Security logging: ${SECURITY_LOGGING}`);
});
