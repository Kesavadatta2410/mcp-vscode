import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import terminalClient from '@/services/terminalClient';
import { FaTimes, FaPlus } from 'react-icons/fa';

interface TerminalInstance {
    id: string;
    name: string;
    terminal: Terminal;
    fitAddon: FitAddon;
}

const TerminalPane: React.FC = () => {
    const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
    const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const createTerminal = async () => {
        try {
            const { id, name } = await terminalClient.createTerminal(
                `Terminal ${terminals.length + 1}`,
                80,
                24
            );

            const terminal = new Terminal({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: '"Cascadia Code", "Courier New", monospace',
                theme: {
                    background: '#1e1e1e',
                    foreground: '#cccccc',
                    cursor: '#ffffff',
                    black: '#000000',
                    red: '#cd3131',
                    green: '#0dbc79',
                    yellow: '#e5e510',
                    blue: '#2472c8',
                    magenta: '#bc3fbc',
                    cyan: '#11a8cd',
                    white: '#e5e5e5',
                    brightBlack: '#666666',
                    brightRed: '#f14c4c',
                    brightGreen: '#23d18b',
                    brightYellow: '#f5f543',
                    brightBlue: '#3b8eea',
                    brightMagenta: '#d670d6',
                    brightCyan: '#29b8db',
                    brightWhite: '#e5e5e5',
                },
            });

            const fitAddon = new FitAddon();
            const webLinksAddon = new WebLinksAddon();

            terminal.loadAddon(fitAddon);
            terminal.loadAddon(webLinksAddon);

            const newTerminals = [...terminals, { id, name, terminal, fitAddon }];
            setTerminals(newTerminals);
            setActiveTerminalId(id);

            // Connect after state update (in useEffect)
        } catch (error: any) {
            console.error('Failed to create terminal:', error);
            alert(`Failed to create terminal: ${error.message}`);
        }
    };

    const closeTerminal = async (terminalId: string) => {
        const terminal = terminals.find(t => t.id === terminalId);
        if (terminal) {
            terminal.terminal.dispose();
            await terminalClient.deleteTerminal(terminalId);

            const newTerminals = terminals.filter(t => t.id !== terminalId);
            setTerminals(newTerminals);

            if (activeTerminalId === terminalId) {
                setActiveTerminalId(newTerminals.length > 0 ? newTerminals[0].id : null);
            }
        }
    };

    // Setup terminal when active terminal changes
    useEffect(() => {
        if (!activeTerminalId || !containerRef.current) return;

        const terminalInstance = terminals.find(t => t.id === activeTerminalId);
        if (!terminalInstance) return;

        const { terminal, fitAddon } = terminalInstance;

        // Clear container
        containerRef.current.innerHTML = '';

        // Mount terminal
        terminal.open(containerRef.current);

        // Fit to container
        setTimeout(() => {
            fitAddon.fit();
        }, 0);

        // Connect WebSocket
        terminalClient.connect(
            activeTerminalId,
            (data: string) => {
                terminal.write(data);
            },
            () => {
                console.log('Terminal disconnected');
            }
        );

        // Handle terminal input
        const disposable = terminal.onData((data: string) => {
            terminalClient.send(activeTerminalId, data);
        });

        // Handle resize
        const resizeHandler = () => {
            fitAddon.fit();
            const { cols, rows } = terminal;
            terminalClient.resize(activeTerminalId, cols, rows);
        };

        window.addEventListener('resize', resizeHandler);

        return () => {
            disposable.dispose();
            window.removeEventListener('resize', resizeHandler);
            terminalClient.disconnect(activeTerminalId);
        };
    }, [activeTerminalId, terminals]);

    return (
        <div className="h-full flex flex-col bg-vscode-panel">
            {/* Tab Bar */}
            <div className="flex items-center gap-1 bg-vscode-sidebar border-b border-vscode-border px-2 py-1">
                {terminals.map(term => (
                    <div
                        key={term.id}
                        className={`flex items-center gap-2 px-3 py-1 cursor-pointer rounded-t ${activeTerminalId === term.id
                                ? 'bg-vscode-panel text-vscode-text'
                                : 'bg-vscode-sidebar text-gray-400 hover:text-vscode-text'
                            }`}
                        onClick={() => setActiveTerminalId(term.id)}
                    >
                        <span className="text-sm">{term.name}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                closeTerminal(term.id);
                            }}
                            className="hover:bg-vscode-active p-0.5 rounded"
                        >
                            <FaTimes size={10} />
                        </button>
                    </div>
                ))}

                <button
                    onClick={createTerminal}
                    className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-vscode-active rounded"
                    title="New Terminal"
                >
                    <FaPlus size={10} />
                </button>
            </div>

            {/* Terminal Container */}
            <div className="flex-1 overflow-hidden p-2">
                {terminals.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <p className="mb-2">No terminals open</p>
                            <button
                                onClick={createTerminal}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                            >
                                Create Terminal
                            </button>
                        </div>
                    </div>
                ) : (
                    <div ref={containerRef} className="h-full" />
                )}
            </div>
        </div>
    );
};

export default TerminalPane;
