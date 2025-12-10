/**
 * Type definitions for code execution
 */

export interface ExecRequest {
    /** Python or JavaScript code string (for snippet execution) */
    code?: string;

    /** Path to script file (for file execution) */
    path?: string;

    /** Arguments - object for snippets (JSON), string array for files */
    args?: string[] | object;

    /** Timeout in seconds (default from config) */
    timeoutSeconds?: number;

    /** Working directory (defaults to PROJECT_PATH) */
    workingDirectory?: string;
}

export interface ExecResult {
    /** Whether execution completed successfully (exit code 0) */
    success: boolean;

    /** Standard output captured from the process */
    stdout: string;

    /** Standard error captured from the process */
    stderr: string;

    /** Process exit code */
    exitCode: number;

    /** Execution duration in milliseconds */
    durationMs: number;

    /** Whether the process was killed due to timeout */
    timedOut: boolean;

    /** Whether output was truncated due to size limits */
    truncated?: boolean;

    /** Error details if execution failed */
    error?: ExecError;
}

export interface ExecError {
    /** Type of error that occurred */
    type: 'MissingExecutable' | 'PathNotAllowed' | 'ExecutionFailed' | 'Timeout' | 'ConfigDisabled';

    /** Human-readable error message */
    message: string;

    /** Executable name if missing */
    executable?: string;

    /** Path that was not allowed */
    path?: string;
}

export interface ExecConfig {
    /** Whether code execution is enabled */
    enabled: boolean;

    /** Path to Python executable */
    pythonExecutable: string;

    /** Path to Node.js executable */
    nodeExecutable: string;

    /** Default timeout in seconds */
    defaultTimeoutSeconds: number;

    /** Maximum timeout in seconds */
    maxTimeoutSeconds: number;

    /** Maximum output size in bytes */
    maxOutputBytes: number;

    /** Directories where code execution is allowed */
    allowedDirectories: string[];

    /** Default working directory */
    defaultWorkingDirectory: string;
}

export interface ProcessOptions {
    /** Executable command */
    executable: string;

    /** Command arguments */
    args: string[];

    /** Working directory */
    cwd: string;

    /** Environment variables */
    env?: Record<string, string>;

    /** Timeout in milliseconds */
    timeoutMs: number;

    /** Maximum output bytes */
    maxOutputBytes: number;

    /** Input to send to stdin */
    input?: string;
}

export interface ProcessResult {
    /** Standard output */
    stdout: string;

    /** Standard error */
    stderr: string;

    /** Exit code */
    exitCode: number;

    /** Duration in milliseconds */
    durationMs: number;

    /** Whether timeout occurred */
    timedOut: boolean;

    /** Whether output was truncated */
    truncated: boolean;
}
