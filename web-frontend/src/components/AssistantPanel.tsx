import React, { useState } from 'react';
import { FaMagic, FaTimes, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import assistantService, { AssistantRequest } from '@/services/assistant';
import DiffViewer from './DiffViewer';

interface AssistantPanelProps {
    currentFile: string | null;
    selectedCode?: string;
    onApplyDiff: (diff: string) => Promise<void>;
    onClose: () => void;
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({
    currentFile,
    selectedCode,
    onApplyDiff,
    onClose
}) => {
    const [prompt, setPrompt] = useState('');
    const [action, setAction] = useState<AssistantRequest['action']>('refactor');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<any>(null);
    const [showDiff, setShowDiff] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setResponse(null);

        const result = await assistantService.generate({
            prompt,
            context: {
                currentFile: currentFile || undefined,
                selectedCode,
            },
            action,
        });

        if (result.success && result.data) {
            setResponse(result.data);
            if (result.data.diff) {
                setShowDiff(true);
            }
        } else {
            setResponse({ error: result.error });
        }

        setLoading(false);
    };

    const handleApplyDiff = async () => {
        if (response?.diff) {
            try {
                await onApplyDiff(response.diff);
                setShowDiff(false);
                setResponse(null);
                setPrompt('');
            } catch (error: any) {
                alert(`Failed to apply changes: ${error.message}`);
            }
        }
    };

    const quickActions = [
        { label: 'Add comments', prompt: 'Add comprehensive comments to this code' },
        { label: 'Optimize', prompt: 'Optimize this code for performance' },
        { label: 'Add error handling', prompt: 'Add proper error handling' },
        { label: 'Generate tests', prompt: 'Generate unit tests for this code' },
    ];

    return (
        <div className="h-full flex flex-col bg-vscode-panel">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
                <div className="flex items-center gap-2">
                    <FaMagic className="text-purple-500" />
                    <span className="text-sm font-semibold">AI Assistant</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-vscode-active rounded"
                >
                    <FaTimes />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {!showDiff ? (
                    <div className="space-y-4">
                        {/* Action Selection */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Action</label>
                            <select
                                value={action}
                                onChange={(e) => setAction(e.target.value as any)}
                                className="w-full bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-sm"
                            >
                                <option value="generate">Generate Code</option>
                                <option value="refactor">Refactor</option>
                                <option value="explain">Explain Code</option>
                                <option value="fix">Fix Error</option>
                                <option value="test">Generate Tests</option>
                            </select>
                        </div>

                        {/* Quick Actions */}
                        {selectedCode && (
                            <div>
                                <label className="block text-xs text-gray-400 mb-2">Quick Actions</label>
                                <div className="flex flex-wrap gap-2">
                                    {quickActions.map((qa, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setPrompt(qa.prompt)}
                                            className="px-3 py-1 text-xs bg-vscode-editor hover:bg-vscode-active border border-vscode-border rounded"
                                        >
                                            {qa.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Prompt Input */}
                        <form onSubmit={handleSubmit}>
                            <label className="block text-xs text-gray-400 mb-1">Prompt</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe what you want the AI to do..."
                                className="w-full bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-sm h-32 resize-none"
                                disabled={loading}
                            />

                            <button
                                type="submit"
                                disabled={loading || !prompt.trim()}
                                className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FaMagic />
                                        Generate
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Response */}
                        {response && !response.error && (
                            <div className="mt-4 p-3 bg-vscode-editor border border-vscode-border rounded">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaCheckCircle className="text-green-500" />
                                    <span className="text-sm font-semibold">Response</span>
                                </div>

                                {response.summary && (
                                    <p className="text-sm text-gray-300 mb-2">{response.summary}</p>
                                )}

                                {response.explanation && (
                                    <div className="text-sm text-gray-300 whitespace-pre-wrap">
                                        {response.explanation}
                                    </div>
                                )}

                                {response.diff && (
                                    <button
                                        onClick={() => setShowDiff(true)}
                                        className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                                    >
                                        View Changes
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Error */}
                        {response?.error && (
                            <div className="mt-4 p-3 bg-red-900 bg-opacity-20 border border-red-700 rounded">
                                <div className="text-sm font-semibold text-red-400 mb-1">Error</div>
                                <div className="text-sm text-red-300">{response.error.message}</div>
                            </div>
                        )}
                    </div>
                ) : (
                    <DiffViewer
                        diff={response.diff}
                        onApply={handleApplyDiff}
                        onReject={() => setShowDiff(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default AssistantPanel;
