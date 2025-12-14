/**
 * File Approval Modal Component
 * Displays generated files for review with Accept/Modify/Reject workflow
 */

import React, { useState } from 'react';
import { VscCheck, VscClose, VscEdit, VscFile, VscChevronDown, VscChevronRight } from 'react-icons/vsc';
import type { GeneratedFile } from '../hooks/useAiGeneration';

interface FileApprovalModalProps {
    files: GeneratedFile[];
    projectName: string | null;
    onApprove: (fileId: string) => void;
    onReject: (fileId: string) => void;
    onModify: (fileId: string, content: string) => void;
    onApproveAll: () => void;
    onRejectAll: () => void;
    onConfirm: () => void;
    onCancel: () => void;
}

const FileApprovalModal: React.FC<FileApprovalModalProps> = ({
    files,
    projectName,
    onApprove,
    onReject,
    onModify,
    onApproveAll,
    onRejectAll,
    onConfirm,
    onCancel,
}) => {
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set(files.map(f => f.id)));
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const [editContent, setEditContent] = useState<string>('');

    const pendingCount = files.filter(f => f.status === 'pending').length;
    const approvedCount = files.filter(f => f.status === 'approved' || f.status === 'modified').length;
    const rejectedCount = files.filter(f => f.status === 'rejected').length;

    const toggleExpand = (fileId: string) => {
        setExpandedFiles(prev => {
            const next = new Set(prev);
            if (next.has(fileId)) {
                next.delete(fileId);
            } else {
                next.add(fileId);
            }
            return next;
        });
    };

    const startEdit = (file: GeneratedFile) => {
        setEditingFile(file.id);
        setEditContent(file.content);
    };

    const saveEdit = (fileId: string) => {
        onModify(fileId, editContent);
        setEditingFile(null);
        setEditContent('');
    };

    const cancelEdit = () => {
        setEditingFile(null);
        setEditContent('');
    };

    const getStatusStyles = (status: GeneratedFile['status']) => {
        switch (status) {
            case 'approved':
            case 'modified':
                return 'bg-green-500/20 border-green-500/50 text-green-400';
            case 'rejected':
                return 'bg-red-500/20 border-red-500/50 text-red-400';
            default:
                return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
        }
    };

    const getStatusLabel = (status: GeneratedFile['status']) => {
        switch (status) {
            case 'approved': return 'Approved';
            case 'modified': return 'Modified';
            case 'rejected': return 'Rejected';
            default: return 'Pending';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-vscode-bg border border-vscode-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-vscode-border bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <VscFile className="text-blue-400" />
                        Review Generated Files
                    </h2>
                    {projectName && (
                        <p className="text-sm text-gray-400 mt-1">
                            Project: <span className="text-white">{projectName}</span>
                        </p>
                    )}
                    <div className="flex gap-4 mt-3 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            Pending: {pendingCount}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Approved: {approvedCount}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Rejected: {rejectedCount}
                        </span>
                    </div>
                </div>

                {/* Files List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {files.map(file => (
                        <div
                            key={file.id}
                            className={`border rounded-lg overflow-hidden transition-all ${getStatusStyles(file.status)}`}
                        >
                            {/* File Header */}
                            <div
                                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5"
                                onClick={() => toggleExpand(file.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {expandedFiles.has(file.id) ? (
                                        <VscChevronDown className="text-gray-400" />
                                    ) : (
                                        <VscChevronRight className="text-gray-400" />
                                    )}
                                    <VscFile className="text-gray-300" />
                                    <span className="font-mono text-sm text-white">{file.path}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusStyles(file.status)}`}>
                                        {getStatusLabel(file.status)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    {file.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => onApprove(file.id)}
                                                className="p-1.5 rounded hover:bg-green-500/30 text-green-400 transition-colors"
                                                title="Approve"
                                            >
                                                <VscCheck size={16} />
                                            </button>
                                            <button
                                                onClick={() => startEdit(file)}
                                                className="p-1.5 rounded hover:bg-blue-500/30 text-blue-400 transition-colors"
                                                title="Modify"
                                            >
                                                <VscEdit size={16} />
                                            </button>
                                            <button
                                                onClick={() => onReject(file.id)}
                                                className="p-1.5 rounded hover:bg-red-500/30 text-red-400 transition-colors"
                                                title="Reject"
                                            >
                                                <VscClose size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* File Content */}
                            {expandedFiles.has(file.id) && (
                                <div className="border-t border-current/20">
                                    {editingFile === file.id ? (
                                        <div className="p-3">
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                className="w-full h-64 bg-vscode-editor text-gray-200 font-mono text-sm p-3 rounded border border-vscode-border resize-none focus:outline-none focus:border-blue-500"
                                                spellCheck={false}
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button
                                                    onClick={cancelEdit}
                                                    className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => saveEdit(file.id)}
                                                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                                                >
                                                    Save & Approve
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <pre className="p-4 overflow-x-auto bg-vscode-editor/50 text-gray-300 text-sm font-mono max-h-64">
                                            <code>{file.content}</code>
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-vscode-border bg-vscode-sidebar flex items-center justify-between">
                    <div className="flex gap-2">
                        {pendingCount > 0 && (
                            <>
                                <button
                                    onClick={onApproveAll}
                                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2"
                                >
                                    <VscCheck size={14} />
                                    Approve All
                                </button>
                                <button
                                    onClick={onRejectAll}
                                    className="px-4 py-2 text-sm bg-red-600/50 text-white rounded-lg hover:bg-red-500 transition-colors flex items-center gap-2"
                                >
                                    <VscClose size={14} />
                                    Reject All
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-5 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={approvedCount === 0}
                            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create {approvedCount} File{approvedCount !== 1 ? 's' : ''} & Open IDE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileApprovalModal;
