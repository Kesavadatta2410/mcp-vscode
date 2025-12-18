/**
 * Editor Tabs Component
 * VS Code-style tab bar for open files with Run and Save buttons
 */

import React from 'react';
import { VscClose, VscCircleFilled, VscPlay, VscSave } from 'react-icons/vsc';

export interface EditorTab {
    path: string;
    name: string;
    isModified: boolean;
}

interface EditorTabsProps {
    tabs: EditorTab[];
    activeTab: string | null;
    onTabSelect: (path: string) => void;
    onTabClose: (path: string) => void;
    onRun?: () => void;
    onSave?: () => void;
}

const EditorTabs: React.FC<EditorTabsProps> = ({
    tabs,
    activeTab,
    onTabSelect,
    onTabClose,
    onRun,
    onSave,
}) => {
    // Check if active file is runnable
    const isRunnable = activeTab && (activeTab.endsWith('.py') || activeTab.endsWith('.js') || activeTab.endsWith('.ts'));
    const hasModifiedTabs = tabs.some(t => t.isModified);

    if (tabs.length === 0) {
        return null;
    }

    const getFileIcon = (name: string): string => {
        const ext = name.split('.').pop()?.toLowerCase();
        const iconMap: Record<string, string> = {
            ts: '🔷',
            tsx: '⚛️',
            js: '🟨',
            jsx: '⚛️',
            py: '🐍',
            json: '📋',
            md: '📝',
            css: '🎨',
            html: '🌐',
            yml: '⚙️',
            yaml: '⚙️',
            sh: '🖥️',
            bat: '🖥️',
            git: '📂',
        };
        return iconMap[ext || ''] || '📄';
    };

    return (
        <div className="flex items-center bg-vscode-editor border-b border-vscode-border">
            {/* Tabs */}
            <div className="flex-1 flex items-center overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = tab.path === activeTab;
                    return (
                        <div
                            key={tab.path}
                            className={`
                                group flex items-center gap-2 px-3 py-2 
                                border-r border-vscode-border cursor-pointer
                                transition-colors duration-100
                                ${isActive
                                    ? 'bg-vscode-bg text-white border-t-2 border-t-blue-500'
                                    : 'bg-vscode-editor text-gray-400 border-t-2 border-t-transparent hover:bg-vscode-sidebar'
                                }
                            `}
                            onClick={() => onTabSelect(tab.path)}
                        >
                            <span className="text-sm">{getFileIcon(tab.name)}</span>
                            <span className="text-sm whitespace-nowrap">{tab.name}</span>

                            {/* Modified indicator or close button */}
                            <button
                                className={`
                                    w-4 h-4 flex items-center justify-center rounded
                                    transition-all duration-100
                                    ${tab.isModified
                                        ? 'text-white'
                                        : 'opacity-0 group-hover:opacity-100 hover:bg-vscode-active'
                                    }
                                `}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTabClose(tab.path);
                                }}
                                title={tab.isModified ? 'Unsaved changes' : 'Close'}
                            >
                                {tab.isModified ? (
                                    <VscCircleFilled size={8} />
                                ) : (
                                    <VscClose size={14} />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons - Right Side */}
            <div className="flex items-center gap-1 px-2 border-l border-vscode-border">
                {/* Save Button */}
                {onSave && hasModifiedTabs && (
                    <button
                        onClick={onSave}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                        title="Save (Ctrl+S)"
                    >
                        <VscSave size={14} />
                        <span>Save</span>
                    </button>
                )}

                {/* Run Button */}
                {onRun && isRunnable && (
                    <button
                        onClick={onRun}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
                        title="Run File"
                    >
                        <VscPlay size={14} />
                        <span>Run</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default EditorTabs;
