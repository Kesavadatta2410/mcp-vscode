/**
 * Preview Panel Component
 * Live iframe preview with URL bar and controls
 */

import React, { useState, useRef, useEffect } from 'react';
import { VscRefresh, VscLinkExternal, VscChevronLeft, VscChevronRight } from 'react-icons/vsc';

interface PreviewPanelProps {
    initialUrl?: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ initialUrl = 'http://localhost:3000' }) => {
    const [url, setUrl] = useState(initialUrl);
    const [inputUrl, setInputUrl] = useState(initialUrl);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<string[]>([initialUrl]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleNavigate = (e?: React.FormEvent) => {
        e?.preventDefault();
        let newUrl = inputUrl.trim();

        // Add protocol if missing
        if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
            newUrl = 'http://' + newUrl;
        }

        setUrl(newUrl);
        setHistory(prev => [...prev.slice(0, historyIndex + 1), newUrl]);
        setHistoryIndex(prev => prev + 1);
    };

    const handleRefresh = () => {
        setLoading(true);
        if (iframeRef.current) {
            iframeRef.current.src = url;
        }
    };

    const handleBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setUrl(history[newIndex]);
            setInputUrl(history[newIndex]);
        }
    };

    const handleForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setUrl(history[newIndex]);
            setInputUrl(history[newIndex]);
        }
    };

    const handleOpenExternal = () => {
        window.open(url, '_blank');
    };

    const handleIframeLoad = () => {
        setLoading(false);
    };

    useEffect(() => {
        setInputUrl(url);
    }, [url]);

    return (
        <div className="h-full flex flex-col bg-vscode-sidebar">
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1 bg-vscode-editor border-b border-vscode-border">
                {/* Navigation buttons */}
                <button
                    onClick={handleBack}
                    disabled={historyIndex <= 0}
                    className="p-1 hover:bg-vscode-active rounded disabled:opacity-30"
                    title="Back"
                >
                    <VscChevronLeft size={18} />
                </button>
                <button
                    onClick={handleForward}
                    disabled={historyIndex >= history.length - 1}
                    className="p-1 hover:bg-vscode-active rounded disabled:opacity-30"
                    title="Forward"
                >
                    <VscChevronRight size={18} />
                </button>
                <button
                    onClick={handleRefresh}
                    className="p-1 hover:bg-vscode-active rounded"
                    title="Refresh"
                >
                    <VscRefresh size={16} className={loading ? 'animate-spin' : ''} />
                </button>

                {/* URL bar */}
                <form onSubmit={handleNavigate} className="flex-1 mx-2">
                    <input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        className="w-full bg-vscode-bg border border-vscode-border rounded px-3 py-1 text-sm font-mono"
                        placeholder="Enter URL..."
                    />
                </form>

                {/* Actions */}
                <button
                    onClick={handleOpenExternal}
                    className="p-1 hover:bg-vscode-active rounded"
                    title="Open in browser"
                >
                    <VscLinkExternal size={16} />
                </button>
            </div>

            {/* Preview iframe */}
            <div className="flex-1 relative bg-white">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-vscode-bg/80 z-10">
                        <div className="flex items-center gap-2 text-gray-400">
                            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            <span className="text-sm">Loading...</span>
                        </div>
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    src={url}
                    className="w-full h-full border-0"
                    title="Preview"
                    onLoad={handleIframeLoad}
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
            </div>

            {/* Status bar */}
            <div className="px-3 py-1 bg-vscode-editor border-t border-vscode-border text-xs text-gray-500 flex items-center justify-between">
                <span className="truncate">{url}</span>
                <span className={`flex items-center gap-1 ${loading ? 'text-yellow-500' : 'text-green-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                    {loading ? 'Loading' : 'Ready'}
                </span>
            </div>
        </div>
    );
};

export default PreviewPanel;
