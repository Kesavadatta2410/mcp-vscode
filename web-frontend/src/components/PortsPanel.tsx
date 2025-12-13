/**
 * Ports Panel Component
 * Display forwarded ports with clickable URLs
 */

import React, { useState, useEffect } from 'react';
import { VscGlobe, VscRefresh, VscAdd, VscTrash, VscCopy } from 'react-icons/vsc';

interface Port {
    port: number;
    label: string;
    url: string;
    protocol: 'http' | 'https';
    status: 'active' | 'inactive';
}

const PortsPanel: React.FC = () => {
    const [ports, setPorts] = useState<Port[]>([]);
    const [loading, setLoading] = useState(false);
    const [newPort, setNewPort] = useState('');

    // Simulated ports - will be replaced with MCP calls when port forwarding is implemented
    useEffect(() => {
        setPorts([
            { port: 3000, label: 'Frontend Dev Server', url: 'http://localhost:3000', protocol: 'http', status: 'active' },
            { port: 4000, label: 'API Gateway', url: 'http://localhost:4000', protocol: 'http', status: 'active' },
        ]);
    }, []);

    const handleRefresh = async () => {
        setLoading(true);
        // In future: call MCP port forwarding list tool
        await new Promise(resolve => setTimeout(resolve, 500));
        setLoading(false);
    };

    const handleOpenInBrowser = (url: string) => {
        window.open(url, '_blank');
    };

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
    };

    const handleAddPort = () => {
        const portNum = parseInt(newPort);
        if (portNum && portNum > 0 && portNum < 65536) {
            setPorts(prev => [
                ...prev,
                {
                    port: portNum,
                    label: `Port ${portNum}`,
                    url: `http://localhost:${portNum}`,
                    protocol: 'http',
                    status: 'inactive'
                }
            ]);
            setNewPort('');
        }
    };

    const handleRemovePort = (port: number) => {
        setPorts(prev => prev.filter(p => p.port !== port));
    };

    return (
        <div className="h-full flex flex-col bg-vscode-sidebar">
            {/* Header */}
            <div className="px-4 py-2 border-b border-vscode-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <VscGlobe className="text-blue-400" />
                    <span className="text-sm font-semibold">Ports</span>
                </div>
                <button
                    onClick={handleRefresh}
                    className="p-1 hover:bg-vscode-active rounded"
                    disabled={loading}
                >
                    <VscRefresh className={loading ? 'animate-spin' : ''} size={16} />
                </button>
            </div>

            {/* Add port input */}
            <div className="px-4 py-2 border-b border-vscode-border flex gap-2">
                <input
                    type="number"
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    placeholder="Port number..."
                    className="flex-1 bg-vscode-editor border border-vscode-border rounded px-2 py-1 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPort()}
                />
                <button
                    onClick={handleAddPort}
                    className="p-1 hover:bg-vscode-active rounded text-green-400"
                    title="Add port"
                >
                    <VscAdd size={16} />
                </button>
            </div>

            {/* Port list */}
            <div className="flex-1 overflow-y-auto">
                {ports.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">
                        No forwarded ports
                    </div>
                ) : (
                    <div className="divide-y divide-vscode-border">
                        {ports.map((port) => (
                            <div
                                key={port.port}
                                className="px-4 py-2 hover:bg-vscode-active group transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`w-2 h-2 rounded-full ${port.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                                                }`}
                                        />
                                        <span className="text-sm font-mono">{port.port}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleCopyUrl(port.url)}
                                            className="p-1 hover:bg-vscode-sidebar rounded"
                                            title="Copy URL"
                                        >
                                            <VscCopy size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleRemovePort(port.port)}
                                            className="p-1 hover:bg-vscode-sidebar rounded text-red-400"
                                            title="Remove"
                                        >
                                            <VscTrash size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-1 text-xs text-gray-400">{port.label}</div>
                                <button
                                    onClick={() => handleOpenInBrowser(port.url)}
                                    className="mt-1 text-xs text-blue-400 hover:underline truncate block w-full text-left"
                                >
                                    {port.url}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer info */}
            <div className="px-4 py-2 border-t border-vscode-border text-xs text-gray-500">
                {ports.filter(p => p.status === 'active').length} active port(s)
            </div>
        </div>
    );
};

export default PortsPanel;
