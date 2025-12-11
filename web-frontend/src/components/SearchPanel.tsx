import React, { useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import mcpClient from '@/services/mcpClient';

interface SearchResult {
    file: string;
    line: number;
    content: string;
    match: string;
}

interface SearchPanelProps {
    onFileSelect: (file: string, line?: number) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onFileSelect }) => {
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searchType, setSearchType] = useState<'files' | 'content'>('content');

    const handleSearch = async () => {
        if (!query.trim()) return;

        setSearching(true);
        setResults([]);

        try {
            if (searchType === 'files') {
                // File name search
                const response = await mcpClient.listFiles('/');
                if (response.success && response.data) {
                    const matches = response.data.filter((file: string) =>
                        file.toLowerCase().includes(query.toLowerCase())
                    );
                    setResults(
                        matches.map((file: string) => ({
                            file,
                            line: 0,
                            content: file,
                            match: query,
                        }))
                    );
                }
            } else {
                // Content search (simplified - would need grep/search MCP tool)
                // For now, show message that this requires backend implementation
                alert('Content search requires backend grep implementation');
            }
        } catch (error) {
            console.error('Search failed:', error);
        }

        setSearching(false);
    };

    return (
        <div className="h-full flex flex-col bg-vscode-panel">
            {/* Header */}
            <div className="px-4 py-2 bg-vscode-sidebar border-b border-vscode-border">
                <div className="flex items-center gap-2">
                    <FaSearch />
                    <span className="text-sm font-semibold">Search</span>
                </div>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-vscode-border">
                <div className="flex gap-2 mb-2">
                    <button
                        onClick={() => setSearchType('files')}
                        className={`px-3 py-1 text-xs rounded ${searchType === 'files'
                                ? 'bg-blue-600'
                                : 'bg-vscode-editor hover:bg-vscode-active'
                            }`}
                    >
                        Files
                    </button>
                    <button
                        onClick={() => setSearchType('content')}
                        className={`px-3 py-1 text-xs rounded ${searchType === 'content'
                                ? 'bg-blue-600'
                                : 'bg-vscode-editor hover:bg-vscode-active'
                            }`}
                    >
                        Content
                    </button>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={`Search ${searchType}...`}
                        className="flex-1 bg-vscode-editor border border-vscode-border rounded px-3 py-2 text-sm"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searching || !query.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
                    >
                        {searching ? 'Searching...' : 'Search'}
                    </button>
                </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
                {results.length === 0 ? (
                    <div className="text-sm text-gray-400">
                        {searching ? 'Searching...' : 'No results'}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {results.map((result, idx) => (
                            <div
                                key={idx}
                                className="px-3 py-2 bg-vscode-editor hover:bg-vscode-active rounded cursor-pointer"
                                onClick={() => onFileSelect(result.file, result.line)}
                            >
                                <div className="text-sm font-mono">{result.file}</div>
                                {result.line > 0 && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        Line {result.line}: {result.content}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPanel;
