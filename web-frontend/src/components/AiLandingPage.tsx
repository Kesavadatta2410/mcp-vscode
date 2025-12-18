/**
 * AI Landing Page - ChatGPT/Emergent Style Interface
 * Beautiful landing experience shown after login before user selects files
 */

import React, { useState } from 'react';
import { VscSend, VscCode, VscFolder, VscTerminal, VscSearch, VscGitMerge } from 'react-icons/vsc';
import { FaRobot, FaMagic, FaBolt, FaLightbulb } from 'react-icons/fa';

interface AiLandingPageProps {
    onStartChat: (message: string) => void;
    onOpenExplorer: () => void;
    onOpenTerminal: () => void;
    onOpenSearch: () => void;
    onOpenGit: () => void;
}

const AiLandingPage: React.FC<AiLandingPageProps> = ({
    onStartChat,
    onOpenExplorer,
    onOpenTerminal,
    onOpenSearch,
    onOpenGit,
}) => {
    const [inputValue, setInputValue] = useState('');

    const suggestions = [
        { icon: <FaMagic />, text: "Create a React component", color: "from-purple-500 to-pink-500" },
        { icon: <FaBolt />, text: "Debug my code", color: "from-yellow-500 to-orange-500" },
        { icon: <FaLightbulb />, text: "Explain this function", color: "from-blue-500 to-cyan-500" },
        { icon: <VscCode />, text: "Refactor for performance", color: "from-green-500 to-emerald-500" },
    ];

    const quickActions = [
        { icon: <VscFolder size={24} />, label: "Explorer", description: "Browse files", action: onOpenExplorer },
        { icon: <VscTerminal size={24} />, label: "Terminal", description: "Run commands", action: onOpenTerminal },
        { icon: <VscSearch size={24} />, label: "Search", description: "Find in files", action: onOpenSearch },
        { icon: <VscGitMerge size={24} />, label: "Git", description: "Version control", action: onOpenGit },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            onStartChat(inputValue.trim());
        }
    };

    const handleSuggestionClick = (text: string) => {
        onStartChat(text);
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117]">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient Orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-3xl px-8 space-y-12">
                {/* Logo and Title */}
                <div className="text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 shadow-2xl shadow-purple-500/30 mb-4">
                        <FaRobot className="text-white text-4xl" />
                    </div>

                    <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                        AI Code Assistant
                    </h1>

                    <p className="text-gray-400 text-lg max-w-lg mx-auto">
                        Your intelligent coding companion. Ask anything about your code, generate new files, or get help debugging.
                    </p>
                </div>

                {/* Main Input */}
                <form onSubmit={handleSubmit} className="relative">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
                        <div className="relative flex items-center bg-[#1c2128] rounded-2xl border border-gray-700/50 overflow-hidden">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask me anything about your code..."
                                className="flex-1 bg-transparent px-6 py-5 text-white placeholder-gray-500 focus:outline-none text-lg"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim()}
                                className="m-2 p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 rounded-xl text-white transition-all duration-200 disabled:cursor-not-allowed"
                            >
                                <VscSend size={20} />
                            </button>
                        </div>
                    </div>
                </form>

                {/* Suggestion Chips */}
                <div className="flex flex-wrap justify-center gap-3">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion.text)}
                            className="group flex items-center gap-2 px-4 py-2.5 bg-[#1c2128]/80 hover:bg-[#2d333b] border border-gray-700/50 hover:border-gray-600 rounded-full text-sm text-gray-300 hover:text-white transition-all duration-200"
                        >
                            <span className={`bg-gradient-to-r ${suggestion.color} bg-clip-text text-transparent`}>
                                {suggestion.icon}
                            </span>
                            <span>{suggestion.text}</span>
                        </button>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="pt-8 border-t border-gray-800/50">
                    <p className="text-center text-gray-500 text-sm mb-6">Or start with these quick actions</p>
                    <div className="flex justify-center gap-4">
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                onClick={action.action}
                                className="group flex flex-col items-center gap-2 p-4 bg-[#1c2128]/50 hover:bg-[#2d333b] border border-gray-800/50 hover:border-gray-700 rounded-xl transition-all duration-200 w-28"
                            >
                                <div className="text-gray-400 group-hover:text-blue-400 transition-colors">
                                    {action.icon}
                                </div>
                                <div className="text-sm text-gray-300 font-medium">{action.label}</div>
                                <div className="text-xs text-gray-500">{action.description}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Branding */}
            <div className="absolute bottom-6 text-gray-600 text-sm flex items-center gap-2">
                <VscCode />
                <span>MCP VS Code Web</span>
            </div>
        </div>
    );
};

export default AiLandingPage;
