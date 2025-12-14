/**
 * Main Application - VS Code Clone Layout
 * Full VS Code-like layout with activity bar, sidebar, editor, and panels
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import FileTree from './components/FileTree';
import MonacoEditor from './components/MonacoEditor';
import ExecutionPanel from './components/ExecutionPanel';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import GitPanel from './components/GitPanel';
import SearchPanel from './components/SearchPanel';
import SettingsPanel from './components/SettingsPanel';
// AssistantPanel kept for reference but AiChatPanel is now primary
import TerminalPane from './components/TerminalPane';
import ActivityBar, { PanelType } from './components/ActivityBar';
import EditorTabs, { EditorTab } from './components/EditorTabs';
import CommandPalette, { CommandItem } from './components/CommandPalette';
import PortsPanel from './components/PortsPanel';
// PreviewPanel available for future implementation
import AiChatPanel from './components/AiChatPanel';
import mcpClient from './services/mcpClient';
import type { DiagnosticItem } from './types';
import { VscCode, VscError, VscWarning } from 'react-icons/vsc';

function App() {
    // Layout state
    const [activePanel, setActivePanel] = useState<PanelType>('explorer');
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [bottomPanelVisible, setBottomPanelVisible] = useState(false);
    const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'problems' | 'output'>('terminal');
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    // Editor state
    const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
    const [originalContents, setOriginalContents] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Diagnostics
    const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);

    // File tree refresh trigger
    const [fileTreeKey, setFileTreeKey] = useState(0);
    const refreshFileTree = useCallback(() => {
        setFileTreeKey(k => k + 1);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+Shift+P - Command Palette
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }
            // Ctrl+S - Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
            // Ctrl+P - Quick Open
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }
            // Ctrl+B - Toggle Sidebar
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                setSidebarVisible((v) => !v);
            }
            // Ctrl+` - Toggle Terminal/Bottom Panel
            if ((e.ctrlKey || e.metaKey) && e.key === '`') {
                e.preventDefault();
                setBottomPanelVisible((v) => !v);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeFile]);

    // File selection handler
    const handleFileSelect = useCallback(async (path: string) => {
        // Check if already open
        const existingTab = openTabs.find((t) => t.path === path);
        if (existingTab) {
            setActiveFile(path);
            return;
        }

        setLoading(true);
        const response = await mcpClient.readFile(path);

        if (response.success && response.data) {
            const content = response.data.content;
            const fileName = path.split('/').pop() || path.split('\\').pop() || path;

            // Add new tab
            setOpenTabs((tabs) => [
                ...tabs,
                { path, name: fileName, isModified: false },
            ]);

            // Store content
            setFileContents((prev) => new Map(prev).set(path, content));
            setOriginalContents((prev) => new Map(prev).set(path, content));
            setActiveFile(path);

            // Load diagnostics
            loadDiagnostics(path);
        } else {
            console.error('Failed to load file:', response.error);
        }

        setLoading(false);
    }, [openTabs]);

    // Tab management
    const handleTabClose = useCallback((path: string) => {
        const tab = openTabs.find((t) => t.path === path);
        if (tab?.isModified) {
            if (!window.confirm('You have unsaved changes. Close anyway?')) {
                return;
            }
        }

        const newTabs = openTabs.filter((t) => t.path !== path);
        setOpenTabs(newTabs);

        // Clean up content
        setFileContents((prev) => {
            const next = new Map(prev);
            next.delete(path);
            return next;
        });
        setOriginalContents((prev) => {
            const next = new Map(prev);
            next.delete(path);
            return next;
        });

        // Switch to another tab if closing active
        if (activeFile === path) {
            setActiveFile(newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null);
        }
    }, [openTabs, activeFile]);

    // Editor change handler
    const handleEditorChange = useCallback((value: string | undefined) => {
        if (value !== undefined && activeFile) {
            setFileContents((prev) => new Map(prev).set(activeFile, value));

            const original = originalContents.get(activeFile);
            const isModified = value !== original;

            setOpenTabs((tabs) =>
                tabs.map((t) =>
                    t.path === activeFile ? { ...t, isModified } : t
                )
            );
        }
    }, [activeFile, originalContents]);

    // Save handler
    const handleSave = useCallback(async () => {
        if (!activeFile) return;

        const content = fileContents.get(activeFile);
        if (content === undefined) return;

        setSaving(true);
        const response = await mcpClient.writeFile(activeFile, content);

        if (response.success) {
            setOriginalContents((prev) => new Map(prev).set(activeFile, content));
            setOpenTabs((tabs) =>
                tabs.map((t) =>
                    t.path === activeFile ? { ...t, isModified: false } : t
                )
            );
            await loadDiagnostics(activeFile);
        } else {
            console.error('Failed to save file:', response.error);
        }

        setSaving(false);
    }, [activeFile, fileContents]);

    // Diagnostics loader
    const loadDiagnostics = async (filePath?: string) => {
        const response = await mcpClient.getDiagnostics(filePath);

        if (response.success && response.data) {
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

    // Handle diagnostic click
    const handleDiagnosticClick = (file: string, _line: number) => {
        handleFileSelect(file);
        // TODO: Jump to line in editor
    };

    // Handle AI action execution
    const handleExecuteAction = useCallback(async (action: any) => {
        try {
            const response = await mcpClient.callTool(action.server, action.tool, action.args);
            if (response.success) {
                // Refresh file tree after file operations
                if (['write_file', 'delete_file', 'create_folder'].includes(action.tool)) {
                    // FileTree will auto-refresh, but we can trigger loadDiagnostics
                    loadDiagnostics();
                }
                return response.data;
            } else {
                throw new Error(response.error?.message || 'Action failed');
            }
        } catch (error: any) {
            console.error('Execute action error:', error);
            throw error;
        }
    }, [loadDiagnostics]);

    // Note: handleApplyDiff can be restored when AI diff integration is needed

    // Command palette commands
    const commands: CommandItem[] = useMemo(() => [
        {
            id: 'file.save',
            label: 'Save File',
            category: 'File',
            keybinding: 'Ctrl+S',
            action: handleSave,
        },
        {
            id: 'view.toggleSidebar',
            label: 'Toggle Sidebar',
            category: 'View',
            keybinding: 'Ctrl+B',
            action: () => setSidebarVisible((v) => !v),
        },
        {
            id: 'view.toggleTerminal',
            label: 'Toggle Terminal',
            category: 'View',
            keybinding: 'Ctrl+`',
            action: () => setBottomPanelVisible((v) => !v),
        },
        {
            id: 'view.explorer',
            label: 'Show Explorer',
            category: 'View',
            action: () => { setActivePanel('explorer'); setSidebarVisible(true); },
        },
        {
            id: 'view.search',
            label: 'Show Search',
            category: 'View',
            action: () => { setActivePanel('search'); setSidebarVisible(true); },
        },
        {
            id: 'view.git',
            label: 'Show Source Control',
            category: 'View',
            action: () => { setActivePanel('git'); setSidebarVisible(true); },
        },
        {
            id: 'view.ai',
            label: 'Show AI Assistant',
            category: 'View',
            action: () => { setActivePanel('ai'); setSidebarVisible(true); },
        },
        {
            id: 'view.settings',
            label: 'Open Settings',
            category: 'Preferences',
            action: () => { setActivePanel('settings'); setSidebarVisible(true); },
        },
        {
            id: 'view.problems',
            label: 'Show Problems',
            category: 'View',
            action: () => { setBottomPanelVisible(true); setBottomPanelTab('problems'); },
        },
    ], [handleSave]);

    // Current file content
    const currentContent = activeFile ? fileContents.get(activeFile) || '' : '';

    // Count diagnostics
    const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
    const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

    return (
        <div className="h-screen flex flex-col bg-vscode-bg text-vscode-text overflow-hidden">
            {/* Command Palette */}
            <CommandPalette
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
                commands={commands}
            />

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Activity Bar */}
                <ActivityBar
                    activePanel={activePanel}
                    onPanelChange={(panel) => {
                        if (activePanel === panel && sidebarVisible) {
                            setSidebarVisible(false);
                        } else {
                            setActivePanel(panel);
                            setSidebarVisible(true);
                        }
                    }}
                    bottomPanelVisible={bottomPanelVisible}
                    onToggleBottomPanel={() => setBottomPanelVisible((v) => !v)}
                />

                {/* Sidebar */}
                {sidebarVisible && (
                    <div className="w-72 flex-shrink-0 bg-vscode-sidebar border-r border-vscode-border overflow-hidden flex flex-col">
                        {/* Sidebar content based on active panel */}
                        {activePanel === 'explorer' && (
                            <FileTree
                                key={fileTreeKey}
                                onFileSelect={handleFileSelect}
                                selectedFile={activeFile}
                            />
                        )}
                        {activePanel === 'search' && <SearchPanel onFileSelect={handleFileSelect} />}
                        {activePanel === 'git' && <GitPanel />}
                        {activePanel === 'ai' && (
                            <AiChatPanel
                                currentFile={activeFile}
                                onExecuteAction={handleExecuteAction}
                                onRefreshFileTree={refreshFileTree}
                            />
                        )}
                        {activePanel === 'settings' && <SettingsPanel />}
                        {activePanel === 'extensions' && (
                            <div className="p-4 text-gray-400">
                                <h2 className="text-sm font-semibold text-white mb-4">Extensions</h2>
                                <p className="text-xs">Extension management coming soon...</p>
                            </div>
                        )}
                        {activePanel === 'debug' && (
                            <div className="p-4 text-gray-400">
                                <h2 className="text-sm font-semibold text-white mb-4">Run and Debug</h2>
                                <p className="text-xs">Debug features coming soon...</p>
                            </div>
                        )}
                        {activePanel === 'ports' && <PortsPanel />}
                    </div>
                )}

                {/* Editor + Bottom Panel Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Editor Area */}
                    <div className={`flex-1 flex flex-col overflow-hidden ${bottomPanelVisible ? 'h-2/3' : 'h-full'}`}>
                        {/* Editor Tabs */}
                        <EditorTabs
                            tabs={openTabs}
                            activeTab={activeFile}
                            onTabSelect={setActiveFile}
                            onTabClose={handleTabClose}
                        />

                        {/* Monaco Editor */}
                        <div className="flex-1 overflow-hidden">
                            {activeFile ? (
                                loading ? (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                        <span className="ml-2">Loading...</span>
                                    </div>
                                ) : (
                                    <MonacoEditor
                                        value={currentContent}
                                        path={activeFile}
                                        onChange={handleEditorChange}
                                        onSave={handleSave}
                                    />
                                )
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <div className="text-center">
                                        <VscCode size={80} className="mx-auto mb-6 opacity-30" />
                                        <h2 className="text-xl font-light mb-4">MCP VS Code Web</h2>
                                        <div className="text-sm space-y-2">
                                            <p>Open a file from the Explorer to get started</p>
                                            <p className="text-xs text-gray-600">
                                                Press <kbd className="px-2 py-0.5 bg-vscode-editor rounded text-gray-400">Ctrl+Shift+P</kbd> for Command Palette
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Panel */}
                    {bottomPanelVisible && (
                        <div className="h-1/3 min-h-[150px] border-t border-vscode-border flex flex-col">
                            {/* Panel tabs */}
                            <div className="flex items-center bg-vscode-sidebar border-b border-vscode-border px-2">
                                <button
                                    className={`px-4 py-2 text-sm ${bottomPanelTab === 'problems' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}
                                    onClick={() => setBottomPanelTab('problems')}
                                >
                                    Problems
                                    {(errorCount + warningCount > 0) && (
                                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-vscode-active rounded">
                                            {errorCount + warningCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    className={`px-4 py-2 text-sm ${bottomPanelTab === 'terminal' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}
                                    onClick={() => setBottomPanelTab('terminal')}
                                >
                                    Terminal
                                </button>
                                <button
                                    className={`px-4 py-2 text-sm ${bottomPanelTab === 'output' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400'}`}
                                    onClick={() => setBottomPanelTab('output')}
                                >
                                    Output
                                </button>
                                <div className="flex-1" />
                                <button
                                    className="p-1 hover:bg-vscode-active rounded text-gray-400 hover:text-white"
                                    onClick={() => setBottomPanelVisible(false)}
                                >
                                    ×
                                </button>
                            </div>

                            {/* Panel content */}
                            <div className="flex-1 overflow-hidden">
                                {bottomPanelTab === 'problems' && (
                                    <DiagnosticsPanel
                                        diagnostics={diagnostics}
                                        onDiagnosticClick={handleDiagnosticClick}
                                    />
                                )}
                                {bottomPanelTab === 'terminal' && (
                                    <TerminalPane />
                                )}
                                {bottomPanelTab === 'output' && (
                                    <ExecutionPanel
                                        filePath={activeFile}
                                        onClose={() => { }}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-blue-600 flex items-center justify-between px-3 text-xs text-white">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                        <VscCode size={14} />
                        MCP Connected
                    </span>
                    {activeFile && (
                        <span>{activeFile.split('/').pop() || activeFile.split('\\').pop()}</span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Errors and Warnings */}
                    <span className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <VscError size={12} />
                            {errorCount}
                        </span>
                        <span className="flex items-center gap-1">
                            <VscWarning size={12} />
                            {warningCount}
                        </span>
                    </span>

                    {/* Save indicator */}
                    {saving && (
                        <span className="flex items-center gap-1">
                            <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
                            Saving...
                        </span>
                    )}

                    {/* File type */}
                    {activeFile && (
                        <span className="uppercase">
                            {activeFile.split('.').pop() || 'txt'}
                        </span>
                    )}

                    <span>Ln 1, Col 1</span>
                    <span>UTF-8</span>
                </div>
            </div>
        </div>
    );
}

export default App;
