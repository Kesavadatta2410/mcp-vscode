/**
 * CommandRunner - A terminal-like command runner using run_command tool
 * Replaces TerminalPane when node-pty is not available
 */

import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaTrash, FaTerminal } from 'react-icons/fa';
import mcpClient from '@/services/mcpClient';

interface CommandOutput {
    command: string;
    args: string[];
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
    timestamp: Date;
}

const CommandRunner: React.FC = () => {
    const [commandInput, setCommandInput] = useState('');
    const [history, setHistory] = useState<CommandOutput[]>([]);
    const [running, setRunning] = useState(false);
    const [workingDir, setWorkingDir] = useState('');
    const outputRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when new output appears
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [history]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const parseCommand = (input: string): { command: string; args: string[] } => {
        const parts = input.trim().split(/\s+/);
        const command = parts[0] || '';
        const args = parts.slice(1);
        return { command, args };
    };

    const runCommand = async () => {
        if (!commandInput.trim() || running) return;

        const { command, args } = parseCommand(commandInput);
        setRunning(true);

        try {
            const response = await mcpClient.runCommand(
                command,
                args,
                30,
                workingDir || undefined
            );

            let output: CommandOutput;

            if (response.success && response.data) {
                const data = response.data;
                output = {
                    command,
                    args,
                    stdout: data.stdout || '',
                    stderr: data.stderr || '',
                    exitCode: data.exitCode ?? 0,
                    durationMs: data.durationMs || 0,
                    timestamp: new Date(),
                };
            } else {
                output = {
                    command,
                    args,
                    stdout: '',
                    stderr: response.error?.message || 'Command failed',
                    exitCode: -1,
                    durationMs: 0,
                    timestamp: new Date(),
                };
            }

            setHistory(prev => [...prev, output]);
            setCommandInput('');
        } catch (error: any) {
            setHistory(prev => [...prev, {
                command,
                args,
                stdout: '',
                stderr: error.message || 'Unknown error',
                exitCode: -1,
                durationMs: 0,
                timestamp: new Date(),
            }]);
        }

        setRunning(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            runCommand();
        }
    };

    const clearHistory = () => {
        setHistory([]);
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-300 font-mono text-sm">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 bg-vscode-sidebar border-b border-vscode-border">
                <FaTerminal className="text-green-500" />
                <span className="text-xs font-semibold">Command Runner</span>
                <div className="flex-1" />
                <input
                    type="text"
                    placeholder="Working directory (optional)"
                    value={workingDir}
                    onChange={(e) => setWorkingDir(e.target.value)}
                    className="px-2 py-1 text-xs bg-vscode-editor border border-vscode-border rounded w-64"
                />
                <button
                    onClick={clearHistory}
                    className="p-1.5 hover:bg-vscode-active rounded text-gray-400 hover:text-white"
                    title="Clear output"
                >
                    <FaTrash size={12} />
                </button>
            </div>

            {/* Output Area */}
            <div ref={outputRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {history.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                        <FaTerminal className="mx-auto mb-2 text-2xl" />
                        <p>Type a command and press Enter to run</p>
                        <p className="text-xs mt-2">Examples: python file.py, git status, npm install</p>
                    </div>
                ) : (
                    history.map((entry, i) => (
                        <div key={i} className="border-b border-gray-700 pb-3">
                            {/* Command line */}
                            <div className="flex items-center gap-2 text-green-400 mb-1">
                                <span className="text-blue-400">$</span>
                                <span>{entry.command} {entry.args.join(' ')}</span>
                                <span className="text-xs text-gray-500 ml-auto">
                                    [{entry.durationMs}ms] exit: {entry.exitCode}
                                </span>
                            </div>

                            {/* Stdout */}
                            {entry.stdout && (
                                <pre className="whitespace-pre-wrap text-gray-300 pl-4 text-xs leading-relaxed">
                                    {entry.stdout}
                                </pre>
                            )}

                            {/* Stderr */}
                            {entry.stderr && (
                                <pre className="whitespace-pre-wrap text-red-400 pl-4 text-xs leading-relaxed">
                                    {entry.stderr}
                                </pre>
                            )}
                        </div>
                    ))
                )}

                {running && (
                    <div className="flex items-center gap-2 text-yellow-400">
                        <div className="animate-spin w-3 h-3 border border-yellow-400 border-t-transparent rounded-full" />
                        Running...
                    </div>
                )}
            </div>

            {/* Command Input */}
            <div className="flex items-center gap-2 px-3 py-2 bg-vscode-sidebar border-t border-vscode-border">
                <span className="text-blue-400">$</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter command (e.g., python one.py, git status)"
                    className="flex-1 bg-transparent border-none outline-none text-gray-300"
                    disabled={running}
                />
                <button
                    onClick={runCommand}
                    disabled={running || !commandInput.trim()}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm text-white"
                >
                    <FaPlay size={10} />
                    Run
                </button>
            </div>
        </div>
    );
};

export default CommandRunner;
