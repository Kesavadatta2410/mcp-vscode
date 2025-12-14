/**
 * Enhanced AI Chat Panel
 * Conversational AI with MCP action visualization, approval workflow, and Execute All
 */

import React, { useState, useRef, useEffect } from 'react';
import { VscSend, VscTrash, VscAccount, VscLoading, VscChevronDown, VscChevronRight, VscCheck, VscRunAll } from 'react-icons/vsc';
import { FaRobot } from 'react-icons/fa';
import McpActionCard, { McpAction } from './McpActionCard';
import axios from 'axios';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    actions?: McpAction[];
}

interface AiChatPanelProps {
    currentFile?: string | null;
    selectedCode?: string;
    onExecuteAction?: (action: McpAction) => Promise<any>;
    onRefreshFileTree?: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const AiChatPanel: React.FC<AiChatPanelProps> = ({
    currentFile,
    selectedCode,
    onExecuteAction,
    onRefreshFileTree
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showActions, setShowActions] = useState<string | null>(null);
    const [executingAll, setExecutingAll] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `👋 Hi! I'm your AI coding assistant. I can help you with:

• Writing and refactoring code
• Understanding codebases
• Debugging issues
• Running code and tests
• Git operations

How can I help you today?`,
                timestamp: new Date()
            }]);
        }
    }, []);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Build context
            const context = {
                filePath: currentFile,
                selectedCode: selectedCode
            };

            // Check if request needs planning (action-oriented)
            const needsPlan = /create|write|modify|delete|run|execute|git|commit|fix|refactor|add|push|make|build|install/i.test(input);

            let assistantMessage: Message;

            if (needsPlan) {
                // Get execution plan
                const planResponse = await axios.post(`${API_URL}/api/assistant/plan`, {
                    prompt: input,
                    context
                });

                const plan = planResponse.data?.data?.plan || [];

                assistantMessage = {
                    id: `msg-${Date.now()}`,
                    role: 'assistant',
                    content: plan.length > 0
                        ? `I'll help you with that. Here's my plan:\n\n${plan.map((a: any, i: number) =>
                            `${i + 1}. **${a.tool}**: ${a.description || 'Execute action'}`
                        ).join('\n')}\n\nReview the actions below and approve each step, or click **Execute All** to run them all.`
                        : "I've analyzed your request but couldn't create a specific action plan. Could you provide more details?",
                    timestamp: new Date(),
                    actions: plan.map((a: any) => ({
                        ...a,
                        status: 'pending' as const,
                        timestamp: new Date()
                    }))
                };

                // Auto-expand actions
                if (plan.length > 0) {
                    setShowActions(`msg-${Date.now()}`);
                }
            } else {
                // Regular chat
                const chatResponse = await axios.post(`${API_URL}/api/assistant/chat`, {
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    context
                });

                assistantMessage = {
                    id: `msg-${Date.now()}`,
                    role: 'assistant',
                    content: chatResponse.data?.data?.message || 'No response received.',
                    timestamp: new Date()
                };
            }

            setMessages(prev => [...prev, assistantMessage]);

            // Auto-expand actions for the new message
            if (assistantMessage.actions && assistantMessage.actions.length > 0) {
                setShowActions(assistantMessage.id);
            }

        } catch (error: any) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: `❌ Error: ${error.response?.data?.error?.message || error.message || 'Failed to get response'}`,
                timestamp: new Date()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const executeAction = async (messageId: string, action: McpAction): Promise<boolean> => {
        // Update status to executing
        setMessages(prev => prev.map(msg => {
            if (msg.id !== messageId || !msg.actions) return msg;
            return {
                ...msg,
                actions: msg.actions.map(a =>
                    a.id === action.id ? { ...a, status: 'executing' as const } : a
                )
            };
        }));

        if (!onExecuteAction) return false;

        try {
            const result = await onExecuteAction(action);
            setMessages(prev => prev.map(msg => {
                if (msg.id !== messageId || !msg.actions) return msg;
                return {
                    ...msg,
                    actions: msg.actions.map(a =>
                        a.id === action.id ? { ...a, status: 'completed' as const, result } : a
                    )
                };
            }));

            // Refresh file tree after file operations
            if (['write_file', 'delete_file', 'create_folder'].includes(action.tool)) {
                onRefreshFileTree?.();
            }

            return true;
        } catch (error: any) {
            setMessages(prev => prev.map(msg => {
                if (msg.id !== messageId || !msg.actions) return msg;
                return {
                    ...msg,
                    actions: msg.actions.map(a =>
                        a.id === action.id ? { ...a, status: 'failed' as const, error: error.message } : a
                    )
                };
            }));
            return false;
        }
    };

    const handleActionApprove = async (messageId: string, actionId: string) => {
        const message = messages.find(m => m.id === messageId);
        const action = message?.actions?.find(a => a.id === actionId);
        if (action) {
            await executeAction(messageId, action);
        }
    };

    const handleActionReject = (messageId: string, actionId: string) => {
        setMessages(prev => prev.map(msg => {
            if (msg.id !== messageId || !msg.actions) return msg;
            return {
                ...msg,
                actions: msg.actions.map(a =>
                    a.id === actionId ? { ...a, status: 'rejected' as const } : a
                )
            };
        }));
    };

    const handleExecuteAll = async (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (!message?.actions) return;

        const pendingActions = message.actions.filter(a => a.status === 'pending');
        if (pendingActions.length === 0) return;

        setExecutingAll(true);

        for (const action of pendingActions) {
            const success = await executeAction(messageId, action);
            if (!success) {
                // Stop on first failure - could add retry logic here
                break;
            }
            // Small delay between actions for visibility
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        setExecutingAll(false);
    };

    const getPendingCount = (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        return message?.actions?.filter(a => a.status === 'pending').length || 0;
    };

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <div className="h-full flex flex-col bg-vscode-sidebar">
            {/* Header */}
            <div className="px-4 py-2 border-b border-vscode-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FaRobot className="text-blue-400" size={18} />
                    <span className="text-sm font-semibold">AI Assistant</span>
                </div>
                <button
                    onClick={clearChat}
                    className="p-1 hover:bg-vscode-active rounded text-gray-400 hover:text-white"
                    title="Clear chat"
                >
                    <VscTrash size={16} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div key={message.id} className="space-y-2">
                        {/* Message bubble */}
                        <div className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                                ${message.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                                {message.role === 'user'
                                    ? <VscAccount size={14} />
                                    : <FaRobot size={14} />}
                            </div>
                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm
                                ${message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-vscode-editor text-gray-200'}`}>
                                <div className="whitespace-pre-wrap">{message.content}</div>
                                <div className="text-xs opacity-50 mt-1">
                                    {message.timestamp.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        {message.actions && message.actions.length > 0 && (
                            <div className="ml-9 space-y-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowActions(showActions === message.id ? null : message.id)}
                                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        {showActions === message.id ? <VscChevronDown size={14} /> : <VscChevronRight size={14} />}
                                        {message.actions.length} action(s)
                                    </button>

                                    {/* Execute All button */}
                                    {getPendingCount(message.id) > 0 && (
                                        <button
                                            onClick={() => handleExecuteAll(message.id)}
                                            disabled={executingAll}
                                            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-white"
                                            title="Execute all pending actions"
                                        >
                                            {executingAll ? (
                                                <VscLoading className="animate-spin" size={12} />
                                            ) : (
                                                <VscRunAll size={12} />
                                            )}
                                            Execute All ({getPendingCount(message.id)})
                                        </button>
                                    )}

                                    {/* All done indicator */}
                                    {getPendingCount(message.id) === 0 && message.actions.every(a => a.status === 'completed') && (
                                        <span className="flex items-center gap-1 text-xs text-green-400">
                                            <VscCheck size={12} /> All done
                                        </span>
                                    )}
                                </div>

                                {showActions === message.id && (
                                    <div className="space-y-2">
                                        {message.actions.map((action) => (
                                            <McpActionCard
                                                key={action.id}
                                                action={action}
                                                onApprove={() => handleActionApprove(message.id, action.id)}
                                                onReject={() => handleActionReject(message.id, action.id)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center">
                            <FaRobot className="animate-spin" size={14} />
                        </div>
                        <div className="bg-vscode-editor rounded-lg px-3 py-2 text-sm text-gray-400">
                            Thinking...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Context indicator */}
            {(currentFile || selectedCode) && (
                <div className="px-4 py-1 bg-vscode-editor border-t border-vscode-border text-xs text-gray-500">
                    {currentFile && <span className="mr-3">📄 {currentFile.split('/').pop()}</span>}
                    {selectedCode && <span>✂️ {selectedCode.length} chars selected</span>}
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-vscode-border">
                <div className="flex gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything..."
                        className="flex-1 bg-vscode-editor border border-vscode-border rounded-lg px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none"
                        rows={2}
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg transition-colors"
                    >
                        {loading ? <VscLoading className="animate-spin" size={18} /> : <VscSend size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiChatPanel;
