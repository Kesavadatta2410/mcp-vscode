/**
 * Editor Tabs Component
 * VS Code-style tab bar for open files
 */

import React from 'react';
import { VscClose, VscCircleFilled } from 'react-icons/vsc';

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
}

const EditorTabs: React.FC<EditorTabsProps> = ({
    tabs,
    activeTab,
    onTabSelect,
    onTabClose,
}) => {
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
        <div className="flex items-center bg-vscode-editor border-b border-vscode-border overflow-x-auto">
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
    );
};

export default EditorTabs;
