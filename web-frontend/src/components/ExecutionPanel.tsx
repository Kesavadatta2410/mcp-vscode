import React, { useState } from 'react';
import { FaPlay, FaTimes, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import mcpClient from '@/services/mcpClient';
import type { ExecResult } from '@/types';

interface ExecutionPanelProps {
    filePath: string | null;
    onClose: () => void;
}

const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ filePath, onClose }) => {
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<ExecResult | null>(null);

    const runFile = async () => {
        if (!filePath) return;

        setExecuting(true);
        setResult(null);

        const ext = filePath.split('.').pop()?.toLowerCase();
        let response;

        if (ext === 'py') {
            response = await mcpClient.runPythonFile(filePath, [], 30);
        } else if (ext === 'js') {
            response = await mcpClient.runJsFile(filePath, [], 30);
        } else {
            setResult({
                success: false,
                stdout: '',
                stderr: 'Unsupported file type. Only .py and .js files can be executed.',
                exitCode: -1,
                durationMs: 0,
                timedOut: false,
            });
            setExecuting(false);
            return;
        }

        if (response.success && response.data) {
            setResult(response.data);
        } else {
            setResult({
                success: false,
                stdout: '',
                stderr: response.error?.message || 'Execution failed',
                exitCode: -1,
                durationMs: 0,
                timedOut: false,
                error: response.error,
            });
        }

        setExecuting(false);
    };

    const getStatusIcon = () => {
        if (!result) return null;
        if (result.success) {
            return <FaCheckCircle className="text-green-500" />;
        }
        return <FaExclamationCircle className="text-red-500" />;
    };

    return (
        <div className="h-full flex flex-col bg-vscode-panel border-t border-vscode-border">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Execution</span>
                    {filePath && <span className="text-xs text-gray-400">{filePath}</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={runFile}
                        disabled={!filePath || executing}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded"
                    >
                        <FaPlay size={10} />
                        {executing ? 'Running...' : 'Run'}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-vscode-active rounded"
                    >
                        <FaTimes />
                    </button>
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
                {!result && !executing && (
                    <div className="text-sm text-gray-400">
                        Click "Run" to execute the current file
                    </div>
                )}

                {executing && (
                    <div className="text-sm text-gray-400">
                        Executing...
                    </div>
                )}

                {result && (
                    <div className="space-y-4">
                        {/* Status */}
                        <div className="flex items-center gap-2">
                            {getStatusIcon()}
                            <span className={`text-sm font-semibold ${result.success ? 'text-green-500' : 'text-red-500'}`}>
                                {result.success ? 'Success' : 'Failed'}
                            </span>
                            <span className="text-xs text-gray-400">
                                (Exit code: {result.exitCode}, Duration: {result.durationMs}ms)
                            </span>
                            {result.timedOut && (
                                <span className="text-xs text-yellow-500">TIMED OUT</span>
                            )}
                        </div>

                        {/* Stdout */}
                        {result.stdout && (
                            <div>
                                <div className="text-xs font-semibold text-gray-400 mb-1">STDOUT:</div>
                                <pre className="bg-vscode-editor p-2 rounded text-sm overflow-x-auto">
                                    {result.stdout}
                                </pre>
                            </div>
                        )}

                        {/* Stderr */}
                        {result.stderr && (
                            <div>
                                <div className="text-xs font-semibold text-red-400 mb-1">STDERR:</div>
                                <pre className="bg-vscode-editor p-2 rounded text-sm text-red-300 overflow-x-auto">
                                    {result.stderr}
                                </pre>
                            </div>
                        )}

                        {/* Error */}
                        {result.error && (
                            <div>
                                <div className="text-xs font-semibold text-red-400 mb-1">ERROR:</div>
                                <div className="bg-vscode-editor p-2 rounded text-sm text-red-300">
                                    <div className="font-semibold">{result.error.type}</div>
                                    <div>{result.error.message}</div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExecutionPanel;
