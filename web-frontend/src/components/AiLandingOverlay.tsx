/**
 * AI Landing Overlay Component
 * Emergent/Rocket-style AI-first entry experience
 */

import React, { useState, useEffect, useRef } from 'react';
import { VscSparkle, VscArrowRight, VscLoading, VscCode, VscLightbulb } from 'react-icons/vsc';
import { FaRobot } from 'react-icons/fa';
import { useAiGeneration, GeneratedFile } from '../hooks/useAiGeneration';
import FileApprovalModal from './FileApprovalModal';

interface AiLandingOverlayProps {
    onComplete: (files?: GeneratedFile[]) => void;
    onSkip: () => void;
}

const placeholderExamples = [
    "Create a React todo app with local storage",
    "Build a Python REST API with FastAPI",
    "Generate a landing page with modern CSS",
    "Create a Node.js CLI tool for file management",
    "Build a TypeScript utility library",
];

const AiLandingOverlay: React.FC<AiLandingOverlayProps> = ({ onComplete, onSkip }) => {
    const [prompt, setPrompt] = useState('');
    const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
    const [showPlaceholder, setShowPlaceholder] = useState(true);
    const [isExiting, setIsExiting] = useState(false);
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
        const interval = setInterval(() => {
            setShowPlaceholder(false);
            setTimeout(() => {
                setCurrentPlaceholder(prev => (prev + 1) % placeholderExamples.length);
                setShowPlaceholder(true);
            }, 300);
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;
        await generateFromPrompt(prompt);
    };

    const handleSkip = () => {
        setIsExiting(true);
        setTimeout(() => onSkip(), 400);
    };

    const handleConfirmFiles = async () => {
        await saveApprovedFiles();
        const approvedFiles = files.filter(f =>
            f.status === 'approved' || f.status === 'modified'
        );
        setIsExiting(true);
        setTimeout(() => onComplete(approvedFiles), 400);
    };

    const handleCancelFiles = () => {
        clearFiles();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <>
            <div
                className={`ai-landing-overlay fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-500 ${isExiting ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
                    }`}
            >
                {/* Animated Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="ai-bg-gradient" />
                    <div className="ai-bg-grid" />
                    <div className="ai-floating-orbs">
                        <div className="ai-orb ai-orb-1" />
                        <div className="ai-orb ai-orb-2" />
                        <div className="ai-orb ai-orb-3" />
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 w-full max-w-3xl px-6">
                    {/* Logo / Brand */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg shadow-blue-500/25">
                            <FaRobot size={40} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-bold text-white mb-3">
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                AI-Powered
                            </span>{' '}
                            Development
                        </h1>
                        <p className="text-lg text-gray-400">
                            Describe what you want to build and let AI generate the code for you
                        </p>
                    </div>

                    {/* Input Container */}
                    <form onSubmit={handleSubmit} className="ai-input-container">
                        <div className="relative">
                            <div className="ai-input-glow absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                            <div className="relative bg-vscode-editor/90 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 shadow-2xl">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 p-3">
                                        <VscSparkle size={24} className="text-purple-400" />
                                    </div>
                                    <textarea
                                        ref={inputRef}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={showPlaceholder ? placeholderExamples[currentPlaceholder] : ''}
                                        className="flex-1 bg-transparent text-white text-lg py-3 pr-4 placeholder-gray-500 resize-none focus:outline-none min-h-[56px] max-h-32"
                                        disabled={isLoading}
                                        rows={1}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!prompt.trim() || isLoading}
                                        className="flex-shrink-0 m-2 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                                    >
                                        {isLoading ? (
                                            <VscLoading size={20} className="animate-spin" />
                                        ) : (
                                            <VscArrowRight size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="mt-8 text-center">
                            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 text-gray-300">
                                <VscLoading size={16} className="animate-spin" />
                                <span>Generating your project...</span>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-center">
                            {error}
                        </div>
                    )}

                    {/* Suggestions */}
                    {!isLoading && !error && files.length === 0 && (
                        <div className="mt-10">
                            <p className="text-center text-gray-500 text-sm mb-4">
                                <VscLightbulb className="inline-block mr-2" />
                                Try one of these:
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {placeholderExamples.slice(0, 4).map((example, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setPrompt(example)}
                                        className="px-4 py-2 rounded-full bg-white/5 text-gray-400 text-sm hover:bg-white/10 hover:text-white transition-colors border border-white/5"
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Skip Button */}
                    <div className="mt-12 text-center">
                        <button
                            onClick={handleSkip}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-gray-400 hover:text-white transition-colors group"
                        >
                            <VscCode size={18} />
                            <span>Skip to Editor</span>
                            <VscArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 text-center text-gray-600 text-sm">
                    Powered by Gemini AI • All code generated via MCP
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

export default AiLandingOverlay;
