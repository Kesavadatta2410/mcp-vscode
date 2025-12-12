import { useState, useCallback } from 'react';
import FileTree from './components/FileTree';
import MonacoEditor from './components/MonacoEditor';
import ExecutionPanel from './components/ExecutionPanel';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import mcpClient from './services/mcpClient';
import type { DiagnosticItem } from './types';
import { FaSave, FaPlay, FaBug } from 'react-icons/fa';
import { VscCode } from 'react-icons/vsc';

function App() {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [originalContent, setOriginalContent] = useState<string>('');
    const [isModified, setIsModified] = useState(false);
    const [showExecutionPanel, setShowExecutionPanel] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFileSelect = useCallback(async (path: string) => {
        if (path === selectedFile) return;

        // Warn if current file is modified
        if (isModified) {
            const confirmDiscard = window.confirm(
                'You have unsaved changes. Do you want to discard them?'
            );
            if (!confirmDiscard) return;
        }

        setLoading(true);
        const response = await mcpClient.readFile(path);

        if (response.success && response.data) {
            setSelectedFile(path);
            setFileContent(response.data.content);
            setOriginalContent(response.data.content);
            setIsModified(false);

            // Load diagnostics for the file
            loadDiagnostics(path);
        } else {
            console.error('Failed to load file:', response.error);
            alert(`Failed to load file: ${response.error?.message}`);
        }

        setLoading(false);
    }, [selectedFile, isModified]);

    const loadDiagnostics = async (filePath?: string) => {
        const response = await mcpClient.getDiagnostics(filePath);

        if (response.success && response.data) {
            // Parse diagnostics from response
            const parsedDiagnostics: DiagnosticItem[] = [];

            if (Array.isArray(response.data)) {
                response.data.forEach((diag: any) => {
                    parsedDiagnostics.push({
                        file: diag.file || filePath || '',
                        line: diag.line || diag.range?.start?.line || 0,
                        column: diag.column || diag.range?.start?.character || 0,
                        severity: diag.severity || 'error',
                        message: diag.message || '',
                        source: diag.source || 'Unknown',
                    });
                });
            }

            setDiagnostics(parsedDiagnostics);
        }
    };

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            setFileContent(value);
            setIsModified(value !== originalContent);
        }
    };

    const handleSave = async () => {
        if (!selectedFile || !isModified) return;

        setSaving(true);
        const response = await mcpClient.writeFile(selectedFile, fileContent);

        if (response.success) {
            setOriginalContent(fileContent);
            setIsModified(false);

            // Reload diagnostics after save
            await loadDiagnostics(selectedFile);
        } else {
            console.error('Failed to save file:', response.error);
            alert(`Failed to save file: ${response.error?.message}`);
        }

        setSaving(false);
    };

    const handleDiagnosticClick = (file: string, line: number) => {
        // TODO: Jump to line in editor
        console.log('Jump to', file, line);
    };

    const handleRun = () => {
        if (selectedFile) {
            setShowExecutionPanel(true);
        }
    };

    const canRun = selectedFile?.endsWith('.py') || selectedFile?.endsWith('.js');

    // Auto-save on Ctrl+S is handled in Monaco editor

    return (
        <div className="h-screen flex flex-col bg-vscode-bg text-vscode-text">
            {/* Title Bar */}
            <div className="h-12 bg-vscode-sidebar border-b border-vscode-border flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <VscCode size={24} className="text-blue-500" />
                    <span className="font-semibold">MCP VS Code Web</span>
                    {selectedFile && (
                        <>
                            <span className="text-gray-400">—</span>
                            <span className="text-sm text-gray-400">{selectedFile}</span>
                            {isModified && <span className="text-sm text-yellow-500">●</span>}
                        </>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={!isModified || saving}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded"
                        title="Save (Ctrl+S)"
                    >
                        <FaSave />
                        {saving ? 'Saving...' : 'Save'}
                    </button>

                    <button
                        onClick={handleRun}
                        disabled={!canRun}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded"
                        title="Run file"
                    >
                        <FaPlay size={10} />
                        Run
                    </button>

                    <button
                        onClick={() => setShowDiagnostics(!showDiagnostics)}
                        className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${showDiagnostics ? 'bg-vscode-active' : 'hover:bg-vscode-active'
                            }`}
                        title="Toggle diagnostics"
                    >
                        <FaBug />
                        Problems ({diagnostics.length})
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* File Tree Sidebar */}
                <div className="w-64 border-r border-vscode-border overflow-hidden">
                    <FileTree
                        onFileSelect={handleFileSelect}
                        selectedFile={selectedFile}
                    />
                </div>

                {/* Editor Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Editor */}
                    <div className={`${showExecutionPanel || showDiagnostics ? 'h-2/3' : 'h-full'} border-b border-vscode-border`}>
                        {selectedFile ? (
                            loading ? (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    Loading...
                                </div>
                            ) : (
                                <MonacoEditor
                                    value={fileContent}
                                    path={selectedFile}
                                    onChange={handleEditorChange}
                                    onSave={handleSave}
                                />
                            )
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <div className="text-center">
                                    <VscCode size={64} className="mx-auto mb-4 opacity-50" />
                                    <p>Select a file from the explorer to start editing</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Panels */}
                    {(showExecutionPanel || showDiagnostics) && (
                        <div className="h-1/3 flex">
                            {showExecutionPanel && (
                                <div className={`${showDiagnostics ? 'w-1/2' : 'w-full'} border-r border-vscode-border`}>
                                    <ExecutionPanel
                                        filePath={selectedFile}
                                        onClose={() => setShowExecutionPanel(false)}
                                    />
                                </div>
                            )}

                            {showDiagnostics && (
                                <div className={showExecutionPanel ? 'w-1/2' : 'w-full'}>
                                    <DiagnosticsPanel
                                        diagnostics={diagnostics}
                                        onDiagnosticClick={handleDiagnosticClick}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-vscode-panel border-t border-vscode-border flex items-center justify-between px-4 text-xs">
                <div className="flex items-center gap-4">
                    <span>
                        {selectedFile ? `Ln 1, Col 1` : 'Ready'}
                    </span>
                    {selectedFile && (
                        <span className="text-gray-400">
                            {selectedFile.split('.').pop()?.toUpperCase()}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-gray-400">
                        MCP Connected
                    </span>
                </div>
            </div>
        </div>
    );
}

export default App;
