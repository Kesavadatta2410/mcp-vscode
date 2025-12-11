import React, { useState, useEffect } from 'react';
import mcpClient from '@/services/mcpClient';
import type { GitStatus } from '@/types';
import { FaCodeBranch, FaSync, FaCheck, FaTimes } from 'react-icons/fa';

const GitPanel: React.FC = () => {
    const [status, setStatus] = useState<GitStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        setLoading(true);
        const response = await mcpClient.gitStatus();

        if (response.success && response.data) {
            setStatus(response.data);
        }

        setLoading(false);
    };

    const handleCommit = async () => {
        if (!commitMessage.trim() || selectedFiles.size === 0) return;

        const response = await mcpClient.gitCommit(
            commitMessage,
            Array.from(selectedFiles)
        );

        if (response.success) {
            setCommitMessage('');
            setSelectedFiles(new Set());
            await loadStatus();
            alert('Committed successfully!');
        } else {
            alert(`Commit failed: ${response.error?.message}`);
        }
    };

    const toggleFile = (file: string) => {
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(file)) {
            newSelected.delete(file);
        } else {
            newSelected.add(file);
        }
        setSelectedFiles(newSelected);
    };

    const allChangedFiles = [
        ...(status?.modified || []),
        ...(status?.added || []),
        ...(status?.deleted || []),
        ...(status?.untracked || []),
    ];

    return (
        <div className="h-full flex flex-col bg-vscode-panel">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
                <div className="flex items-center gap-2">
                    <FaCodeBranch />
                    <span className="text-sm font-semibold">Git</span>
                    {status?.current && (
                        <span className="text-xs text-gray-400">({status.current})</span>
                    )}
                </div>
                <button
                    onClick={loadStatus}
                    disabled={loading}
                    className="p-1 hover:bg-vscode-active rounded disabled:opacity-50"
                    title="Refresh"
                >
                    <FaSync className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading && !status ? (
                    <div className="text-sm text-gray-400">Loading...</div>
                ) : !status ? (
                    <div className="text-sm text-gray-400">Failed to load git status</div>
                ) : (
                    <div className="space-y-4">
                        {/* Status Info */}
                        {status.tracking && (
                            <div className="text-xs text-gray-400">
                                Tracking: {status.tracking}
                                {status.ahead > 0 && ` (↑${status.ahead})`}
                                {status.behind > 0 && ` (↓${status.behind})`}
                            </div>
                        )}

                        {/* Changed Files */}
                        {allChangedFiles.length > 0 ? (
                            <div>
                                <div className="text-sm font-semibold mb-2">
                                    Changes ({allChangedFiles.length})
                                </div>
                                <div className="space-y-1">
                                    {allChangedFiles.map(file => {
                                        const isSelected = selectedFiles.has(file);
                                        const fileStatus = status.modified.includes(file)
                                            ? 'M'
                                            : status.added.includes(file)
                                                ? 'A'
                                                : status.deleted.includes(file)
                                                    ? 'D'
                                                    : 'U';

                                        return (
                                            <div
                                                key={file}
                                                className="flex items-center gap-2 px-2 py-1 hover:bg-vscode-active rounded cursor-pointer"
                                                onClick={() => toggleFile(file)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleFile(file)}
                                                    className="cursor-pointer"
                                                />
                                                <span
                                                    className={`text-xs font-mono px-1 rounded ${fileStatus === 'M'
                                                            ? 'bg-yellow-900 text-yellow-300'
                                                            : fileStatus === 'A'
                                                                ? 'bg-green-900 text-green-300'
                                                                : fileStatus === 'D'
                                                                    ? 'bg-red-900 text-red-300'
                                                                    : 'bg-blue-900 text-blue-300'
                                                        }`}
                                                >
                                                    {fileStatus}
                                                </span>
                                                <span className="text-sm">{file}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-400">No changes</div>
                        )}

                        {/* Commit Section */}
                        {allChangedFiles.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-vscode-border">
                                <div className="text-sm font-semibold mb-2">Commit</div>
                                <textarea
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    placeholder="Commit message..."
                                    className="w-full bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-sm h-20 resize-none mb-2"
                                />
                                <button
                                    onClick={handleCommit}
                                    disabled={!commitMessage.trim() || selectedFiles.size === 0}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
                                >
                                    <FaCheck />
                                    Commit {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GitPanel;
