import React, { useState } from 'react';
import type { DiagnosticItem } from '@/types';
import { FaExclamationCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';

interface DiagnosticsPanelProps {
    diagnostics: DiagnosticItem[];
    onDiagnosticClick: (file: string, line: number) => void;
}

const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({ diagnostics, onDiagnosticClick }) => {
    const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

    const getIcon = (severity: string) => {
        switch (severity) {
            case 'error':
                return <FaExclamationCircle className="text-red-500" />;
            case 'warning':
                return <FaExclamationTriangle className="text-yellow-500" />;
            case 'info':
                return <FaInfoCircle className="text-blue-500" />;
            default:
                return null;
        }
    };

    const filteredDiagnostics = diagnostics.filter(d => filter === 'all' || d.severity === filter);

    const errorCount = diagnostics.filter(d => d.severity === 'error').length;
    const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
    const infoCount = diagnostics.filter(d => d.severity === 'info').length;

    return (
        <div className="h-full flex flex-col bg-vscode-panel">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
                <span className="text-sm font-semibold">Problems</span>
                <div className="flex gap-2 text-xs">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-2 py-1 rounded ${filter === 'all' ? 'bg-vscode-active' : ''}`}
                    >
                        All ({diagnostics.length})
                    </button>
                    <button
                        onClick={() => setFilter('error')}
                        className={`px-2 py-1 rounded ${filter === 'error' ? 'bg-vscode-active' : ''}`}
                    >
                        Errors ({errorCount})
                    </button>
                    <button
                        onClick={() => setFilter('warning')}
                        className={`px-2 py-1 rounded ${filter === 'warning' ? 'bg-vscode-active' : ''}`}
                    >
                        Warnings ({warningCount})
                    </button>
                    <button
                        onClick={() => setFilter('info')}
                        className={`px-2 py-1 rounded ${filter === 'info' ? 'bg-vscode-active' : ''}`}
                    >
                        Info ({infoCount})
                    </button>
                </div>
            </div>

            {/* Diagnostics List */}
            <div className="flex-1 overflow-y-auto">
                {filteredDiagnostics.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400">
                        No problems detected
                    </div>
                ) : (
                    <div>
                        {filteredDiagnostics.map((diagnostic, index) => (
                            <div
                                key={index}
                                className="px-4 py-2 border-b border-vscode-border hover:bg-vscode-active cursor-pointer"
                                onClick={() => onDiagnosticClick(diagnostic.file, diagnostic.line)}
                            >
                                <div className="flex items-start gap-2">
                                    <div className="mt-0.5">{getIcon(diagnostic.severity)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm">{diagnostic.message}</div>
                                        <div className="text-xs text-gray-400 mt-1">
                                            {diagnostic.file}:{diagnostic.line}:{diagnostic.column}
                                            {diagnostic.source && ` [${diagnostic.source}]`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiagnosticsPanel;
