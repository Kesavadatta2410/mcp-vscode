/**
 * Type definitions for VS Code MCP Server
 * Extended types for full VS Code functionality
 */

// ========== Core Types ==========

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface Diagnostic {
    file: string;
    range: Range;
    severity: DiagnosticSeverity;
    message: string;
    source?: string;
    code?: string | number;
}

// ========== Response Types ==========

export interface BaseResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export interface DiagnosticsResponse extends BaseResponse {
    diagnostics: Diagnostic[];
    summary: {
        totalErrors: number;
        totalWarnings: number;
        totalInfo: number;
        totalHints: number;
        totalFiles: number;
    };
}

export interface OpenFileResponse extends BaseResponse {
    path: string;
}

export interface CloseFileResponse extends BaseResponse {
    path: string;
}

export interface SaveFileResponse extends BaseResponse {
    path: string;
}

export interface HealthResponse {
    status: 'ok' | 'error';
    version: string;
    uptime: number;
    workspace?: string;
    features?: {
        terminal: boolean;
        debug: boolean;
        extensions: boolean;
        search: boolean;
        codeIntelligence: boolean;
    };
}

// ========== Extension Types ==========

export interface Extension {
    id: string;
    name: string;
    version: string;
    enabled: boolean;
    description?: string;
}

export interface ExtensionListResponse extends BaseResponse {
    extensions: Extension[];
    note?: string;
}

export interface ExtensionOperationResponse extends BaseResponse {
    extensionId: string;
}

// ========== Workspace Types ==========

export interface OpenFilesResponse extends BaseResponse {
    files: string[];
}

export interface SettingsResponse extends BaseResponse {
    workspace: Record<string, unknown>;
    user: Record<string, unknown>;
}

export interface SettingsUpdateResponse extends BaseResponse {
    path: string;
}

// ========== Search Types ==========

export interface SearchResult {
    file: string;
    line: number;
    column: number;
    match: string;
    context?: string;
}

export interface TextSearchResponse extends BaseResponse {
    results: SearchResult[];
    total: number;
}

export interface SymbolResult {
    name: string;
    kind: string;
    file: string;
    line: number;
    column: number;
}

export interface SymbolSearchResponse extends BaseResponse {
    symbols: SymbolResult[];
}

// ========== Code Intelligence Types ==========

export interface CodeAction {
    title: string;
    kind: string;
    isPreferred?: boolean;
}

export interface CodeActionsResponse extends BaseResponse {
    actions: CodeAction[];
    note?: string;
}

export interface FormatResponse extends BaseResponse {
    path: string;
    content?: string;
}

export interface Location {
    file: string;
    line: number;
    column: number;
}

export interface DefinitionResponse extends BaseResponse {
    definitions: Location[];
}

export interface ReferencesResponse extends BaseResponse {
    references: Location[];
}

// ========== Command Execution Types ==========

export interface CommandExecuteResponse extends BaseResponse {
    commandId: string;
    result?: unknown;
    note?: string;
}

// ========== Terminal Types ==========

export interface TerminalCreateResponse extends BaseResponse {
    terminalId: string;
}

export interface TerminalSendResponse extends BaseResponse {
    terminalId: string;
}

export interface TerminalReadResponse extends BaseResponse {
    terminalId: string;
    output: string;
    lines: number;
}

export interface TerminalCloseResponse extends BaseResponse {
    terminalId: string;
}

// ========== Debug Types ==========

export interface DebugStartResponse extends BaseResponse {
    sessionId: string;
    note?: string;
}

export interface Breakpoint {
    file: string;
    line: number;
}

export interface DebugBreakpointResponse extends BaseResponse {
    sessionId: string;
    breakpoints: Breakpoint[];
}

export interface DebugStopResponse extends BaseResponse {
    sessionId: string;
}

// ========== Task Types ==========

export interface Task {
    label: string;
    type: string;
    command?: string;
}

export interface TaskListResponse extends BaseResponse {
    tasks: Task[];
}

export interface TaskRunResponse extends BaseResponse {
    taskLabel: string;
    output?: string;
    errors?: string;
}
