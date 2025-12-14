/**
 * AI Floating Panel Component
 * A floating AI input panel that overlays on top of the VS Code UI
 * Can be minimized to a small button in the corner
 */

import React, { useState, useEffect, useRef } from 'react';
import { VscSparkle, VscArrowRight, VscLoading, VscChevronUp, VscLightbulb } from 'react-icons/vsc';
import { FaRobot } from 'react-icons/fa';
import { useAiGeneration, GeneratedFile } from '../hooks/useAiGeneration';
import FileApprovalModal from './FileApprovalModal';

interface AiFloatingPanelProps {
    isOpen: boolean;
    onComplete: (files?: GeneratedFile[]) => void;
    onMinimize: () => void;
    onOpen: () => void;
}

const placeholderExamples = [
    "Create a React todo app with local storage",
    "Build a Python REST API with FastAPI",
    "Generate a landing page with modern CSS",
    "Create a Node.js CLI tool",
];

const AiFloatingPanel: React.FC<AiFloatingPanelProps> = ({
    isOpen,
    onComplete,
    onMinimize,
    onOpen,
}) => {
    const [prompt, setPrompt] = useState('');
    const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
    const [showPlaceholder, setShowPlaceholder] = useState(true);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const {
        isLoading,
        error,
        files,
        projectName,
        generateFromPrompt,
        approveFile,
        rejectFile,
        modifyFile,
        approveAll,
        rejectAll,
        clearFiles,
        saveApprovedFiles,
    } = useAiGeneration();

    // Cycle through placeholder examples
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            setShowPlaceholder(false);
            setTimeout(() => {
                setCurrentPlaceholder(prev => (prev + 1) % placeholderExamples.length);
                setShowPlaceholder(true);
            }, 300);
        }, 4000);

        return () => clearInterval(interval);
    }, [isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;
        await generateFromPrompt(prompt);
    };

    const handleConfirmFiles = async () => {
        await saveApprovedFiles();
        const approvedFiles = files.filter(f =>
            f.status === 'approved' || f.status === 'modified'
        );
        onComplete(approvedFiles);
        clearFiles();
        setPrompt('');
    };

    const handleCancelFiles = () => {
        clearFiles();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
        if (e.key === 'Escape') {
            onMinimize();
        }
    };

    // Minimized state - floating button
    if (!isOpen) {
        return (
            <button
                onClick={onOpen}
                className="fixed bottom-6 right-6 z-50 group"
            >
                <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                    {/* Button */}
                    <div className="relative flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105">
                        <FaRobot size={18} />
                        <span className="font-medium">AI Assistant</span>
                        <VscSparkle size={14} className="text-yellow-300" />
                    </div>
                </div>
            </button>
        );
    }

    return (
        <>
            {/* Semi-transparent backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
                onClick={onMinimize}
            />

            {/* Floating Panel */}
            <div className="fixed inset-x-0 top-0 z-50 flex justify-center pt-8 px-4">
                <div className="ai-floating-panel w-full max-w-2xl animate-slideDown">
                    {/* Panel glass container */}
                    <div className="relative bg-vscode-bg/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                        {/* Gradient border effect */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-50" style={{ padding: '1px' }}>
                            <div className="w-full h-full bg-vscode-bg rounded-2xl" />
                        </div>

                        {/* Header */}
                        <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <FaRobot size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-white">AI Code Assistant</h2>
                                    <p className="text-xs text-gray-400">Describe what you want to build</p>
                                </div>
                            </div>
                            <button
                                onClick={onMinimize}
                                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                title="Minimize (Esc)"
                            >
                                <VscChevronUp size={20} />
                            </button>
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSubmit} className="relative p-4">
                            <div className="relative">
                                <div className="flex items-start bg-vscode-editor/80 rounded-xl border border-white/10 focus-within:border-blue-500/50 transition-colors">
                                    <div className="flex-shrink-0 p-3">
                                        <VscSparkle size={20} className="text-purple-400" />
                                    </div>
                                    <textarea
                                        ref={inputRef}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={showPlaceholder ? placeholderExamples[currentPlaceholder] : ''}
                                        className="flex-1 bg-transparent text-white py-3 pr-3 placeholder-gray-500 resize-none focus:outline-none min-h-[48px] max-h-32 text-sm"
                                        disabled={isLoading}
                                        rows={1}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!prompt.trim() || isLoading}
                                        className="flex-shrink-0 m-2 p-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? (
                                            <VscLoading size={18} className="animate-spin" />
                                        ) : (
                                            <VscArrowRight size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                                    <VscLoading size={14} className="animate-spin" />
                                    <span>Generating code...</span>
                                </div>
                            )}

                            {/* Error display */}
                            {error && (
                                <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                        </form>

                        {/* Quick suggestions */}
                        {!isLoading && !error && files.length === 0 && (
                            <div className="px-4 pb-4">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                    <VscLightbulb size={12} />
                                    <span>Suggestions:</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {placeholderExamples.map((example, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setPrompt(example)}
                                            className="px-3 py-1.5 rounded-full bg-white/5 text-gray-400 text-xs hover:bg-white/10 hover:text-white transition-colors border border-white/5"
                                        >
                                            {example}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer hint */}
                        <div className="px-4 pb-3 text-center">
                            <p className="text-xs text-gray-600">
                                Press <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-gray-500">Enter</kbd> to generate • <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-gray-500">Esc</kbd> to minimize
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* File Approval Modal */}
            {files.length > 0 && !isLoading && (
                <FileApprovalModal
                    files={files}
                    projectName={projectName}
                    onApprove={approveFile}
                    onReject={rejectFile}
                    onModify={modifyFile}
                    onApproveAll={approveAll}
                    onRejectAll={rejectAll}
                    onConfirm={handleConfirmFiles}
                    onCancel={handleCancelFiles}
                />
            )}
        </>
    );
};

export default AiFloatingPanel;
