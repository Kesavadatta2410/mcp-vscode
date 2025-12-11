import React from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';

interface DiffViewerProps {
    diff: string;
    onApply: () => void;
    onReject: () => void;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diff, onApply, onReject }) => {
    const parseDiff = (diffText: string) => {
        const lines = diffText.split('\n');
        const hunks: Array<{
            header: string;
            lines: Array<{ type: 'add' | 'remove' | 'context'; content: string }>;
        }> = [];

        let currentHunk: any = null;

        for (const line of lines) {
            if (line.startsWith('@@')) {
                if (currentHunk) hunks.push(currentHunk);
                currentHunk = { header: line, lines: [] };
            } else if (currentHunk) {
                if (line.startsWith('+')) {
                    currentHunk.lines.push({ type: 'add', content: line.substring(1) });
                } else if (line.startsWith('-')) {
                    currentHunk.lines.push({ type: 'remove', content: line.substring(1) });
                } else {
                    currentHunk.lines.push({ type: 'context', content: line.substring(1) });
                }
            }
        }

        if (currentHunk) hunks.push(currentHunk);

        return hunks;
    };

    const hunks = parseDiff(diff);

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto bg-vscode-editor rounded p-2">
                {hunks.length === 0 ? (
                    <div className="text-sm text-gray-400 p-4">
                        No changes to display
                    </div>
                ) : (
                    <div className="space-y-4">
                        {hunks.map((hunk, hunkIdx) => (
                            <div key={hunkIdx} className="border border-vscode-border rounded overflow-hidden">
                                <div className="bg-vscode-sidebar px-3 py-1 text-xs font-mono text-gray-400">
                                    {hunk.header}
                                </div>
                                <div className="font-mono text-xs">
                                    {hunk.lines.map((line, lineIdx) => (
                                        <div
                                            key={lineIdx}
                                            className={`px-3 py-0.5 ${line.type === 'add'
                                                    ? 'bg-green-900 bg-opacity-30 text-green-300'
                                                    : line.type === 'remove'
                                                        ? 'bg-red-900 bg-opacity-30 text-red-300'
                                                        : 'text-gray-400'
                                                }`}
                                        >
                                            <span className="select-none mr-2">
                                                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                                            </span>
                                            {line.content}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
                <button
                    onClick={onApply}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                >
                    <FaCheck />
                    Apply Changes
                </button>
                <button
                    onClick={onReject}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                >
                    <FaTimes />
                    Reject
                </button>
            </div>
        </div>
    );
};

export default DiffViewer;
