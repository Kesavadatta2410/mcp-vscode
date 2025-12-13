/**
 * MCP Action Card Component
 * Displays AI-planned MCP actions with approval workflow
 */

import React, { useState } from 'react';
import { VscCheck, VscClose, VscEdit, VscLoading, VscError, VscPass } from 'react-icons/vsc';

export interface McpAction {
    id: string;
    tool: string;
    server: string;
    args: Record<string, any>;
    status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
    result?: any;
    error?: string;
    timestamp: Date;
}

interface McpActionCardProps {
    action: McpAction;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onEdit?: (id: string, args: Record<string, any>) => void;
    onRetry?: (id: string) => void;
}

const McpActionCard: React.FC<McpActionCardProps> = ({
    action,
    onApprove,
    onReject,
    onEdit,
    onRetry,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editedArgs, setEditedArgs] = useState(JSON.stringify(action.args, null, 2));

    const getStatusColor = () => {
        switch (action.status) {
            case 'pending': return 'border-yellow-500 bg-yellow-500/10';
            case 'approved': return 'border-blue-500 bg-blue-500/10';
            case 'executing': return 'border-blue-500 bg-blue-500/10';
            case 'completed': return 'border-green-500 bg-green-500/10';
            case 'failed': return 'border-red-500 bg-red-500/10';
            case 'rejected': return 'border-gray-500 bg-gray-500/10';
            default: return 'border-vscode-border';
        }
    };

    const getStatusIcon = () => {
        switch (action.status) {
            case 'pending': return <span className="text-yellow-500">⏳</span>;
            case 'approved': return <VscCheck className="text-blue-500" />;
            case 'executing': return <VscLoading className="text-blue-500 animate-spin" />;
            case 'completed': return <VscPass className="text-green-500" />;
            case 'failed': return <VscError className="text-red-500" />;
            case 'rejected': return <VscClose className="text-gray-500" />;
            default: return null;
        }
    };

    const handleSaveEdit = () => {
        try {
            const parsed = JSON.parse(editedArgs);
            onEdit?.(action.id, parsed);
            setEditing(false);
        } catch (e) {
            alert('Invalid JSON');
        }
    };

    return (
        <div className={`rounded-lg border-l-4 ${getStatusColor()} overflow-hidden`}>
            {/* Header */}
            <div
                className="px-3 py-2 bg-vscode-editor flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <div>
                        <span className="text-sm font-mono text-blue-400">{action.server}</span>
                        <span className="text-gray-500 mx-1">.</span>
                        <span className="text-sm font-semibold">{action.tool}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="capitalize">{action.status}</span>
                    <span>{action.timestamp.toLocaleTimeString()}</span>
                </div>
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="bg-vscode-sidebar">
                    {/* Arguments */}
                    <div className="px-3 py-2 border-t border-vscode-border">
                        <div className="text-xs text-gray-400 mb-1">Arguments:</div>
                        {editing ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editedArgs}
                                    onChange={(e) => setEditedArgs(e.target.value)}
                                    className="w-full h-32 bg-vscode-bg border border-vscode-border rounded p-2 text-xs font-mono"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveEdit}
                                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => { setEditing(false); setEditedArgs(JSON.stringify(action.args, null, 2)); }}
                                        className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <pre className="text-xs font-mono bg-vscode-bg rounded p-2 overflow-x-auto">
                                {JSON.stringify(action.args, null, 2)}
                            </pre>
                        )}
                    </div>

                    {/* Result or Error */}
                    {action.result && (
                        <div className="px-3 py-2 border-t border-vscode-border">
                            <div className="text-xs text-gray-400 mb-1">Result:</div>
                            <pre className="text-xs font-mono bg-vscode-bg rounded p-2 overflow-x-auto max-h-40">
                                {typeof action.result === 'string'
                                    ? action.result
                                    : JSON.stringify(action.result, null, 2)}
                            </pre>
                        </div>
                    )}

                    {action.error && (
                        <div className="px-3 py-2 border-t border-vscode-border">
                            <div className="text-xs text-red-400 mb-1">Error:</div>
                            <pre className="text-xs font-mono bg-red-900/20 text-red-300 rounded p-2">
                                {action.error}
                            </pre>
                        </div>
                    )}

                    {/* Action buttons */}
                    {action.status === 'pending' && (
                        <div className="px-3 py-2 border-t border-vscode-border flex gap-2">
                            <button
                                onClick={() => onApprove?.(action.id)}
                                className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded"
                            >
                                <VscCheck size={14} />
                                Approve
                            </button>
                            <button
                                onClick={() => setEditing(true)}
                                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                            >
                                <VscEdit size={14} />
                                Edit
                            </button>
                            <button
                                onClick={() => onReject?.(action.id)}
                                className="flex items-center gap-1 px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                            >
                                <VscClose size={14} />
                                Reject
                            </button>
                        </div>
                    )}

                    {action.status === 'failed' && (
                        <div className="px-3 py-2 border-t border-vscode-border">
                            <button
                                onClick={() => onRetry?.(action.id)}
                                className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 rounded"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default McpActionCard;
